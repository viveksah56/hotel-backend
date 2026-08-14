import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AuthProvider } from '../../generated/prisma/client.js';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.connect.js';
import { ApiError } from '../utils/api.error.js';
import { stripUndefined } from '../utils/strip-undefined.js';
import { envConfig } from '../config/env.config.js';
import {
    REMEMBER_ME_REFRESH_EXPIRATION,
    signAccessToken,
    signEmailVerificationToken,
    signRefreshToken,
    verifyEmailVerificationToken,
    verifyRefreshToken,
} from '../utils/jwt.util.js';
import emailService from './mail.service.js';
import getVerificationEmailTemplate from '../templates/verification-email.js';
import type { RegisterInput, LoginInput, GoogleLoginInput } from '../validations/auth.validation.js';

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

interface SessionMeta {
    device?: string | undefined;
    ipAddress?: string | undefined;
}

interface PublicUser {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar: string | null;
    isVerified: boolean;
}

interface RegisterResult {
    message: string;
    emailSent: boolean;
}

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const googleClient = new OAuth2Client(envConfig.GOOGLE.CLIENT_ID);

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

class AuthService {
    async register(input: RegisterInput): Promise<RegisterResult> {
        const existing = await prisma.user.findUnique({ where: { email: input.email } });
        if (existing) {
            throw new ApiError('Email is already registered', 409);
        }

        const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                name: input.name,
                email: input.email,
                password: hashedPassword,
                phone: input.phone ?? null,
                isVerified: false,
                provider: AuthProvider.LOCAL,
                providerId: null,
            },
        });

        const verificationToken = signEmailVerificationToken(user.id);
        const verificationLink = `${envConfig.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
        const html = getVerificationEmailTemplate({ name: user.name, verificationLink });

        try {
            await emailService.sendEmail(user.email, 'Verify your email', html);
        } catch (error) {
            console.error('failed to send verification email to', user.email, error);
            return {
                message: `Registration successful, but the verification email could not be sent. Please request a new one.`,
                emailSent: false,
            };
        }

        return {
            message: `Registration successful. A verification email has been sent to ${user.email}.`,
            emailSent: true,
        };
    }

    async resendVerificationEmail(email: string): Promise<RegisterResult> {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new ApiError('No account found with this email', 404);
        }
        if (user.isVerified) {
            return { message: 'Email is already verified', emailSent: false };
        }

        const verificationToken = signEmailVerificationToken(user.id);
        const verificationLink = `${envConfig.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
        const html = getVerificationEmailTemplate({ name: user.name, verificationLink });

        try {
            await emailService.sendEmail(user.email, 'Verify your email', html);
            return {
                message: `A new verification email has been sent to ${user.email}.`,
                emailSent: true,
            };
        } catch (error) {
            console.error('failed to resend verification email to', user.email, error);
            throw new ApiError('Failed to send verification email. Please try again later.', 502);
        }
    }

    async verifyEmail(token: string): Promise<{ message: string }> {
        let payload: ReturnType<typeof verifyEmailVerificationToken>;
        try {
            payload = verifyEmailVerificationToken(token);
        } catch {
            throw new ApiError('Invalid or expired verification link', 400);
        }

        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
            throw new ApiError('User not found', 404);
        }
        if (user.isVerified) {
            return { message: 'Email already verified' };
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });

        return { message: 'Email verified successfully' };
    }

    private async issueTokens(
        userId: string,
        role: string,
        remember: boolean,
        meta: SessionMeta = {},
    ): Promise<AuthTokens> {
        const accessToken = signAccessToken({ sub: userId, role });
        const refreshExpiry = remember ? REMEMBER_ME_REFRESH_EXPIRATION : envConfig.JWT.REFRESH_EXPIRATION;
        const refreshToken = signRefreshToken({ sub: userId }, refreshExpiry);

        await prisma.refreshToken.create({
            data: {
                token: hashToken(refreshToken),
                userId,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
                ...stripUndefined({ device: meta.device, ipAddress: meta.ipAddress }),
            },
        });

        return { accessToken, refreshToken };
    }

    async login(input: LoginInput, meta: SessionMeta = {}): Promise<AuthTokens> {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) {
            throw new ApiError('Invalid email or password', 401);
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new ApiError('Account temporarily locked due to too many failed attempts', 423);
        }

        if (!user.password) {
            throw new ApiError('This account uses social login, please sign in with that provider', 400);
        }

        const isPasswordValid = await bcrypt.compare(input.password, user.password);
        if (!isPasswordValid) {
            const attempts = user.loginAttempts + 1;
            const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: shouldLock ? 0 : attempts,
                    lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
                },
            });

            throw new ApiError('Invalid email or password', 401);
        }

        if (!user.isVerified) {
            throw new ApiError('Please verify your email before logging in', 403);
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
        });

        return this.issueTokens(user.id, user.role, input.rememberMe, meta);
    }

    async refresh(token: string, meta: SessionMeta = {}): Promise<AuthTokens> {
        let payload: ReturnType<typeof verifyRefreshToken>;
        try {
            payload = verifyRefreshToken(token);
        } catch {
            throw new ApiError('Invalid or expired refresh token', 401);
        }

        const hashed = hashToken(token);
        const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });

        if (!stored || stored.userId !== payload.sub) {
            throw new ApiError('Invalid session, please log in again', 401);
        }

        if (stored.expiresAt < new Date()) {
            await prisma.refreshToken.delete({ where: { id: stored.id } });
            throw new ApiError('Session expired, please log in again', 401);
        }

        const user = await prisma.user.findUnique({ where: { id: stored.userId } });
        if (!user) {
            throw new ApiError('Invalid session, please log in again', 401);
        }

        await prisma.refreshToken.delete({ where: { id: stored.id } });

        return this.issueTokens(user.id, user.role, false, meta);
    }

    async logout(token: string): Promise<void> {
        await prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } });
    }

    async logoutAllDevices(userId: string): Promise<void> {
        await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    async loginWithGoogle(input: GoogleLoginInput, meta: SessionMeta = {}): Promise<AuthTokens> {
        const ticket = await googleClient.verifyIdToken({
            idToken: input.idToken,
            audience: envConfig.GOOGLE.CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub) {
            throw new ApiError('Invalid Google token', 401);
        }

        let user = await prisma.user.findFirst({
            where: { provider: AuthProvider.GOOGLE, providerId: payload.sub },
        });

        if (!user) {
            const existingLocal = await prisma.user.findUnique({ where: { email: payload.email } });

            if (existingLocal) {
                user = await prisma.user.update({
                    where: { id: existingLocal.id },
                    data: {
                        provider: AuthProvider.GOOGLE,
                        providerId: payload.sub,
                        isVerified: true,
                        avatar: existingLocal.avatar ?? payload.picture ?? null,
                    },
                });
            } else {
                user = await prisma.user.create({
                    data: {
                        name: payload.name ?? payload.email,
                        email: payload.email,
                        password: null,
                        provider: AuthProvider.GOOGLE,
                        providerId: payload.sub,
                        avatar: payload.picture ?? null,
                        isVerified: true,
                    },
                });
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        return this.issueTokens(user.id, user.role, false, meta);
    }

    async loggedInUser(userId: string): Promise<{ user: PublicUser }> {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                isVerified: user.isVerified,
            },
        };
    }
}

const authService = new AuthService();
export default authService;
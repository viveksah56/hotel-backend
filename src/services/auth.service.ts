import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/db.connect.js';
import { ApiError } from '../utils/api.error.js';
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

interface PublicUser {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar: string | null;
    isVerified: boolean;
}

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;

const googleClient = new OAuth2Client(envConfig.GOOGLE.CLIENT_ID);

class AuthService {
    async register(input: RegisterInput): Promise<{ message: string }> {
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
            },
        });

        const verificationToken = signEmailVerificationToken(user.id);
        const verificationLink = `${envConfig.CORS_ORIGIN}/verify-email?token=${verificationToken}`;
        const html = getVerificationEmailTemplate({ name: user.name, verificationLink });

        await emailService.sendEmail(user.email, 'Verify your email', html);

        return { message: 'Registration successful. Please check your email to verify your account.' };
    }

    async verifyEmail(token: string): Promise<{ message: string }> {
        let payload;
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

    async login(input: LoginInput): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
        throw new ApiError('Invalid email or password', 401);
    }

    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        throw new ApiError('Account temporarily locked due to too many failed attempts', 423);
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
        await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: { increment: 1 } },
        });
        throw new ApiError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
        throw new ApiError('Please verify your email before logging in', 403);
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken(
        { sub: user.id },
        input.rememberMe ? REMEMBER_ME_REFRESH_EXPIRATION : envConfig.JWT.REFRESH_EXPIRATION
    );
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            refreshToken: hashedRefreshToken,
            loginAttempts: 0,
            lastLogin: new Date(),
        },
    });

    return { accessToken, refreshToken };
}

    async refresh(token: string): Promise<AuthTokens> {
        let payload;
        try {
            payload = verifyRefreshToken(token);
        } catch {
            throw new ApiError('Invalid or expired refresh token', 401);
        }

        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.refreshToken) {
            throw new ApiError('Invalid session, please log in again', 401);
        }

        const isTokenValid = await bcrypt.compare(token, user.refreshToken);
        if (!isTokenValid) {
            throw new ApiError('Invalid session, please log in again', 401);
        }

        const accessToken = signAccessToken({ sub: user.id, role: user.role });
        const newRefreshToken = signRefreshToken({ sub: user.id });
        const hashedRefreshToken = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: hashedRefreshToken },
        });

        return { accessToken, refreshToken: newRefreshToken };
    }

    async logout(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
    }

    async loginWithGoogle(input: GoogleLoginInput): Promise<AuthTokens> {
        const ticket = await googleClient.verifyIdToken({
            idToken: input.idToken,
            audience: envConfig.GOOGLE.CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new ApiError('Invalid Google token', 401);
        }

        let user = await prisma.user.findUnique({ where: { email: payload.email } });

        if (!user) {
            const randomPassword = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS);
            user = await prisma.user.create({
                data: {
                    name: payload.name ?? payload.email,
                    email: payload.email,
                    password: randomPassword,
                    avatar: payload.picture ?? null,
                    isVerified: true,
                },
            });
        }

        const accessToken = signAccessToken({ sub: user.id, role: user.role });
        const refreshToken = signRefreshToken({ sub: user.id });
        const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                refreshToken: hashedRefreshToken,
                lastLogin: new Date(),
            },
        });

        return { accessToken, refreshToken };
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
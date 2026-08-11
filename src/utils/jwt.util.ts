import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { envConfig } from '../config/env.config.js';

export interface AccessTokenPayload {
    sub: string;
    role: string;
}

export interface RefreshTokenPayload {
    sub: string;
}

export interface EmailVerificationPayload {
    sub: string;
    purpose: 'email-verification';
}

export const REMEMBER_ME_REFRESH_EXPIRATION = '30d';

export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, envConfig.JWT.ACCESS_SECRET, {
        expiresIn: envConfig.JWT.ACCESS_EXPIRATION,
    } as SignOptions);
}

export function signRefreshToken(
    payload: RefreshTokenPayload,
    expiresIn: string = envConfig.JWT.REFRESH_EXPIRATION
): string {
    return jwt.sign(payload, envConfig.JWT.REFRESH_SECRET, { expiresIn } as SignOptions);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, envConfig.JWT.REFRESH_SECRET) as RefreshTokenPayload;
}

export function signEmailVerificationToken(userId: string): string {
    const payload: EmailVerificationPayload = { sub: userId, purpose: 'email-verification' };
    return jwt.sign(payload, envConfig.JWT.ACCESS_SECRET, { expiresIn: '1d' });
}

export function verifyEmailVerificationToken(token: string): EmailVerificationPayload {
    const payload = jwt.verify(token, envConfig.JWT.ACCESS_SECRET) as EmailVerificationPayload;
    if (payload.purpose !== 'email-verification') {
        throw new Error('Invalid token purpose');
    }
    return payload;
}
export function verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, envConfig.JWT.ACCESS_SECRET) as AccessTokenPayload;
}
import type { Response, CookieOptions } from 'express';
import { envConfig } from '../config/env.config.js';

const isProduction = envConfig.NODE_ENV === 'production';

const BASE_COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
};

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const DEFAULT_REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_ME_REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const setAuthCookies = (
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean = false
): void => {
    res.cookie('accessToken', accessToken, {
        ...BASE_COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie('refreshToken', refreshToken, {
        ...BASE_COOKIE_OPTIONS,
        maxAge: rememberMe ? REMEMBER_ME_REFRESH_MAX_AGE : DEFAULT_REFRESH_MAX_AGE,
    });
};

export const clearAuthCookies = (res: Response): void => {
    res.clearCookie('accessToken', BASE_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', BASE_COOKIE_OPTIONS);
};
import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { ApiError } from '../utils/api.error.js';
import authService from '../services/auth.service.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookie.util.js';
import type {
    RegisterInput,
    LoginInput,
    VerifyEmailQueryInput,
    RefreshTokenInput,
    GoogleLoginInput,
} from '../validations/auth.validation.js';

function getSessionMeta(req: Request) {
    return {
        device: req.headers['user-agent'],
        ipAddress: req.ip,
    };
}

class AuthController {
    register = catchAsync(async (req: Request, res: Response) => {
        const body = req.body as RegisterInput;
        const result = await authService.register(body);
        res.status(201).json({ success: true, ...result });
    });

    verifyEmail = catchAsync(async (req: Request, res: Response) => {
        const query = req.query as unknown as VerifyEmailQueryInput;
        const result = await authService.verifyEmail(query.token);
        res.status(200).json({ success: true, ...result });
    });

    login = catchAsync(async (req: Request, res: Response) => {
        const body = req.body as LoginInput;
        const tokens = await authService.login(body, getSessionMeta(req));
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken, body.rememberMe);
        res.status(200).json({ success: true, message: 'Logged in successfully' });
    });

    refresh = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as RefreshTokenInput;
        const token = req.cookies?.refreshToken ?? body.refreshToken;

        if (!token) {
            next(new ApiError('Refresh token is required', 400));
            return;
        }

        const tokens = await authService.refresh(token, getSessionMeta(req));
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json({ success: true, message: 'Session refreshed successfully' });
    });

    logout = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const body = req.body as Partial<RefreshTokenInput>;
        const token = req.cookies?.refreshToken ?? body.refreshToken;

        if (!token) {
            next(new ApiError('Refresh token is required', 400));
            return;
        }

        await authService.logout(token);
        clearAuthCookies(res);
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    });

    logoutAllDevices = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }
        await authService.logoutAllDevices(req.user.id);
        clearAuthCookies(res);
        res.status(200).json({ success: true, message: 'Logged out from all devices' });
    });

    loginWithGoogle = catchAsync(async (req: Request, res: Response) => {
        const body = req.body as GoogleLoginInput;
        const tokens = await authService.loginWithGoogle(body, getSessionMeta(req));
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json({ success: true, message: 'Logged in successfully' });
    });

    loggedInUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }
        const result = await authService.loggedInUser(req.user.id);
        res.status(200).json({ success: true, ...result });
    });
}

const authController = new AuthController();

export default authController;
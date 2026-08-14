import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api.error.js';
import { verifyAccessToken } from '../utils/jwt.util.js';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string };
        }
    }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith('Bearer ') ? header.split(' ')[1] : undefined;
    const token = bearerToken ?? req.cookies?.accessToken;

    if (!token) {
        next(new ApiError('Missing or invalid access token', 401));
        return;
    }

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, role: payload.role };
        next();
    } catch {
        next(new ApiError('Invalid or expired access token', 401));
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new ApiError('You do not have permission to perform this action', 403));
            return;
        }
        next();
    };
};

export const authorizeSelfOrRole = (paramKey: string, ...roles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }
        const targetId = req.params[paramKey];
        if (req.user.id === targetId || roles.includes(req.user.role)) {
            next();
            return;
        }
        next(new ApiError('You do not have permission to perform this action', 403));
    };
};
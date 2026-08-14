import type { ZodType } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/api.error.js';

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string {
    return issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
}

export const validateBody = <T>(schema: ZodType<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            next(new BadRequestError(formatIssues(result.error.issues)));
            return;
        }

        req.body = result.data;
        next();
    };
};

export const validateQuery = <T>(schema: ZodType<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            next(new BadRequestError(formatIssues(result.error.issues)));
            return;
        }

        req.validatedQuery = result.data as Request['validatedQuery'];
        next();
    };
};

export const validateParams = <T>(schema: ZodType<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            next(new BadRequestError(formatIssues(result.error.issues)));
            return;
        }

        req.params = result.data as typeof req.params;
        next();
    };
};
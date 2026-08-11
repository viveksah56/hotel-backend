import type { ZodType } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import {BadRequestError} from "../utils/api.error.js";


export const validateBody = <T>(schema: ZodType<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const message = result.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join(', ');
            next(new BadRequestError(message));
            return;
        }

        req.body = result.data;
        next();
    };
};
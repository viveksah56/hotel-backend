import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../utils/api.error.js';
import { updateUserSchema, adminUpdateUserSchema } from '../validations/user.validation.js';

export const validateUpdateUserBody = (req: Request, _res: Response, next: NextFunction): void => {
    const schema = req.user?.role === 'ADMIN' ? adminUpdateUserSchema : updateUserSchema;
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
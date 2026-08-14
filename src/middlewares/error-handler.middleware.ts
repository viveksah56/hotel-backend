import type {ErrorRequestHandler, RequestHandler} from 'express';
import {ZodError} from 'zod';
import {ApiError} from '../utils/api.error.js';
import {envConfig} from '../config/env.config.js';
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/client";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next): void => {
    let statusCode = 500;
    let message = 'Internal Server Error';

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: err.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
            })),
        });
        return;
    } else if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            statusCode = 409;
            const target = err.meta?.target as string[] | undefined;
            message = `Duplicate value for field: ${target?.join(', ') ?? 'unknown'}`;
        } else if (err.code === 'P2025') {
            statusCode = 404;
            message = 'Record not found';
        } else {
            statusCode = 400;
            message = 'Database request error';
        }
    } else if (err instanceof Error) {
        message = envConfig.NODE_ENV === 'development' ? err.message : message;
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(envConfig.NODE_ENV === 'development' && err instanceof Error ? {stack: err.stack} : {}),
    });
};

export const notFoundHandler: RequestHandler = (req, res): void => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
};
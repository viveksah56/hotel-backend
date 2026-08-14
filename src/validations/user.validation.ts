import { z } from 'zod';

export const updateUserSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
        .optional(),
});

export const adminUpdateUserSchema = z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
        .optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    isVerified: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
    id: z.string().uuid('Invalid user id'),
});

export const userListQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type UserIdParamInput = z.infer<typeof userIdParamSchema>;
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
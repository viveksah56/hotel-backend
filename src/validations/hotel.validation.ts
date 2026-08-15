import { z } from 'zod';

const HOTEL_TYPES = ['BOUTIQUE', 'RESORT', 'HOSTEL', 'MOTEL', 'LUXURY'] as const;
const HOTEL_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

const stringArraySchema = z.preprocess((value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed: unknown = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
        } catch {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }

    return value;
}, z.array(z.string().trim().min(1)).max(30).optional());

const hotelProfileFields = {
    name: z.string().trim().min(3, 'Name must be at least 3 characters').max(150),
    description: z.string().trim().max(2000).optional(),
    type: z.enum(HOTEL_TYPES).optional(),
    address: z.string().trim().min(5, 'Address must be at least 5 characters').max(255),
    city: z.string().trim().min(2, 'City must be at least 2 characters').max(100),
    district: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number')
        .optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
    amenities: stringArraySchema,
};

export const createHotelSchema = z.object(hotelProfileFields);

export const updateHotelSchema = z.object(hotelProfileFields).partial().extend({
    removeImages: stringArraySchema,
});

export const adminUpdateHotelSchema = updateHotelSchema.extend({
    ownerId: z.string().uuid('Invalid owner id').optional(),
    status: z.enum(HOTEL_STATUSES).optional(),
    starRating: z.coerce.number().min(0).max(5).optional(),
});

export const hotelIdParamSchema = z.object({
    id: z.string().uuid('Invalid hotel id'),
});

export const hotelListQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    city: z.string().trim().optional(),
    type: z.enum(HOTEL_TYPES).optional(),
    status: z.enum(HOTEL_STATUSES).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    search: z.string().trim().max(150).optional(),
});

export type CreateHotelInput = z.infer<typeof createHotelSchema>;
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>;
export type AdminUpdateHotelInput = z.infer<typeof adminUpdateHotelSchema>;
export type HotelIdParamInput = z.infer<typeof hotelIdParamSchema>;
export type HotelListQueryInput = z.infer<typeof hotelListQuerySchema>;
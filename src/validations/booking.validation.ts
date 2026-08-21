import { z } from 'zod';

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const;
const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED', 'FAILED'] as const;
const PAYMENT_METHODS = ['CASH', 'CARD', 'ESEWA', 'KHALTI', 'STRIPE'] as const;

export const createBookingSchema = z
    .object({
        roomId: z.string().uuid('Invalid room id'),
        checkInDate: z.coerce.date(),
        checkOutDate: z.coerce.date(),
        guestCount: z.coerce.number().int().positive().max(20).optional(),
        specialRequest: z.string().trim().max(1000).optional(),
    })
    .refine((data) => data.checkOutDate > data.checkInDate, {
        message: 'checkOutDate must be after checkInDate',
        path: ['checkOutDate'],
    });

export const bookingIdParamSchema = z.object({
    id: z.string().uuid('Invalid booking id'),
});

export const hotelIdParamSchema = z.object({
    hotelId: z.string().uuid('Invalid hotel id'),
});

export const updateBookingStatusSchema = z
    .object({
        status: z.enum(BOOKING_STATUSES),
        cancelReason: z.string().trim().max(500).optional(),
    })
    .refine((data) => data.status !== 'CANCELLED' || Boolean(data.cancelReason), {
        message: 'cancelReason is required when cancelling a booking',
        path: ['cancelReason'],
    });

export const cancelBookingSchema = z.object({
    cancelReason: z.string().trim().min(3, 'Please provide a reason for cancellation').max(500).optional(),
});

export const updatePaymentSchema = z.object({
    paymentStatus: z.enum(PAYMENT_STATUSES),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    transactionId: z.string().trim().max(255).optional(),
});

export const availabilityQuerySchema = z
    .object({
        roomId: z.string().uuid('Invalid room id'),
        checkInDate: z.coerce.date(),
        checkOutDate: z.coerce.date(),
    })
    .refine((data) => data.checkOutDate > data.checkInDate, {
        message: 'checkOutDate must be after checkInDate',
        path: ['checkOutDate'],
    });

export const bookingListQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    status: z.enum(BOOKING_STATUSES).optional(),
    roomId: z.string().uuid('Invalid room id').optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingIdParamInput = z.infer<typeof bookingIdParamSchema>;
export type HotelIdParamInput = z.infer<typeof hotelIdParamSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
export type BookingListQueryInput = z.infer<typeof bookingListQuerySchema>;
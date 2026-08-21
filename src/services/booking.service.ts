import { prisma } from '../config/db.connect.js';
import { ApiError } from '../utils/api.error.js';
import { paginateQuery } from '../helper/pagination.js';
import type { PaginationParams, PaginatedResult } from '../helper/pagination.js';
import { stripUndefined } from '../utils/strip-undefined.js';
import type {
    Booking,
    BookingStatus,
    PaymentStatus,
    PaymentMethod,
    Prisma,
} from '../../generated/prisma/client.js';

interface Requester {
    id: string;
    role: string;
}

interface CreateBookingData {
    roomId: string;
    checkInDate: Date;
    checkOutDate: Date;
    guestCount?: number | undefined;
    specialRequest?: string | undefined;
}

interface UpdateStatusData {
    status: BookingStatus;
    cancelReason?: string | undefined;
}

interface UpdatePaymentData {
    paymentStatus: PaymentStatus;
    paymentMethod?: PaymentMethod | undefined;
    transactionId?: string | undefined;
}

interface BookingListFilters extends PaginationParams {
    status?: BookingStatus | undefined;
    roomId?: string | undefined;
    from?: Date | undefined;
    to?: Date | undefined;
}

const BOOKING_SORT_FIELDS = ['createdAt', 'checkInDate', 'checkOutDate', 'totalAmount'] as const;

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
    CHECKED_IN: ['CHECKED_OUT'],
    CHECKED_OUT: [],
    CANCELLED: [],
};

function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
    const msPerNight = 1000 * 60 * 60 * 24;
    return Math.round((checkOut.getTime() - checkIn.getTime()) / msPerNight);
}

function assertAdmin(requester: Requester): void {
    if (requester.role !== 'ADMIN') {
        throw new ApiError('You do not have permission to perform this action', 403);
    }
}

function assertHotelOwnerOrAdmin(hotelOwnerId: string, requester: Requester): void {
    if (hotelOwnerId !== requester.id && requester.role !== 'ADMIN') {
        throw new ApiError('You do not have permission to perform this action', 403);
    }
}

class BookingService {
    async isRoomAvailable(
        roomId: string,
        checkInDate: Date,
        checkOutDate: Date,
        excludeBookingId?: string,
    ): Promise<boolean> {
        const conflict = await prisma.booking.findFirst({
            where: {
                roomId,
                status: { not: 'CANCELLED' },
                checkInDate: { lt: checkOutDate },
                checkOutDate: { gt: checkInDate },
                ...(excludeBookingId && { bookingId: { not: excludeBookingId } }),
            },
        });

        return !conflict;
    }

    async createBooking(userId: string, data: CreateBookingData): Promise<Booking> {
        const room = await prisma.room.findFirst({
            where: { roomId: data.roomId, isDeleted: false },
            include: { hotel: true },
        });

        if (!room) {
            throw new ApiError('Room not found', 404);
        }

        if (room.hotel.isDeleted || room.hotel.status !== 'ACTIVE') {
            throw new ApiError('This room is currently not available for booking', 400);
        }

        if (room.status === 'MAINTENANCE') {
            throw new ApiError('This room is currently under maintenance', 400);
        }

        const today = startOfDay(new Date());

        if (startOfDay(data.checkInDate) < today) {
            throw new ApiError('Check-in date cannot be in the past', 400);
        }

        const guestCount = data.guestCount ?? 1;

        if (guestCount > room.capacity) {
            throw new ApiError(`This room can accommodate at most ${room.capacity} guests`, 400);
        }

        const nights = nightsBetween(data.checkInDate, data.checkOutDate);

        if (nights < 1) {
            throw new ApiError('Booking must be for at least one night', 400);
        }

        const available = await this.isRoomAvailable(data.roomId, data.checkInDate, data.checkOutDate);

        if (!available) {
            throw new ApiError('Room is not available for the selected dates', 409);
        }

        const totalAmount = (nights * Number(room.pricePerNight)).toFixed(2);

        return prisma.booking.create({
            data: {
                userId,
                hotelId: room.hotelId,
                roomId: room.roomId,
                checkInDate: data.checkInDate,
                checkOutDate: data.checkOutDate,
                guestCount,
                totalAmount,
                specialRequest: data.specialRequest ?? null,
                status: 'PENDING',
                paymentStatus: 'UNPAID',
            },
        });
    }

    async getBookingById(id: string, requester: Requester): Promise<Booking> {
        const booking = await prisma.booking.findUnique({
            where: { bookingId: id },
            include: { hotel: { select: { ownerId: true } } },
        });

        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        const isOwner = booking.userId === requester.id;
        const isHotelOwner = booking.hotel.ownerId === requester.id;
        const isAdmin = requester.role === 'ADMIN';

        if (!isOwner && !isHotelOwner && !isAdmin) {
            throw new ApiError('You do not have permission to view this booking', 403);
        }

        return booking;
    }

    async getMyBookings(userId: string, filters: BookingListFilters): Promise<PaginatedResult<Booking>> {
        const where: Prisma.BookingWhereInput = {
            userId,
            ...(filters.status && { status: filters.status }),
            ...(filters.roomId && { roomId: filters.roomId }),
            ...(filters.from && { checkInDate: { gte: filters.from } }),
            ...(filters.to && { checkOutDate: { lte: filters.to } }),
        };

        return paginateQuery<Booking>(
            filters,
            BOOKING_SORT_FIELDS,
            (args) => prisma.booking.findMany({ ...args, where }),
            () => prisma.booking.count({ where }),
        );
    }

    async getHotelBookings(
        hotelId: string,
        requester: Requester,
        filters: BookingListFilters,
    ): Promise<PaginatedResult<Booking>> {
        const hotel = await prisma.hotel.findFirst({ where: { hotelId, isDeleted: false } });

        if (!hotel) {
            throw new ApiError('Hotel not found', 404);
        }

        assertHotelOwnerOrAdmin(hotel.ownerId, requester);

        const where: Prisma.BookingWhereInput = {
            hotelId,
            ...(filters.status && { status: filters.status }),
            ...(filters.roomId && { roomId: filters.roomId }),
            ...(filters.from && { checkInDate: { gte: filters.from } }),
            ...(filters.to && { checkOutDate: { lte: filters.to } }),
        };

        return paginateQuery<Booking>(
            filters,
            BOOKING_SORT_FIELDS,
            (args) => prisma.booking.findMany({ ...args, where }),
            () => prisma.booking.count({ where }),
        );
    }

    async getAllBookings(requester: Requester, filters: BookingListFilters): Promise<PaginatedResult<Booking>> {
        assertAdmin(requester);

        const where: Prisma.BookingWhereInput = {
            ...(filters.status && { status: filters.status }),
            ...(filters.roomId && { roomId: filters.roomId }),
            ...(filters.from && { checkInDate: { gte: filters.from } }),
            ...(filters.to && { checkOutDate: { lte: filters.to } }),
        };

        return paginateQuery<Booking>(
            filters,
            BOOKING_SORT_FIELDS,
            (args) => prisma.booking.findMany({ ...args, where }),
            () => prisma.booking.count({ where }),
        );
    }

    async updateBookingStatus(id: string, requester: Requester, data: UpdateStatusData): Promise<Booking> {
        const booking = await prisma.booking.findUnique({
            where: { bookingId: id },
            include: { hotel: { select: { ownerId: true } } },
        });

        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        const allowedNextStatuses = ALLOWED_TRANSITIONS[booking.status];

        if (!allowedNextStatuses.includes(data.status)) {
            throw new ApiError(`Cannot change booking status from ${booking.status} to ${data.status}`, 400);
        }

        const isOwner = booking.userId === requester.id;
        const isHotelOwner = booking.hotel.ownerId === requester.id;
        const isAdmin = requester.role === 'ADMIN';

        if (data.status === 'CANCELLED') {
            if (!isOwner && !isHotelOwner && !isAdmin) {
                throw new ApiError('You do not have permission to cancel this booking', 403);
            }
        } else if (!isHotelOwner && !isAdmin) {
            throw new ApiError('You do not have permission to update this booking', 403);
        }

        const updateData: Prisma.BookingUpdateInput =
            data.status === 'CANCELLED'
                ? {
                    status: data.status,
                    cancelledAt: new Date(),
                    cancelReason: data.cancelReason ?? null,
                }
                : {
                    status: data.status,
                };

        return prisma.booking.update({
            where: { bookingId: id },
            data: updateData,
        });
    }

    async cancelBooking(id: string, requester: Requester, cancelReason?: string): Promise<Booking> {
        return this.updateBookingStatus(id, requester, { status: 'CANCELLED', cancelReason });
    }

    async updatePaymentStatus(id: string, requester: Requester, data: UpdatePaymentData): Promise<Booking> {
        const booking = await prisma.booking.findUnique({
            where: { bookingId: id },
            include: { hotel: { select: { ownerId: true } } },
        });

        if (!booking) {
            throw new ApiError('Booking not found', 404);
        }

        assertHotelOwnerOrAdmin(booking.hotel.ownerId, requester);

        return prisma.booking.update({
            where: { bookingId: id },
            data: stripUndefined(data),
        });
    }
}

const bookingService = new BookingService();

export default bookingService;
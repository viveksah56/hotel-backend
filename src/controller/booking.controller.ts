import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { ApiError } from '../utils/api.error.js';
import bookingService from '../services/booking.service.js';
import type {
    CreateBookingInput,
    BookingIdParamInput,
    HotelIdParamInput,
    UpdateBookingStatusInput,
    CancelBookingInput,
    UpdatePaymentInput,
    AvailabilityQueryInput,
    BookingListQueryInput,
} from '../validations/booking.validation.js';

class BookingController {
    createBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const body = req.body as CreateBookingInput;
        const booking = await bookingService.createBooking(req.user.id, body);
        res.status(201).json({ success: true, booking });
    });

    checkAvailability = catchAsync(async (req: Request, res: Response) => {
        const query = req.validatedQuery as unknown as AvailabilityQueryInput;
        const available = await bookingService.isRoomAvailable(query.roomId, query.checkInDate, query.checkOutDate);
        res.status(200).json({ success: true, available });
    });

    getBookingById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as BookingIdParamInput;
        const booking = await bookingService.getBookingById(id, req.user);
        res.status(200).json({ success: true, booking });
    });

    getMyBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const query = req.validatedQuery as unknown as BookingListQueryInput;
        const result = await bookingService.getMyBookings(req.user.id, query);
        res.status(200).json({ success: true, ...result });
    });

    getHotelBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { hotelId } = req.params as HotelIdParamInput;
        const query = req.validatedQuery as unknown as BookingListQueryInput;
        const result = await bookingService.getHotelBookings(hotelId, req.user, query);
        res.status(200).json({ success: true, ...result });
    });

    getAllBookings = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const query = req.validatedQuery as unknown as BookingListQueryInput;
        const result = await bookingService.getAllBookings(req.user, query);
        res.status(200).json({ success: true, ...result });
    });

    updateBookingStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as BookingIdParamInput;
        const body = req.body as UpdateBookingStatusInput;
        const booking = await bookingService.updateBookingStatus(id, req.user, body);
        res.status(200).json({ success: true, booking });
    });

    cancelBooking = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as BookingIdParamInput;
        const body = req.body as CancelBookingInput;
        const booking = await bookingService.cancelBooking(id, req.user, body.cancelReason);
        res.status(200).json({ success: true, booking });
    });

    updatePaymentStatus = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as BookingIdParamInput;
        const body = req.body as UpdatePaymentInput;
        const booking = await bookingService.updatePaymentStatus(id, req.user, body);
        res.status(200).json({ success: true, booking });
    });
}

const bookingController = new BookingController();

export default bookingController;
import { Router } from 'express';

import {
    createBookingSchema,
    bookingIdParamSchema,
    hotelIdParamSchema,
    updateBookingStatusSchema,
    cancelBookingSchema,
    updatePaymentSchema,
    availabilityQuerySchema,
    bookingListQuerySchema,
} from '../validations/booking.validation.js';
import bookingController from '../controller/booking.controller.js';

import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { UserRole } from '../constants/role.constant.js';

const bookingRouter = Router();

bookingRouter.get(
    '/availability',
    validateQuery(availabilityQuerySchema),
    bookingController.checkAvailability,
);

bookingRouter.use(authenticate);

bookingRouter.post('/', validateBody(createBookingSchema), bookingController.createBooking);

bookingRouter.get('/me', validateQuery(bookingListQuerySchema), bookingController.getMyBookings);

bookingRouter.get(
    '/',
    authorize(UserRole.ADMIN),
    validateQuery(bookingListQuerySchema),
    bookingController.getAllBookings,
);

bookingRouter.get(
    '/hotel/:hotelId',
    validateParams(hotelIdParamSchema),
    validateQuery(bookingListQuerySchema),
    bookingController.getHotelBookings,
);

bookingRouter.get('/:id', validateParams(bookingIdParamSchema), bookingController.getBookingById);

bookingRouter.patch(
    '/:id/status',
    validateParams(bookingIdParamSchema),
    validateBody(updateBookingStatusSchema),
    bookingController.updateBookingStatus,
);

bookingRouter.patch(
    '/:id/cancel',
    validateParams(bookingIdParamSchema),
    validateBody(cancelBookingSchema),
    bookingController.cancelBooking,
);

bookingRouter.patch(
    '/:id/payment',
    validateParams(bookingIdParamSchema),
    validateBody(updatePaymentSchema),
    bookingController.updatePaymentStatus,
);

export default bookingRouter;
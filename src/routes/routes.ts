import { Router } from 'express';
import authRouter from './auth.route.js';
import userRouter from './user.route.js';
import hotelRouter from './hotel.route.js';
import bookingRouter from './booking.route.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/hotels', hotelRouter);
router.use('/bookings', bookingRouter);

export default router;
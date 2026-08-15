import { Router } from 'express';

import { createHotelSchema, hotelIdParamSchema, hotelListQuerySchema } from '../validations/hotel.validation.js';
import hotelController from '../controller/hotel.controller.js';

import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { validateUpdateHotelBody } from '../middlewares/hotel.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { fileUploadArray } from '../middlewares/upload.middleware.js';

const hotelRouter = Router();

hotelRouter.get('/', validateQuery(hotelListQuerySchema), hotelController.getAllHotels);

hotelRouter.get('/:id', validateParams(hotelIdParamSchema), hotelController.getHotelById);

hotelRouter.post(
    '/',
    authenticate,
    fileUploadArray('images', 10),
    validateBody(createHotelSchema),
    hotelController.createHotel,
);

hotelRouter.patch(
    '/:id',
    authenticate,
    validateParams(hotelIdParamSchema),
    fileUploadArray('images', 10),
    validateUpdateHotelBody,
    hotelController.updateHotel,
);

hotelRouter.delete(
    '/:id',
    authenticate,
    validateParams(hotelIdParamSchema),
    hotelController.deleteHotel,
);

export default hotelRouter;
import { validateBodyByRole } from './validate.middleware.js';
import { updateHotelSchema, adminUpdateHotelSchema } from '../validations/hotel.validation.js';

export const validateUpdateHotelBody = validateBodyByRole(adminUpdateHotelSchema, updateHotelSchema);
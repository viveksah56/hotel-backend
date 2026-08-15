import { validateBodyByRole } from './validate.middleware.js';
import { updateUserSchema, adminUpdateUserSchema } from '../validations/user.validation.js';

export const validateUpdateUserBody = validateBodyByRole(adminUpdateUserSchema, updateUserSchema);
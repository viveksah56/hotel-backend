import { Router } from 'express';

import { userIdParamSchema, userListQuerySchema } from '../validations/user.validation.js';
import userController from '../controller/user.controller.js';

import { validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { validateUpdateUserBody } from '../middlewares/user.middleware.js';
import { authenticate, authorize, authorizeSelfOrRole } from '../middlewares/auth.middleware.js';
import { fileUpload } from '../middlewares/upload.middleware.js';
import { UserRole } from '../constants/role.constant.js';

const userRouter = Router();

userRouter.get('/', authenticate, authorize(UserRole.ADMIN), validateQuery(userListQuerySchema), userController.getAllUsers);

userRouter.get(
    '/:id',
    authenticate,
    authorizeSelfOrRole('id', UserRole.ADMIN),
    validateParams(userIdParamSchema),
    userController.getUserById,
);

userRouter.patch(
    '/:id',
    authenticate,
    authorizeSelfOrRole('id', UserRole.ADMIN),
    validateParams(userIdParamSchema),
    fileUpload('avatar'),
    validateUpdateUserBody,
    userController.updateUser,
);

userRouter.delete(
    '/:id',
    authenticate,
    authorizeSelfOrRole('id', UserRole.ADMIN),
    validateParams(userIdParamSchema),
    userController.deleteUser,
);

export default userRouter;
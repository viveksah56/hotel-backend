import { Router } from 'express';

import {
    registerSchema,
    loginSchema,
    verifyEmailQuerySchema,
    refreshTokenSchema,
    googleLoginSchema,
} from '../validations/auth.validation.js';
import authController from '../controller/auth.controller.js';

import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.get('/verify-email', validateQuery(verifyEmailQuerySchema), authController.verifyEmail);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/refresh', validateBody(refreshTokenSchema.partial()), authController.refresh);
authRouter.post('/google', validateBody(googleLoginSchema), authController.loginWithGoogle);
authRouter.post('/logout', validateBody(refreshTokenSchema.partial()), authController.logout);
authRouter.post('/logout-all', authenticate, authController.logoutAllDevices);
authRouter.get('/profile', authenticate, authController.loggedInUser);

export default authRouter;
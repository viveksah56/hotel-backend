import { Router } from 'express';

import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    refreshTokenSchema,
    googleLoginSchema,
} from '../validations/auth.validation.js';
import authController from '../controller/auth.controller.js';

import {validateBody} from "../middlewares/validate.middleware.js";
import {authenticate} from "../middlewares/auth.middleware.js";


const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), authController.register);
authRouter.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
authRouter.post('/google', validateBody(googleLoginSchema), authController.loginWithGoogle);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.get('/profile', authenticate, authController.loggedInUser);

export default authRouter;
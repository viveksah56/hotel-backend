import { Router } from 'express';
import authRouter from './auth.route.js';




const routeConfig = Router();

routeConfig.use('/auth',authRouter);


export default routeConfig;
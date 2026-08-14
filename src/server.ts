import express, { type Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { envConfig } from './config/env.config.js';
import routeConfig from './routes/routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';

const app: Application = express();

app.use(helmet());
app.use(
    cors({
        origin: envConfig.CORS_ORIGIN,
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(envConfig.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use('/api', routeConfig);
app.use(notFoundHandler);
app.use(errorHandler);


export default app;
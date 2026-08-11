import express, {type Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { envConfig } from './config/env.config.js';

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

export default app;
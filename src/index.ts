
import { envConfig } from './config/env.config.js';

import app from './server.js';
import {connectDB} from "./config/db.connect.js";

const startServer = async () => {
  await connectDB();

  const server = app.listen(envConfig.PORT, () => {
    console.log(`🚀 ghumNepal API running on http://localhost:${envConfig.PORT} [${envConfig.NODE_ENV}]`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
};

startServer();
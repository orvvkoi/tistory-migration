import express from 'express';
import AuthRouter from './authentication/routes/AuthRouter';
import MigrationRouter from './migration/routes/MigrationRouter';
import MigrationMiddleware from '@server/middleware/MigrationMiddleware';

const app = express();

// Linking all the routes
app.use('/oauth', AuthRouter);
app.use('/migration', MigrationMiddleware, MigrationRouter);

export default app;

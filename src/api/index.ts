import { Router } from 'express';
import auth from './routes/auth';
import migration from './routes/migration';

export default () => {
  const app = Router();

  // Linking all the api routes
  auth(app);
  migration(app);

  return app;
};

import migrationMiddleware from './migration';
import { authenticatedMiddleware, looselyAuthenticatedMiddleware } from './auth';

export default {
  authenticatedMiddleware,
  looselyAuthenticatedMiddleware,
  migrationMiddleware,
};

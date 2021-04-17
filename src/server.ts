import 'reflect-metadata';
import express from 'express';
import SharedSession from 'express-socket.io-session';
import config from './config';
import logger from './loaders/logger';
import socketio from './loaders/socket.io';
import dependencyInjector from './loaders/dependencyInjector';
import session from './loaders/cookie-session';
import loaders from './loaders';

/**
 * Add external services init as async operations
 */

async function startServer() {
  const app = express();

  await loaders({ expressApp: app });

  const server = app.listen(config.port, () => {
    logger.info(`
        ################################################
        🛡️  App listening on port: ${config.port} 🛡️
        ################################################
      `);


  }).on('error', (err) => {
    logger.error(err);
    process.exit(1);
  });

  const socket = new socketio(server).getInstance();

  /**
   *  Share the redis cookie session with socket.io
   */
  socket.use(SharedSession(session, { autoSave: true }));
  logger.info(`Attached Socket to the App server.`);

  dependencyInjector([
    { name: 'socket', model: socket },
  ]);


}

startServer();

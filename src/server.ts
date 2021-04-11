import 'reflect-metadata';
import SharedSession from 'express-socket.io-session';
import App from './loaders/app';
import config from './config';
import Logger from './loaders/logger';
import socketio from './loaders/socket.io';
import RedisClient from './loaders/redis';
import dependencyInjector from './loaders/dependencyInjector';
import session from './loaders/redis.session';

async function startServer() {

  const app = new App();


  const server = app.listen(config.port, () => {
    Logger.info(`
        ################################################
        🛡️  App listening on port: ${config.port} 🛡️
        ################################################
      `);

  }).on('error', (err) => {
    Logger.error(err);
    process.exit(1);
  });

  const socket = new socketio(server).getInstance();

  const redis = new RedisClient({
    host: config.redis.ip, // The hostname of the database you are connecting to.
    port: config.redis.port, // The port number to connect to.
    password: config.redis.pass, // The password for redis database.
    db: config.redis.tokenDb,
  }).getInstance();

  // share the redis express session with socket.io
  socket.use(SharedSession(session, {autoSave: true}));

  dependencyInjector([
    { name: 'socket', model: socket },
    { name: 'redis', model: redis },
  ]);
}

startServer();

import session from 'express-session';
import RedisClient from './redis';
import connectRedis  from 'connect-redis';
import config from '../config';

const RedisStore = connectRedis(session);

const client = new RedisClient({
  host: config.redis.ip, // The hostname of the database you are connecting to.
  port: config.redis.port, // The port number to connect to.
  password: config.redis.pass, // The password for redis database.
  db: config.redis.sessionDb,
}).getInstance();

const redisSession = {
  resave: false,
  rolling: true,
  saveUninitialized: true,
  secret: config.sessionSecret,
  key: 'connect.sid',
  store: new RedisStore({ client }),
  cookie: {
    httpOnly: true,
    secure: config.isProduction,
    maxAge: 1000 * 60 * 2, //default 2minutes
  },
}

export default session(redisSession);
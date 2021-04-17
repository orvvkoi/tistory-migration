import expressLoader from './express';
import logger from './logger';
import dependencyInjector from './dependencyInjector';
import RedisClient from './redis';
import config from '../config';


export default async ({ expressApp }) => {
  await expressLoader({ app: expressApp });
  logger.info('✌️App Express loaded');

  const redis = new RedisClient({
    host: config.redis.ip,
    port: config.redis.port,
    password: config.redis.pass,
    db: config.redis.tokenDb,
  }).getInstance();

  const redisTempDb = new RedisClient({
    host: config.redis.ip,
    port: config.redis.port,
    password: config.redis.pass,
    db: config.redis.tokenTempDb,
  }).getInstance();

  // const emitter = new EventEmitter();

  await dependencyInjector([
    { name: 'logger', model: logger },
    { name: 'redis', model: redis },
    { name: 'redisTempDb', model: redisTempDb },
    // { name: 'emitter', model: emitter },
  ]);
  logger.info('✌️App Dependency loaded');

};

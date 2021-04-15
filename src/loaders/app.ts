import { Server } from "http";
import express, { Application } from 'express';
import expressLoader from './express';
import { EventEmitter } from 'events'
import logger from './logger';

import dependencyInjector from './dependencyInjector';
import RedisClient from './redis';
import config from '../config';

class App {
  private readonly app: Application;

  constructor(app?: Application) {
    this.app = app || express();
    this.init();
  }

  private init(): void {
    expressLoader({ app: this.app });
    logger.info('✌️App Express loaded');

    const redis = new RedisClient({
      host: config.redis.ip,
      port: config.redis.port,
      password: config.redis.pass,
      db: config.redis.tokenDb,
    }).getInstance();

    // const emitter = new EventEmitter();

    dependencyInjector([
      { name: 'logger', model: logger },
      { name: 'redis', model: redis },
      // { name: 'emitter', model: emitter },
    ]);
    logger.info('✌️App Dependency loaded');
  }

  /**
   * listen on the port
   *
   */
  public listen(port: number, callback)  {
    return this.app.listen(port, callback);
  }
}

export default App;

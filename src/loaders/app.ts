import express, { Application } from 'express';
import expressLoader from './express';
import { EventEmitter } from 'events'
import Logger from './logger';
import session from './redis.session';
import dependencyInjector from './dependencyInjector';

class App {
  private readonly app: Application;

  constructor() {
    this.app = express();
    this.init();
  }

  private init(): void {
    expressLoader({ app: this.app, session: session });
    Logger.info('✌️App Express loaded');

    const emitter = new EventEmitter();

    dependencyInjector([
      { name: 'logger', model: Logger },
      { name: 'emitter', model: emitter },
    ]);
    Logger.info('✌️App Dependency Injector loaded');
  }

  /**
   * listen on the port
   *
   */
  public listen(port: number, callback) {
    return this.app.listen(port, callback);
  }
}

export default App;

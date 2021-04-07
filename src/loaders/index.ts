import express, { Application } from "express";
import expressLoader from './express';
import Logger from './logger';
//We have to import at least all the events once so they can be triggered
import {Container} from "typedi";
import redis from "./redis";
import LoggerInstance from "./logger";
import config from "../config";
import { Server } from "http";
import socketio from "./socket.io";
import session from "./express.session";

import dependencyInjectorLoader from "./dependencyInjector";

export default class classApp {
  private readonly app: Application;
  constructor({ expressApp }) {
    this.app = expressApp;
    this.config();
    this.inject();
  }
  private config(): void {
    expressLoader({ app: this.app, session : session });
  }

  private inject(): void {
    Logger.info('✌️ Dependency Injector loaded');

    dependencyInjectorLoader([
        {name: 'logger', model: LoggerInstance},
        {name: 'redis', model: redis}
    ]);
  }

  /**
   * listen on the port
   *
   */
  public listen(callback: () => void): Server {
    const server = this.app.listen(config.port, () => {
      Logger.info(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);

      callback();
    }).on('error', err => {
      Logger.error(err);
      process.exit(1);
    });

    const socket = new socketio(server, session);
    Container.set('socketio', socket.getInstance());

    return server;
  }
}
import * as redis from 'redis';
import * as bluebird from 'bluebird';
import logger from './logger';

export default class RedisClient {
  private readonly client: redis.RedisClient;

  constructor(options) {
    this.client = redis.createClient(options);

    bluebird.promisifyAll(this.client);

    this.listeners();
  }

  public getInstance() {
    return this.client;
  }

  private listeners() {
    this.client.on('ready', () => {
      logger.silly(`Redis is ready`);
    });

    this.client.on('connect', () => {
      logger.silly('Connected to redis database');
    });

    // redis errors to the console
    this.client.on('error', (err) => logger.error(err));
  }
}

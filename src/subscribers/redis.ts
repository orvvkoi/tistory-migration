import { EventEmitter } from 'events';
import { Container } from 'typedi'
import createError from 'http-errors';
import * as redis from 'redis';
import logger from '../loaders/logger'
import config from '../config'


export class RedisEventEmitter extends EventEmitter {
  constructor() {
    super();

    this.on('deleteFields', async ({db, storageId, uuid}) => {
      await this.deleteFields({db, storageId, uuid});
    });

  }

  async deleteFields({db, storageId, uuid}) {
    const redis: redis.RedisClient = db === config.redis.tokenDb ? Container.get('redis') : Container.get('redisTempDb');
  }
}

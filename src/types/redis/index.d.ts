import * as Promise from 'bluebird';

export {};

declare module 'redis' {
  export interface RedisClient extends NodeJS.EventEmitter {
    hgetallAsync(key: string): Promise<any>;

    hmsetAsync(key: string, value: any): Promise<any>;
  }
}

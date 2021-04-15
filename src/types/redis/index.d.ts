import * as Promise from 'bluebird';

export {};

declare module 'redis' {
  export interface RedisClient {
    hgetallAsync(key: string): Promise<any>;

    hmsetAsync(key: string, value: any): Promise<any>;
  }
}

import * as Promise from 'bluebird';

export {};

// https://github.com/heycalmdown/redis-bluebird/blob/master/index.d.ts
declare module 'redis' {
  export interface RedisClient {
    hgetallAsync(...args: any[]): Promise<{[key: string]: string}>;
    hmsetAsync(...args: any[]): Promise<string>;
    send_commandAsync(command: string, ...args:any[]): Promise<any>;
    hdelAsync(...args: any[]): Promise<number>;
    existsAsync(...args:any[]): Promise<number>;
    delAsync(...args:any[]): Promise<number>;
  }
}

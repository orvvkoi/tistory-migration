import { Session } from 'express-session'

export {};

declare global {
  namespace Express {
    export interface Request {
      mainClientId: string;
      storageData: any;
    }
  }
}


declare module 'express-session' {
  interface Session {
    socketio: string;
  }
}
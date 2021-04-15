import socketIO from 'socket.io';

export {};

declare global {
  namespace Express {
    export interface Request {
      token: string;
      clientKeys: string;
      storageId: string;
      socketId: string;
    }
  }
}

declare module 'express-session' {
  interface Session {
    socketId: string;
  }
}
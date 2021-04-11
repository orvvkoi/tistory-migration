export {};

declare global {
  namespace Express {
    export interface Request {
      token: string;
      storageData: string;
      storageId: string;
    }
  }
}

declare module 'express-session' {
  interface Session {
    socketId: string;
  }
}

import cookieSession from 'cookie-session';

export {};

declare global {
  namespace Express {
    export interface Request {
      token: string;
      clientKeys: string;
      storageId: string;
      session: cookieSession.Session<{ userId: string, redirectUri: string }>;
      sessionOptions: cookieSession.Options;
    }
  }
}

import { Session, SessionData } from "express-session";
import { Handshake } from 'socket.io/dist/socket';

declare module "socket.io/dist/socket" {
  interface Handshake {
    session?: Session & Partial<SessionData>;
    sessionID?: string;
  }
}


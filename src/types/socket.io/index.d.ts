import { Session, SessionData } from "cookie-session";
import { Handshake } from 'socket.io/dist/socket';

declare module "socket.io/dist/socket" {
  interface Handshake {
    session?: Session & Partial<SessionData>;
    sessionID?: string;
  }

  interface Socket {
    sockets: any;
  }
}


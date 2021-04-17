import { Server } from 'http';
import socketIO from 'socket.io';
import logger from './logger';

export default class SocketServer {
  private readonly io: socketIO.Server;

  constructor(server: Server) {
    this.io = new socketIO.Server(server, {
      transports: [
        'websocket',
        'polling'
      ]
    });

    this.listeners();
  }

  public getInstance() {
    return this.io;
  }

  private listeners() {
   /* this.io.of("/").adapter.on("create-room", (room) => {
      logger.debug(`room ${room} was created`);
    });

    this.io.of("/").adapter.on("join-room", (room, id) => {
      logger.debug(`socket ${id} has joined room ${room}`);
    });*/

    this.io.on('connection', (socket: socketIO.Socket) => {
      logger.debug('i got a socket connection ! %s', socket.id);

      /*socket.handshake.session.socketId = socket.id;
      socket.handshake.session.save();*/

      /**
       * @TODO
       * 세션 id 기준으로 room을 관리하기 때문에
       * 복수개의 브라우저에서 동일한 액션이 발생함.
       * 보류.
       */
      socket.join(socket.handshake.session.id);

      socket.emit('serv:ping', Date.now());

      socket.on('error', () => {
        logger.error('error in socket');
      });
      socket.on('disconnect', () => {
        logger.debug('socket disconnected %s', socket.id);
      });
    });
  }

}

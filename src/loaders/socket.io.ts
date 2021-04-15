import { Server } from 'http';
import socketIO from 'socket.io';

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
    this.io.of("/").adapter.on("create-room", (room) => {
      console.log(`room ${room} was created`);
    });

    this.io.of("/").adapter.on("join-room", (room, id) => {
      console.log(`socket ${id} has joined room ${room}`);
    });

    this.io.on('connection', (socket: socketIO.Socket) => {
      console.log('i got a socket connection !', socket.id);

      /*socket.handshake.session.socketId = socket.id;
      socket.handshake.session.save();*/

      socket.join(socket.handshake.session.id);

      socket.emit('serv:ping', Date.now());

      socket.on('error', () => {
        console.error('error in socket');
      });
      socket.on('disconnect', () => {
        console.log('socket disconnected ', socket.id);
      });
    });
  }

}

import { Server } from "http";
import socketIO from "socket.io";

export default class SocketServer {
  private readonly io: socketIO.Server;

  constructor(server: Server) {
    this.io = new socketIO.Server(server);
    this.listeners();
  }

  public getInstance() {
    return this.io;
  }

  public test() {
    console.log('test 11111111111111111111111');
  }

  private listeners() {

    /*this.io.use((socket, next) => {
      next();
    });*/


    this.io.on('connection', (socket: socketIO.Socket) => {
      console.log('i got a connection !', socket.id);
      // @ts-ignore
      socket.handshake.session.socketId = socket.id;
      // @ts-ignore
      socket.handshake.session.save();


      // socket.emit('connection:sid', socket.id);

      socket.on('connect_error', (err) => {
        console.log(`connect_error due to ${err.message}`);
      });
      socket.on('error', () => {
        console.log('error in socket');
      });
      socket.on('disconnect', () => {
        console.log('disconnected');
      });
      socket.onAny((args) => {
        console.log('i get a event');
      });
      socket.emit('serv:ping', Date.now());
      socket.on('first event', (args) => {
        console.log('i get the first event');
      });
    });
  }

}

import { Server } from "http";
import socketIO from "socket.io";

export default class ServerSocket {
    public io: socketIO.Server;
    private readonly session;

    constructor(server: Server, session) {
        this.io = new socketIO.Server(server);
        this.session = session;
        this.listeners();
    };

    public getInstance() {
        return this.io;
    }

    private listeners() {

        this.io.use((socket, next) => {
            this.session(socket.request, {}, next);
        });

        this.io.on("connection", (socket) => {

            socket.request.session.socketio = socket.id;
            socket.request.session.save();

            socket.on("connect_error", (err) => {
                console.log(`connect_error due to ${err.message}`);
            });
            console.log("i got a connection !");
            socket.on("error", ()=>{
                console.log("error in socket")
            })
            socket.on("disconnect", ()=>{
                console.log("disconnected")
            })
            socket.onAny((args) => {
                console.log("i get a event");
            });
            socket.emit("serv:ping", Date.now());
            socket.on("first event", (args) => {
                console.log("i get the first event");
            });

        });
    };
}
/*
export function SocketIO() {
    return (object, propertyName, index) => {
        const eventDispatcher = new EventDispatcherClass();
        Container.registerHandler({ object, propertyName, index, value: () => eventDispatcher });
    };
}

export { SocketIO as SocketIOInterface } from 'socket.io';


export default ({ server }: { server: express.Application }) => {
    try {
        const io = require('socket.io')(server);
        // The io instance is set in Express so it can be grabbed in a route


        io.use((socket, next) => {
            sessionMiddleware(socket.request, socket.request.res, next);
        });

        io.on('connection', socket => {
            console.log(`socket connected: ${socket.id}`);

            socket.request.session.socketio = socket.id;
            socket.request.session.save();
        });

        Container.set('socketio', io);
    } catch (e) {

    }
}
*/

import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';

import '@config/dotenv.config';

// Defining routes
import routes from './routes';

// Create express application instance
const app = express();

const sessionMiddleware = session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: false,
        secure: false
    }
});

app.use(sessionMiddleware);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());
app.use(express.static('public'));

app.set('view engine', 'pug');

// Linking routes
app.use('/', routes);
/*
app.use('/', (req, res) => {
    res.redirect(process.env.WEB_MIGRATION_PATH);
});
*/

// start server
const server = app.listen(process.env.SERVER_PORT, () => {
    console.log(
        `Server is started with http://localhost:${process.env.SERVER_PORT}`
    );
});

const io = require('socket.io')(server);
// The io instance is set in Express so it can be grabbed in a route
app.set('socketio', io);


io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
});

io.on('connection', socket => {
    console.log(`socket connected: ${socket.id}`);

    socket.request.session.socketio = socket.id;
    socket.request.session.save();
});

module.exports = app;

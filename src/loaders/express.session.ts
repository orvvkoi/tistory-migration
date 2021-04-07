import session from 'express-session';
import config from '../config';

export default session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: false,
        secure: false
    }
});


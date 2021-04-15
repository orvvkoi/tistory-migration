import session from 'cookie-session';
import config from '../config';

export default session({
  name: 'CSID',
  secret: config.cookieSecret,
  cookie: {
    httpOnly: true,
    secure: config.isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 7, //default maxAge 2minutes
  },
});
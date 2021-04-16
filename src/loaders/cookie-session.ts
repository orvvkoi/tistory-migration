import session from 'cookie-session';
import config from '../config';

export default session({
  name: 'CSID',
  secret: config.cookieSecret,
  httpOnly: true,
  secure: config.isProduction,
  //  expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  maxAge: 1000 * 60 * 60 * 24 * 7, //default maxAge 2minutes
  domain: 'localhost',
  path: '/',
});
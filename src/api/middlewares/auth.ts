import expressJwt from 'express-jwt';
import config from '../../config';

const getTokenFromHeader = (req) => {
  const {
    headers: { authorization },
  } = req;

  if (
    (authorization && authorization.split(' ')[0] === 'Token') ||
    (authorization && authorization.split(' ')[0] === 'Bearer')
  ) {
    return authorization.split(' ')[1];
  }
  return null;
};

const getTokenFromCookie = (req) => {
  if (req.cookies && req.cookies[config.jwtSignatureCookieName]) {
    return req.cookies[config.jwtSignatureCookieName];
  }
  return null;
};

const getToken = (req) => {
  const header = getTokenFromHeader(req);
  const cookie = getTokenFromCookie(req);
  /* if (header && cookie) {

   } */

  // return null;
  return cookie;
};

const decodeOptions = {
  secret: config.jwtSecret,
  algorithms: [config.jwtAlgorithm],
  requestProperty: config.authProperty, // default: userProperty
  getToken,
}

export const authenticatedMiddleware = expressJwt({...decodeOptions, credentialsRequired: true});
export const looselyAuthenticatedMiddleware = expressJwt({ ...decodeOptions,  credentialsRequired: false});


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
  if (req.cookies
    && req.cookies[config.jwtCookieName]) {

    return req.cookies[config.jwtCookieName];
  }
  return null;
};

/**
 * @TODO
 * tistory /callback 에서 access token을 저장하기 위해 redis에 접근함.
 * jwt token에 저장소 key를 가지고 있기 때문에, /callback uri에서 token 정보를 읽을 필요가 있음.
 * redirect 되는 uri 임으로 header에 token 정보를 넣을 수 없다.
 * 현재 구조상 웹에선 cookie를 쓰는게 유연해 보임.
 */
const getToken = (req) => {
  //const header = getTokenFromHeader(req);
  const cookie = getTokenFromCookie(req);

  return cookie;
};

const decodeOptions = {
  secret: config.jwtSecret,
  algorithms: [config.jwtAlgorithm],
  requestProperty: config.authProperty, // default: userProperty
  credentialsRequired: true,
  getToken,
}

export const authenticatedMiddleware = expressJwt({...decodeOptions, credentialsRequired: true});
export const looselyAuthenticatedMiddleware = expressJwt({ ...decodeOptions,  credentialsRequired: false});


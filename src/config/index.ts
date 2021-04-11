import './dotenv.config';

export default {
  /**
   * Accessing environment variable
   */
  environment: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',

  /**
   * API configs
   */
  api: {
    prefix: '/api',
  },

  /**
   * Server port
   */
  port: parseInt(process.env.SERVER_PORT, 10),

  /**
   * Redis
   */
  redis: {
    ip: process.env.REDIS_IP,
    port: parseInt(process.env.REDIS_PORT, 10),
    pass: process.env.REDIS_PASS,
    tokenDb: process.env.REDIS_TOKEN_DB,
    sessionDb: process.env.REDIS_SESSION_DB,
  },

  /**
   *  Crypto Encrypt key
   */
  cryptoEncryptKey: process.env.CRYPTO_ENCRYPT_KEY,

  /**
   * Used by express-jwt
   * Retrieve decoded jwt token
   * req.{authProperty}
   */
  authProperty: 'auth',

  /**
   *  jwtPayloadCookieName in a cookie without httpOnly and sent in a header with ajax.
   *  This is to access payload data with javascript.
   *  ex) expiration date
   *
   *  jwtSignatureCookieName is in a cookie with HttpOnly.
   */
  jwtPayloadCookieName: 'JPCN',
  jwtSignatureCookieName: 'JSCN',

  /**
   * Cookie name for tistory authentication request.
   * This is a temp cookie used per request.
   */
  tempForAuthCookieName: 'T_F_ACN',

  /**
   * jwt secret
   */
  jwtSecret: process.env.JWT_SECRET.replace(/\\n/gm, '\n'),
  jwtAlgorithm: process.env.JWT_ALGO.replace(/\\n/gm, '\n'),

  /**
   *  Express Secret Key
   */
  sessionSecret: process.env.SESSION_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,

  /**
   * Used by winston and morgan logger
   */
  logs: {
    winston: {
      level: process.env.LOG_LEVEL || 'silly',
    },
    morgan: {
      mode: process.env.MORGAN_MODE || 'combined',
    },
  },

  /**
   * Tistory api
   */
  tistory: {
    baseUri: 'https://www.tistory.com/apis',
    authorizationUri: 'https://www.tistory.com/oauth/authorize',
    accessTokenUri: 'https://www.tistory.com/oauth/access_token',
    redirectUri: 'http://localhost:3000/api/auth/callback',
  },
};

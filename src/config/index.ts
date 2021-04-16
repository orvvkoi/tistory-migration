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
    tokenDb: process.env.REDIS_TOKEN_DB
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
   * jwt
   */
  jwtSecret: process.env.JWT_SECRET.replace(/\\n/gm, '\n'),
  jwtAlgorithm: process.env.JWT_ALGO.replace(/\\n/gm, '\n'),
  jwtCookieMaxAge: 604800000, //1000 * 60 * 60 * 24 * 7
  jwtCookieName: 'JSCN',

  /**
   *  cookie-session secret key
   */
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

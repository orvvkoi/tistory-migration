import './dotenv.config';

export default {
    /**
     * Your favorite port
     */
    port: parseInt(process.env.SERVER_PORT, 10),
    authTokenName : process.env.COOKIE_SCHEME,

    /**
     * redis
     */
    redisIP: process.env.REDIS_IP,
    redisPort: parseInt(process.env.REDIS_PORT, 10),
    redisPass: process.env.REDIS_PASS,
    encryptionKey: process.env.ENCRYPTION_KEY,

    /**
     * That long string from mlab
     */
    databaseURL: process.env.MONGODB_URI,

    /**
     * Your secret sauce
     */
    jwtSecret: process.env.JWT_SECRET,
    jwtAlgorithm: process.env.JWT_ALGO,

    /**
     * Used by winston logger
     */
    logs: {
        level: process.env.LOG_LEVEL || 'silly',
    },

    /**
     * Agenda.js stuff
     */
    agenda: {
        dbCollection: process.env.AGENDA_DB_COLLECTION,
        pooltime: process.env.AGENDA_POOL_TIME,
        concurrency: parseInt(process.env.AGENDA_CONCURRENCY, 10),
    },

    /**
     * Agendash config
     */
    agendash: {
        user: 'agendash',
        password: '123456'
    },
    /**
     * API configs
     */
    api: {
        prefix: '/api',
    },
    /**
     * Mailgun email credentials
     */
    emails: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
    }
};
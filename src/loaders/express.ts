import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { isCelebrateError, errors } from 'celebrate';
import config from '../config';
import logger from './logger';
import routes from '../api';

export default ({ app, session }: { app: express.Application; session  }) => {
  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  app.enable('trust proxy');
  app.use(cors());
  app.use(methodOverride());
  app.use(session);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    cookieParser(config.cookieSecret, {
      httpOnly: true,
      secure: config.isProduction,
    })
  );

  // Load API routes
  app.use(config.api.prefix, routes());

  // Temp view engine
  app.use(express.static('public'));
  app.set('view engine', 'pug');

  // app.use(morgan(config.morgan.mode));
  app.use(morgan(config.logs.morgan.mode, { stream: { write: (message) => logger.info(message) } }));

  // catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    res.status(404);
    next(err);
  });

  // Celebrate errorhandler
  app.use(errors);
  /// error handlers
  app.use((err, req, res, next) => {
    // If this isn't a Celebrate error, send it to the next error handler
    if (isCelebrateError(err)) {
      console.log('err ', err);
      const result = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const [key, { details }] of err.details) {
        result[key] = details.reduce((acc, { path, message, context }) => {
          const customMsg = context.message || message;
          acc[path.join('.')] = {
            customMsg,
          };
          return acc;
        }, {});
      }

      console.log('result ', result);

      /* return res
           .status(400)
           .send({ message: err.message })
           .end(); */
    }
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res.status(err.status).send({ message: err.message }).end();
    }

    return next(err);
  });

  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
      errors: {
        message: err.message,
      },
    });
  });
};

import express from 'express';
import methodOverride from 'method-override';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { isCelebrateError } from 'celebrate';
import config from '../config';
import logger from './logger';
import routes from '../api';
import session from './redis.session';

export default ({ app }: { app: express.Application; }) => {
  app.enable('trust proxy');

  /**
   *  Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
   *  default: X-HTTP-Method-Override
   */
  app.use(methodOverride('X-HTTP-Method-Override'));
  app.use(session);
  app.use(cors());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    cookieParser(config.cookieSecret, {
      httpOnly: true,
      secure: config.isProduction,
    }),
  );

  // Load API routes
  app.use(config.api.prefix, routes());

  // Temp view engine
  app.use(express.static('public'));
  app.set('view engine', 'pug');

  // app.use(morgan(config.morgan.mode));
  app.use(morgan(config.logs.morgan.mode, { stream: { write: (message) => logger.info(message) } }));

  // Celebrate errorhandler
  // app.use(errors);

  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
  });


  //  error handlers
  app.use((err, req, res, next) => {
    // If this isn't a Celebrate error, send it to the next error handler
    if (isCelebrateError(err)) {
      const result = {};

      for (const [key, { details }] of err.details) {
        result[key] = details.reduce((acc, { path, message, context }) => {
          console.log(message, context.message);
          const customMsg = context.message || message;
          acc[path.join('.')] = {
            customMsg,
          };
          return acc;
        }, {});
      }

      console.log('isCelebrateError error ', result);

      return res
        .status(400)
        .json({code: 400, message: result});
    }
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res
        .status(res.status)
        .json({ status: res.status, message: err.message });
    }

    return next(err);
  });

  app.use((err, req, res, next) => {
    // req.xhr || req.headers.accept.indexOf('json') > -1
    // req.headers["x-requested-with"] === 'XMLHttpRequest'
    const status = err.status || 500;

    if(req.headers["x-requested-with"] === 'XMLHttpRequest') {
      res.status(status)
        .json({
          status: status,
          message: err.message,
        });
    } else {
      res.render('error', {
        status: status,
        message: err.message,
      });
    }
  });

};

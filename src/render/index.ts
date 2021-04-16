import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../loaders/logger';

export default () => {
  const app = Router();

  app.get(
    '/',
    async (req: Request, res: Response, next) => {
      try {

        logger.debug('req.session : %s ', req.session);
        logger.debug('session : %s', JSON.stringify(req.session));

        /**
         * socket 때문에 cookie 세션을 생성함.
         */
        if(!req.session.id) {
          req.session.id = uuidv4().replace(/-/g, '');
        }

        res.render('index');

      } catch (e) {
        return next(e);
      }
    },
  );

  return app;
};

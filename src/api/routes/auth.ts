import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { celebrate, Joi, Segments } from 'celebrate';
import OAuthService from '../../services/tistory.auth';
import middlewares from '../middlewares';
import config from '../../config';
import { ITistoryAuth } from '../../interfaces';
import CryptoUtils from '../../utils/CryptoUtils';

const route = Router();

export default (app) => {
  app.use('/auth', route);

  route.get(
    '/tistory',
    middlewares.isAuth,
    celebrate({
      [Segments.QUERY]: Joi.object({
        clientId: Joi.string().required(),
        clientSecret: Joi.string().required(),
        callbackUrl: Joi.alternatives().try(Joi.string().uri(), Joi.string().ip()).optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /tistory endpoint with query: %o', req.query);

      try {
        let tistoryAuth: ITistoryAuth = req.query as any;

        const token = req[config.authProperty];

        if (token && token.storageId) {
          tistoryAuth = { ...tistoryAuth, ...{ storageId: token.storageId } };

          console.log('token.storageId 1 ', token.storageId);
        }



        const authServiceInstance = Container.get(OAuthService);

        const { redirectUri } = await authServiceInstance.authentication(tistoryAuth);

        logger.debug('redirectUri %s', redirectUri);

        return res.redirect(redirectUri);
        // return res.status(200).json({ redirectUri: redirectUri });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    }
  );

  route.get(
    '/callback',
    middlewares.isAuth,
    celebrate({
      [Segments.QUERY]: Joi.object({
        code: Joi.string().token().required(),
        state: Joi.any().required(),
        error: Joi.any().optional(),
        error_reason: Joi.any().allow(null).allow('').optional(),
        error_description: Joi.any().allow(null).allow('').optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /callback endpoint with query: %o', req.query);

      try {
        let tistoryAuth: ITistoryAuth = req.query as any;
        tistoryAuth.socketId = req.session.socketId;
        logger.debug('callback state : %s', req.query.state);

        const token = req[config.authProperty];

        if (token && token.storageId) {
          tistoryAuth = { ...tistoryAuth, ...{ storageId: token.storageId } };

          console.log('token.storageId 2 ', token.storageId);
        }



        const authServiceInstance = Container.get(OAuthService);
        const { newToken } = await authServiceInstance.authorization(tistoryAuth);

        res.cookie(config.jwtSignatureCookieName, newToken);
        logger.debug('newToken : %s', newToken);

        return res.send(`<script>window.close();</script>`);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    }
  );
};

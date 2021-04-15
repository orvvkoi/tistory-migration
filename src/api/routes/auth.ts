import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { celebrate, Joi, Segments } from 'celebrate';
import OAuthService from '../../services/tistory.auth';
import middlewares from '../middlewares';
import config from '../../config';
import { ITistoryAuth } from '../../interfaces';
import Crypto from '../../utils/crypto';

const route = Router();

export default (app) => {
  app.use('/auth', route);

  route.get(
    '/tistory',
    middlewares.looselyAuthenticatedMiddleware,
    celebrate({
      [Segments.QUERY]: Joi.object({
        clientId: Joi.string().alphanum(),
        clientSecret: Joi.string().alphanum(),
        //callbackUrl: Joi.alternatives().try(Joi.string().uri(), Joi.string().ip()).optional(),
      }).required(),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /tistory endpoint with query: %o', req.query);

      try {
        let tistoryAuth: ITistoryAuth = req.query as any;

        const token = req[config.authProperty];

        if (token && token.storageId) {
          tistoryAuth = { ...tistoryAuth, ...{ storageId: token.storageId } };
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
    middlewares.looselyAuthenticatedMiddleware,
    celebrate({
      [Segments.QUERY]: Joi.alternatives().try(
        Joi.object({
          code: Joi.string().token(),
          state: Joi.any(),
        }).required(),
        Joi.object({
          error: Joi.any().required(),
          error_reason: Joi.any().allow(null).allow('').optional(),
          error_description: Joi.any().allow(null).allow('').optional(),
        }),
      ),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling /callback endpoint with query: %o', req.query);

      try {
        let tistoryAuth: ITistoryAuth = req.query as any;
        tistoryAuth.sessionId = req.sessionID;

        const token = req[config.authProperty];

        if (token && token.storageId) {
          tistoryAuth = { ...tistoryAuth, ...{ storageId: token.storageId} };
        }

        const authServiceInstance = Container.get(OAuthService);
        const { newToken } = await authServiceInstance.authorization(tistoryAuth);

        if(newToken) {
          res.cookie(config.jwtSignatureCookieName, newToken);
          logger.debug('generated jwt token : %s', newToken);
        }

        return res.send(`<script>window.close();</script>`);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return res.send(`<script>window.close();</script>`);
      }
    }
  );
};

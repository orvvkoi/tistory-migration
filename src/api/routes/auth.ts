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
        clientId: Joi.string().alphanum().trim().min(30).max(50),
        clientSecret: Joi.string().alphanum().trim().min(70).max(100),
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
    celebrate({
      [Segments.QUERY]: Joi.alternatives().try(
        Joi.object({
          code: Joi.string().token().trim(),
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
        tistoryAuth.sessionId = req.session.id;

        const authServiceInstance = Container.get(OAuthService);
        const { newToken } = await authServiceInstance.authorization(tistoryAuth);

        if(newToken) {
          // const [headerEncoded, payloadEncoded, signature] = newToken.split('.');

          /**
           * @TODO
           * redis key 만료시간과 동기화 해야함.
           * redis field에 만료시간 지정은 불가.
           */
          res.cookie(config.jwtCookieName, newToken, {
            httpOnly: true,
            secure: true,
            maxAge: config.jwtCookieMaxAge,
            sameSite: 'strict',
          });

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

/**
 *  passport-tistory 이용하려 했으나,
 *  구조에 적합한지 확인이 필요함.
 *  일단 보류.
 */

import { Logger } from 'winston';
import { Container } from 'typedi';
import passport from 'passport';
import { Strategy as TistoryStrategy } from 'passport-tistory';
import CryptoUtils from '../../utils/CryptoUtils';
import config from '../../config';

const middleware = async (req, res, next) => {
  const logger: Logger = Container.get('logger');
  const redis: any = Container.get('redis');

  try {
    logger.debug('passport middleware %o', req.query);

    const { clientId, clientSecret, callbackUrl } = await (async () => {
      const token = req.cookies[config.tempForAuthCookieName];

      if (token) {
        const { clientId } = token && CryptoUtils.decrypt(token);

        let { progressId, storageData } = await redis.hgetallAsync(clientId);

        storageData = JSON.parse(storageData);

        return storageData[progressId];
      }

      return req.query;
    })();

    logger.debug(`passport middleware ${clientId}`);

    const strategy = new TistoryStrategy(
      {
        clientID: clientId,
        clientSecret,
        callbackURL: callbackUrl,
      },
      function (accessToken, refreshToken, profile, done) {
        console.log('accessToken: ', accessToken);
        console.log('refreshToken: ', refreshToken);
        console.log('profile: ', profile);

        process.nextTick(function () {
          return done(null, profile);
        });
      }
    );

    return passport.authenticate(strategy)(req, res, next);
  } catch (e) {
    return next(e);
  }
};

export default middleware;

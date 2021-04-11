import { Logger } from 'winston';
import { Container } from 'typedi';
import CryptoUtils from '../../utils/CryptoUtils';
import config from '../../config';


const middleware = async (req, res, next) => {
  const logger: Logger = Container.get('logger');
  const redis: any = Container.get('redis');

  const url = req.originalUrl;

  /* if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
    */
  try {
    logger.debug('middleware migration ', req.isAuthenticated());

    if (url.includes(process.env.WEB_MIGRATION_PATH)) {
      const token = req[config.authProperty];


      if (token && token.storageId) {
        try {
          const clientKeys = await redis.hgetallAsync(token.storageId);

          req.storageData = clientKeys;
          req.storageId = token.storageId;
        } catch (e) {
          /* if(e.name === "SyntaxError") {
                        res.clearCookie(process.env.TOKEN_FOR_AUTH_REQ);
                        res.redirect(process.env.WEB_MIGRATION_PATH);
                    } */
          // res.clearCookie(process.env.TOKEN_FOR_AUTH_REQ);
          return res.redirect(process.env.WEB_MIGRATION_PATH);
        }
      } else if (url !== process.env.WEB_MIGRATION_PATH && url !== `${process.env.WEB_MIGRATION_PATH}/`) {
        //    return res.status(400).send('Error validating token. Session has expired');
      }
    }

    next();
  } catch (e) {
    return next(e);
  }
};

export default middleware;

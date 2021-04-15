import { Logger } from 'winston';
import { Container } from 'typedi';
import config from '../../config';


const migration = async (req, res, next) => {
  const logger: Logger = Container.get('logger');
  const redis: any = Container.get('redis');

  const url = req.originalUrl;

  try {

    if (url.includes(process.env.WEB_MIGRATION_PATH)) {
      const token = req[config.authProperty];

      if (token && token.storageId) {
          const keyRawData = await redis.hgetallAsync(token.storageId);

          const rawToKeyArray = () => {
            if(!keyRawData) {
              return [];
            }

            const keyToObject = Object.keys(keyRawData)
              .reduce(function(newRaw, k) {
                const keys = k.split(':');
                newRaw[keys[1]] = {
                  ...newRaw[keys[1]], [keys[0]] : keyRawData[k]
                };

                return newRaw;
              }, {});

            const clientKeys = [];
            for (const key in keyToObject) {
              clientKeys.push({ ...keyToObject[key], uuid: key});
            }

            return clientKeys;
          }

          req.clientKeys = rawToKeyArray();
          req.storageId = token.storageId;
      } else {
        if(url !== process.env.WEB_MIGRATION_PATH && url !== `${process.env.WEB_MIGRATION_PATH}/`) {
          return res.status(400).json({ message: 'No access token provided' });
        }
      }
    }

    next();
  } catch (e) {
    logger.error('🔥 error: %o', e);
    return next(e);
  }
};

export default migration;

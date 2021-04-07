import CryptoUtils from '../../utils/CryptoUtils';
import {Logger} from "winston";
import {Container} from "typedi";

const { COOKIE_SCHEME } = process.env;

const middleware = async (req, res, next) => {

    const logger: Logger = Container.get('logger');
    const redis: any = Container.get('redis');

    const token = req.cookies[COOKIE_SCHEME];
    const url = req.originalUrl;

    try {
        if(url.includes(process.env.WEB_MIGRATION_PATH)) {
            logger.debug('migration middleware token: %o', token);
            logger.debug('migration middleware token: %o', req.body);
            logger.debug('migration middleware token: %o', req.params);
            logger.debug('migration middleware token: %o', req.query);
            const { clientId } = token ? CryptoUtils.decrypt(token) : '';

            if(clientId) {
                try {
                    const { storageData } = await redis.hgetall(clientId);

                    req.mainClientId = clientId;
                    req.storageData = JSON.parse(storageData);
                } catch (e) {
                   /* if(e.name === "SyntaxError") {
                        res.clearCookie(process.env.COOKIE_SCHEME);
                        res.redirect(process.env.WEB_MIGRATION_PATH);
                    }*/
                    res.clearCookie(process.env.COOKIE_SCHEME);
                    return res.redirect(process.env.WEB_MIGRATION_PATH);
                }

            } else {
                if(url !== process.env.WEB_MIGRATION_PATH
                    && url !== process.env.WEB_MIGRATION_PATH + "/") {

                //    return res.status(400).send('Error validating token. Session has expired');
                }
            }
        }

        next();
    } catch (e) {
        return next(e);
    }

};

export default middleware;

import CryptoUtils from '@server/utils/CryptoUtils';
import redis from "@server/redis/redis-server";

const { COOKIE_SCHEME } = process.env;

const MigrationMiddleware = async (req, res, next) => {
    const token = req.cookies[COOKIE_SCHEME];
    const url = req.originalUrl;

    try {

        console.log("url ", url, req.url)
        if(url.includes(process.env.WEB_MIGRATION_PATH)) {
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
                    res.redirect(process.env.WEB_MIGRATION_PATH);
                }

            } else {
                if(url !== process.env.WEB_MIGRATION_PATH
                    && url !== process.env.WEB_MIGRATION_PATH + "/") {

                    res.status(400).send('Error validating token. Session has expired');
                }
            }
        }

        next();
    } catch (e) {
        return next(e);
    }

};

export default MigrationMiddleware;

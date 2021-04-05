import RequestUtils from '@server/utils/RequestUtils';
import CryptoUtils from '@server/utils/CryptoUtils';

import redis from '@server/redis/redis-server';

const { COOKIE_SCHEME } = process.env;

const tAuthorizeUrl = (clientId, callbackUrl) =>
    `https://www.tistory.com/oauth/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code`;
const tAccessTokenUrl = (clientId, clientSecret, code, callbackUrl) =>
    `https://www.tistory.com/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${callbackUrl}&grant_type=authorization_code`;

const authentication = async (req, res) => {
    const { client_id : clientId, client_secret : clientSecret } = req.query;
    let { callback_url : callbackUrl } = req.query;

    const token = req.cookies[COOKIE_SCHEME];

    if (token) {
        const { clientId: mainClientId } = CryptoUtils.decrypt(token);

        if(clientId === mainClientId) {
            return res.render('error', { message: `This client id is already registered.` });
        }

        const data = await redis.hgetall(mainClientId);
        data.storageData = JSON.parse(data.storageData) || {};
        callbackUrl = data.callbackUrl;
        data.progressId = clientId;

        data.storageData[clientId] = {
            clientId,
            clientSecret
        };

        data.storageData = JSON.stringify(data.storageData);

        await redis.hmset(mainClientId, data);
    } else {
        // make main client id
        const data = {
            mainClientId: clientId,
            progressId: clientId,
            callbackUrl,
            storageData: {}
        };

        data.storageData[clientId] = {
            clientId,
            clientSecret
        };

        data.storageData = JSON.stringify(data.storageData);
        await redis.hmset(clientId, data);

        // redis.expireat(clientId, parseInt((+new Date)/1000) + 86400); //24h

        const newToken = CryptoUtils.encrypt({
            clientId
        });

        res.cookie(COOKIE_SCHEME, newToken, {
            maxAge: 90000000,
            httpOnly: false
        });
    }

    const url = tAuthorizeUrl(clientId, callbackUrl);

    res.redirect(url);
};

const authorization = async (req, res) => {
    const { code, error, error_reason: errorReason } = req.query;

    const authStatus = (clientId, status = 'success') => {
        const io = req.app.get('socketio');
        const session = req.session;
        io.to(session.socketio).emit('auth_status', {
            status,
            clientId,
        });
    }

    if (error) {
        console.log(error, errorReason);
        authStatus("", "fail");
        return res.render('error', { message: `${error} <hr> ${errorReason}` });
    }

    const token = req.cookies[COOKIE_SCHEME];

    if (token) {
        const { clientId: mainClientId } = CryptoUtils.decrypt(token);

        const data = await redis.hgetall(mainClientId);

        let storageData = JSON.parse(data.storageData);
        const storageInfo = storageData[data.progressId];

        const url = tAccessTokenUrl(
            storageInfo.clientId,
            storageInfo.clientSecret,
            code,
            data.callbackUrl
        );

        const result = await RequestUtils.get(url);

        const {
            access_token: accessToken,
            error: tokenError,
            error_description: errorDescription
        } = result.data;

        if (tokenError) {
            console.log(tokenError, errorDescription);
            authStatus(storageInfo.clientId, "fail");
            return res.render('error', { message: `${tokenError} <hr> ${errorDescription}` });
        }

        storageInfo.accessToken = accessToken;

        storageData[storageInfo.clientId] = storageInfo;
        storageData = JSON.stringify(storageData);

        await redis.hmset(mainClientId, { storageData });

        authStatus(storageInfo.clientId);

        res.send("<script>window.close();</script>");
    } else {
        res.redirect(process.env.WEB_OAUTH_LOGIN_PATH);
    }
};

const AuthController = {
    authentication,
    authorization
};

export default AuthController;

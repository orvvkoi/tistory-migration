import {Router, Request, Response, NextFunction} from 'express';
import CryptoUtils from '../utils/CryptoUtils';
import Tistory from './tistory';
import config from '../config';
import {Service, Inject} from 'typedi';
import {IAuth, IAuthInputDTO} from '../interfaces/IAuth';
import RequestUtils from '../utils/RequestUtils';

const {COOKIE_SCHEME} = process.env;

const tAuthorizeUrl = (clientId, callbackUrl) =>
    `https://www.tistory.com/oauth/authorize?client_id=${clientId}&redirect_uri=${callbackUrl}&response_type=code`;
const tAccessTokenUrl = (clientId, clientSecret, code, callbackUrl) =>
    `https://www.tistory.com/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${callbackUrl}&grant_type=authorization_code`;


@Service()
export default class AuthService {
    constructor(
        @Inject('logger') private logger,
        @Inject('redis') private redis,
        @Inject('socketio') private socketio
    ) {
    }

    private async createStorage(authInputDTO: IAuthInputDTO) {
        try {
            const {clientId, clientSecret, callbackUrl} = authInputDTO;

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

            await this.redis.hmset(clientId, data);

        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    private async updateStorage(authInputDTO: IAuthInputDTO) {
        try {
            this.logger.debug(`updateStorage authInputDTO.authToken `, authInputDTO.authToken)
            const {clientId: mainClientId} = CryptoUtils.decrypt(authInputDTO.authToken);

            const data = await this.redis.hgetall(mainClientId);

            data.storageData = JSON.parse(data.storageData) || {};
            data.progressId = authInputDTO.clientId;
            data.callbackUrl = authInputDTO.callbackUrl;

            data.storageData[authInputDTO.clientId] = {
                clientId: authInputDTO.clientId,
                clientSecret : authInputDTO.clientSecret
            };

            data.storageData = JSON.stringify(data.storageData);

            await this.redis.hmset(mainClientId, data);

        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    public getAuthInterface(authInputDTO: IAuthInputDTO, authToken?: string): IAuth {
        try {

            let auth: IAuth = authInputDTO;

            authToken = authToken ? authToken : authInputDTO.authToken;

            if (authToken) {
                const { clientId }: {clientId: string} = CryptoUtils.decrypt(authToken);

                /*if (authInputDTO.clientId === clientId) {
                    throw new Error('This client id is already registered.');
                }*/

                auth = {...auth, ...{"mainClientId": clientId, "authToken": authToken}}
            } else {
                const newToken = CryptoUtils.encrypt({
                    clientId: authInputDTO.clientId
                });

                auth = {...auth, ...{"mainClientId": authInputDTO.clientId, "authToken": newToken}}
            }

            this.logger.debug(`getAuthInterface data : %o`, JSON.stringify(auth));

            return auth;
        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    public async authentication(auth: IAuth): Promise<{ auth: IAuth; redirectUrl: string }> {
        try {

            let {mainClientId, clientId, clientSecret, callbackUrl, authToken} = auth;

            let data: any  = await this.redis.hgetall(mainClientId);
            this.logger.debug(`Authentication redis get data: ${data}`);

            if(data) {
                await this.updateStorage(auth as IAuthInputDTO);
            } else {
                await this.createStorage(auth as IAuthInputDTO);
            }

            const redirectUrl = tAuthorizeUrl(clientId, callbackUrl);

            return {auth, redirectUrl};
        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    public async authorization(auth: IAuth) {
        try {
            const { mainClientId, clientId, socketId} = auth;
            const { code, error, error_reason: errorReason } = auth;

            const authStatus = (clientId, status = 'success') => {
                this.socketio.to(socketId).emit('auth_status', {
                    status,
                    clientId,
                });
            }

            if (error) {
                console.log(error, errorReason);
                 authStatus("", "fail");
                throw new Error(errorReason);
            }

            const data = await this.redis.hgetall(mainClientId);

            let storageData = JSON.parse(data.storageData);
            const storageInfo = storageData[data.progressId];

            const url = tAccessTokenUrl(
                storageInfo.clientId,
                storageInfo.clientSecret,
                code,
                data.callbackUrl
            );

            this.logger.debug(`tAccessTokenUrl : %o`, url)
            const result = await RequestUtils.get(url);

            const {
                access_token: accessToken,
                error: tokenError,
                error_description: errorDescription
            } = result.data;

            if (tokenError) {
                console.log(tokenError, errorDescription);
                authStatus(storageInfo.clientId, "fail");
                throw new Error(errorDescription);
            }

            storageInfo.accessToken = accessToken;

            storageData[storageInfo.clientId] = storageInfo;
            storageData = JSON.stringify(storageData);

            await this.redis.hmset(mainClientId, { storageData });

            authStatus(storageInfo.clientId);

        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }
}


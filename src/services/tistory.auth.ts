import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import { Service, Inject } from 'typedi';
import querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import { ITistoryAuth, ITistoryAuthError } from '../interfaces';
import { axios, crypto } from '../utils';

@Service()
export default class OAuthService {
  constructor(
    @Inject('logger')
    private logger,
    @Inject('redis')
    private redis,
    @Inject('socket')
    private socket
  ) {}

  private generateToken(obj) {
    this.logger.silly(`Generating JWT`);

    return jwt.sign(obj, config.jwtSecret, {
      expiresIn: config.jwtCookieMaxAge,
      algorithm: config.jwtAlgorithm,
    });
  }

  private async setStorage(tistoryAuth: ITistoryAuth): Promise<ITistoryAuth> {
    const auth: ITistoryAuth = { ...tistoryAuth };
    const { clientId, clientSecret } = tistoryAuth;
    let { storageId = '', uuid = '' } = tistoryAuth;

    const hasKey = !!(storageId && (await this.redis.existsAsync(storageId)));
    this.logger.debug(`OAuthService setStorage storageId, hasKey : %s %s`, storageId, hasKey);

    // const clientIds = await this.redis.send_commandAsync("HSCAN", [storageId, 0, "MATCH", "clientId:*", "COUNT", 10]);
    // const storageValues = await this.redis.hvals(storageId);

    storageId = hasKey ? storageId : uuidv4().replace(/-/g, '');

    /**
     *  hexists: field 존재 확인.
     *  hsetnx: field가 없는 경우 저장.
     *  hgetall 대신 확인 할 수 있는가?
     */
    const keyStorage: object = await this.redis.hgetallAsync(storageId);
    console.log('keyStorage ', keyStorage);
    // Return object after clientId duplicate check
    const duplicateKeyObj = keyStorage ? Object.keys(keyStorage).find(key => keyStorage[key] === clientId) : '';
    console.log('duplicateKeyObj ', duplicateKeyObj);

    uuid = hasKey
      ? duplicateKeyObj
        ? duplicateKeyObj.split('clientId:')[1]
        : uuidv4().replace(/-/g, '')
      : storageId;

    const newData: { [key: string]: string } = {
      [`clientId:${uuid}`]: clientId,
      [`clientSecret:${uuid}`]: clientSecret,
    };

    await this.redis.hmsetAsync(storageId, newData);

    auth.uuid = uuid;
    auth.storageId = storageId;

    return auth;
  }

  public async authentication(tistoryAuth: ITistoryAuth): Promise<{ redirectUri: string }> {
    try {
      const auth = await this.setStorage(tistoryAuth);

      const { storageId, clientId, uuid } = auth;

      const encryptState = crypto.encrypt({ storageId, uuid });
      this.logger.debug('authentication encrypt encryptState %s', encryptState);

      const queryParams = querystring.stringify({
        client_id: clientId,
        redirect_uri: config.tistory.redirectUri,
        response_type: 'code',
        output: 'json',
        state: encryptState,
      });

      const redirectUri = `${config.tistory.authorizationUri}?${queryParams}`;

      return { redirectUri };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async authorization(tistoryAuth: ITistoryAuth): Promise<{ newToken: string }> {
    try {
      const { code, state, sessionId } = tistoryAuth;
      const { error: callbackErr, error_reason: callbackErrReason, error_description: callbackErrDesc  }: ITistoryAuthError = tistoryAuth;


      if (callbackErr) {
        this.socket.sockets.to(sessionId).emit('authStatus', {
          status: 400,
          title: callbackErr,
          message: callbackErrReason || callbackErrDesc,
        });

        throw createError.BadRequest(callbackErrReason || callbackErrDesc);
      }

      let { uuid: requestUuid, storageId } = crypto.decrypt(state.replace(/ /g, '+'));

      if(!requestUuid) {
        throw createError.BadRequest('Authorization code invalid');
      }

      const hasKey = !!(storageId && (await this.redis.existsAsync(storageId)));
      storageId = hasKey ? storageId : requestUuid;

      const keyStorage = await this.redis.hgetallAsync(storageId);

      const clientId = keyStorage[`clientId:${requestUuid}`];
      const clientSecret = keyStorage[`clientSecret:${requestUuid}`];
      const hasAccessToken = !!(keyStorage[`accessToken:${requestUuid}`]);
      const accessTokenSize = Object.keys(keyStorage).filter((key: any) => key.startsWith('accessToken')).length;

      const queryParams = querystring.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: config.tistory.redirectUri,
        grant_type: 'authorization_code',
        output: 'json',
      });

      const url = `${config.tistory.accessTokenUri}?${queryParams}`;
      const result = await axios.get(url);

      const { access_token: accessToken, error: tokenError, error_description: tokenErrorDesc } = result.data;

      if (tokenError) {
        this.socket.sockets.to(sessionId).emit('authStatus', {
          status: 400,
          title: tokenError,
          message: tokenErrorDesc,
          uuid: requestUuid
        });

        throw createError.BadRequest(tokenErrorDesc);
      }

      await this.redis.hmsetAsync(storageId, `accessToken:${requestUuid}`, accessToken);

      this.socket.sockets.to(sessionId).emit('authStatus', {
        status: 200,
        type: hasAccessToken ? 'renew' : 'new',
        uuid: requestUuid,
        clientId: clientId.slice(0, 15) + clientId.slice(16).replace(/(?<=.{0})./gi, "*"),
      });

      const newToken = accessTokenSize ? '' : this.generateToken({
        storageId: storageId,
      });

      return { newToken };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}

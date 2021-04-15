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
      expiresIn: '30d', // expires in 30 days
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
    // Return object after clientId duplicate check
    const duplicateKeyObj = keyStorage ? Object.keys(keyStorage).find(key => keyStorage[key] === clientId) : '';

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

    auth.state = uuid;
    auth.storageId = storageId;

    return auth;
  }

  public async authentication(tistoryAuth: ITistoryAuth): Promise<{ redirectUri: string }> {
    try {
      const auth = await this.setStorage(tistoryAuth);

      const { uuid, clientId, state } = auth;

      const encryptState = crypto.encrypt({ state });
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
      let { storageId } = tistoryAuth;
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

      const { state: requestUuid } = crypto.decrypt(state.replace(/ /g, '+'));

      if(!requestUuid) {
        throw createError.BadRequest('Authorization code invalid');
      }

      const hasKey = !!(storageId && (await this.redis.existsAsync(storageId)));
      storageId = hasKey ? storageId : requestUuid;

      const clientKeys = await this.redis.hgetallAsync(storageId);

      const clientId = clientKeys[`clientId:${requestUuid}`]
      const clientSecret = clientKeys[`clientSecret:${requestUuid}`]

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
          clientId: requestUuid
        });

        throw createError.BadRequest(tokenErrorDesc);
      }

      await this.redis.hmsetAsync(storageId, `accessToken:${requestUuid}`, accessToken);

      this.socket.sockets.to(sessionId).emit('authStatus', {
        status: 204,
        uuid: requestUuid,
        clientIdPrefix: clientId.slice(0, 15),
        clientIdSuffix: clientId.slice(16).replace(/(?<=.{0})./gi, "*")
      });

      const newToken = this.generateToken({
        storageId: storageId,
      });

      return { newToken };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}

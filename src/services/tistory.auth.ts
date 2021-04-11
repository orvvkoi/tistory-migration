import jwt from 'jsonwebtoken';
import { Service, Inject } from 'typedi';
import querystring from 'querystring';
import { v4 as uuidv4 } from 'uuid';
import CryptoUtils from '../utils/CryptoUtils';
import config from '../config';
import { ITistoryAuth } from '../interfaces/ITistory';
import RequestUtils from '../utils/RequestUtils';

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

    storageId = hasKey ? storageId : uuidv4().replace(/-/g, '');
    uuid = hasKey ? uuidv4().replace(/-/g, '') : storageId;

    /*  const keyStorage = hasKey && await this.redis.hgetallAsync(uuid);
      this.logger.debug(`OAuthService setStorage keyStorage : %o`, keyStorage); */

    const newData: { [key: string]: string } = {
      [`clientId.${uuid}`]: clientId,
      [`clientSecret.${uuid}`]: clientSecret,
    };
    this.logger.debug(`OAuthService setStorage newData : %o`, newData);
    this.logger.debug(`OAuthService setStorage storageId : %o`, storageId);

    await this.redis.hmsetAsync(storageId, newData);

    auth.state = uuid;
    auth.storageId = storageId;

    return auth;
  }

  public async authentication(tistoryAuth: ITistoryAuth): Promise<{ redirectUri: string }> {
    try {
      const auth = await this.setStorage(tistoryAuth);

      const { uuid, clientId, callbackUrl, state } = auth;

      const encryptState = CryptoUtils.encrypt({ state });
      this.logger.debug('authentication encrypt encryptState %s', encryptState);

      const queryParams = querystring.stringify({
        client_id: clientId,
        redirect_uri: callbackUrl,
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
      const { socketId, state } = tistoryAuth;
      const { code, error, error_reason: errorReason } = tistoryAuth;


      if (error) {
        this.logger.error('authorization error : %s %s' ,error, errorReason);

        this.socket.to(socketId).emit('auth_status', {
          status: 'fail'
        });

        throw new Error(errorReason);
      }

      const { state: requestClientId } = CryptoUtils.decrypt(state.replace(/ /g, '+'));
      this.logger.debug('authorization requestClientId %s', requestClientId);

      const hasKey = !!(storageId && (await this.redis.existsAsync(storageId)));
      storageId = hasKey ? storageId : requestClientId;

      const clientKeys = await this.redis.hgetallAsync(storageId);

      const queryParams = querystring.stringify({
        client_id: clientKeys[`clientId.${requestClientId}`],
        client_secret: clientKeys[`clientSecret.${requestClientId}`],
        code,
        redirect_uri: config.tistory.redirectUri,
        grant_type: 'authorization_code',
        output: 'json',
      });

      const url = `${config.tistory.accessTokenUri}?${queryParams}`;
      this.logger.debug(`authorization accessTokenUri : %s`, url);

      console.log("url ", url);
      const result = await RequestUtils.get(url);

      const { access_token: accessToken, error: tokenError, error_description: errorDescription } = result.data;

      if (tokenError) {
        this.logger.error(`authorization tokenError : %s %s`, tokenError, tokenError);

        this.socket.to(socketId).emit('auth_status', {
          status: 'fail',
          clientId: requestClientId
        });

        throw new Error(errorDescription);
      }

      await this.redis.hmsetAsync(storageId, `accessToken.${requestClientId}`, accessToken);

      this.socket.to(socketId).emit('auth_status', {
        status: 'success',
        clientId: requestClientId
      });

      console.log('token.storageId 33 ', storageId);
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

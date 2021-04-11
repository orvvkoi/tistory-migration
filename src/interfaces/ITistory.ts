import { IMigration } from './IMigration';
import { Joi } from 'celebrate';

export interface ITistoryAuthError {
  error?: any;
  // eslint-disable-next-line camelcase
  error_reason?: any;
  // eslint-disable-next-line camelcase
  error_description?: any;
}

export interface ITistoryAuth extends Partial<ITistoryAuthError> {
  storageId?: string;
  uuid?: string;
  socketId?:string;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
  accessToken?: string;
  state?: string;
  code?: any;
}


export interface ITistoryApiDTO extends Partial<ITistoryAuth> {
  blogName?: string;
  postId?: number;
  title?: string;
  content?: string;
  category?: number;
  categoryId?: number;
  slogan?: string;
  tag?: string;
  acceptComment?: number;
  published?: string;
  page?: number;
}

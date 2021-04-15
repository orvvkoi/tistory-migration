export interface ITistoryAuthError {
  error?: any;
  error_reason?: any;
  error_description?: any;
}

export interface ITistoryAuth extends Partial<ITistoryAuthError> {
  sessionId?: string;
  storageId?: string;
  uuid?: string;
  clientId?: string;
  clientSecret?: string;
  state?: string;
  code?: any;
}

export interface ITistoryApi extends Partial<ITistoryAuthError> {
  accessToken: string;
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

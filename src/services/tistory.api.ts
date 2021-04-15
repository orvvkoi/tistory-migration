import createError from 'http-errors';
import { Service, Inject } from 'typedi';
import querystring from 'querystring';
import config from '../config';
import { ITistoryApi } from '../interfaces/ITistory';
import axios from '../utils/axios';

@Service('TistoryService')
export default class TistoryService {
  constructor(
    @Inject('logger') private logger,
  ) {
  }

  public async getBlogInfo(tistoryApiDTO: ITistoryApi) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/blog/info?${queryParams}`;

      const data = await axios.get(url);

      return this.parser(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getCategoryList(tistoryApiDTO: ITistoryApi) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        blogName: tistoryApiDTO.blogName,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/category/list?${queryParams}`;

      const data = await axios.get(url);
      const { categories } = this.parser(data);

      return categories;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getPostList(tistoryApi: ITistoryApi) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApi.accessToken,
        blogName: tistoryApi.blogName,
        page: tistoryApi.page,
        count: 30,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/post/list?${queryParams}${
        tistoryApi.categoryId ? `&categoryId=${tistoryApi.categoryId}` : ``
      }`;

      const data = await axios.get(url);

      const { posts, page, count, totalCount } = this.parser(data);

      return { posts, page, count, totalCount };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getPost(tistoryApiDTO: ITistoryApi) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        blogName: tistoryApiDTO.blogName,
        postId: tistoryApiDTO.postId,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/post/read?${queryParams}`;

      const data = await axios.get(url);

      return this.parser(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async setPost({
                         accessToken,
                         blogName,
                         title = '',
                         content = '',
                         category = 0,
                         slogan = '',
                         tag = '',
                         acceptComment = 1,
                         published = '',
                       }: ITistoryApi) {
    try {
      const queryParams = querystring.stringify({
        access_token: accessToken,
        blogName,
        title: encodeURI(title),
        content: encodeURI(content),
        category,
        slogan,
        tag,
        acceptComment,
        published,
        visibility: 3,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/post/write`;

      const data = await axios.post(url, queryParams);

      return this.parser(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  private parser(res) {
    try {
      const data = res && res.data && typeof res.data !== 'object' ? JSON.parse(res.data).tistory : res.data.tistory;

      const status = data.status ? parseInt(data.status, 10) : '';
      if (status === 200) {
        return data.item || data;
      }

      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}

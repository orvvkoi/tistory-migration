import { Service, Inject } from 'typedi';
import querystring from 'querystring';
import config from '../config';
import { ITistoryApiDTO } from '../interfaces/ITistory';
import RequestUtils from '../utils/RequestUtils';

@Service('TistoryService')
export default class TistoryService {
  constructor(
    @Inject('logger') private logger,
  ) {
  }

  public async getBlogInfo(tistoryApiDTO: ITistoryApiDTO) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/blog/info?${queryParams}`;

      const data = await RequestUtils.get(url);

      return this.parser(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getCategoryList(tistoryApiDTO: ITistoryApiDTO) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        blogName: tistoryApiDTO.blogName,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/category/list?${queryParams}`;

      const data = await RequestUtils.get(url);

      return this.parser(data);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getPostList(tistoryApiDTO: ITistoryApiDTO) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        blogName: tistoryApiDTO.blogName,
        page: tistoryApiDTO.page,
        count: 30,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/post/list?${queryParams}${
        tistoryApiDTO.categoryId ? `&categoryId=${tistoryApiDTO.categoryId}` : ``
      }`;

      const data = await RequestUtils.get(url);

      const { posts, page, count, totalCount } = this.parser(data);

      return { posts, page, count, totalCount };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getPost(tistoryApiDTO: ITistoryApiDTO) {
    try {
      const queryParams = querystring.stringify({
        access_token: tistoryApiDTO.accessToken,
        blogName: tistoryApiDTO.blogName,
        postId: tistoryApiDTO.postId,
        output: 'json',
      });

      const url = `${config.tistory.baseUri}/post/read?${queryParams}`;

      const data = await RequestUtils.get(url);

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
                       }: ITistoryApiDTO) {
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

      const url = `${config.tistory.baseUri}/post/write?${queryParams}`;

      const data = await RequestUtils.get(url);

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

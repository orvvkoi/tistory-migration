import createError from 'http-errors';
import { Service, Inject } from 'typedi';
import { ITistoryApi, IMigrationDTO } from '../interfaces';
import TistoryService from './tistory.api';

@Service()
export default class MigrationService {
  constructor(
    @Inject('TistoryService')
    private readonly tistoryService: TistoryService,
    @Inject('redis')
    private redis,
    @Inject('logger')
    private logger,
    @Inject('socket')
    private socket,
  ) {
  }

  public async getBlogList(migrationDTO: IMigrationDTO): Promise<object[]> {
    try {
      const { clientKeys } = migrationDTO;

      const promises: object[] = clientKeys.map(async (storage: any) => {
        const { uuid, clientId, accessToken } = storage;

        if (accessToken) {
          let params: ITistoryApi = {
            accessToken,
          };

          let blogInfo = await this.tistoryService.getBlogInfo(params);
          blogInfo = { uuid, ...blogInfo };

          return blogInfo;
        }

        return false;
      });

      const blogInfos: any[] = await Promise.all(promises);

      const blogs = [];

      if (blogInfos) {
        blogInfos.forEach((blogInfo) => {
          const blogId = blogInfo.id;

          let arrBlog = blogInfo.blogs;

          if (arrBlog && arrBlog.length) {
            arrBlog = arrBlog.reduce((unique, curr) => {
              let o = curr;

              if (!unique.some((blog) => blog.blogId === o.blogId)) {
                const postCount = o.statistics && o.statistics.post ? parseInt(o.statistics.post, 10) : 0;

                o = {
                  uuid: blogInfo.uuid,
                  blogName: o.name,
                  folder: true,
                  lazy: postCount > 0,
                  isBlog: true,
                  checkbox: false,
                  ...o,
                };

                unique.push(o);
              }
              return unique;
            }, []);

            blogs.push({
              uuid: blogInfo.uuid,
              title: blogId,
              folder: true,
              expanded: true,
              lazy: true,
              checkbox: false,
              children: arrBlog,
            });
          }
        });
      }

      return blogs;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getCategoryList(migrationDTO: IMigrationDTO): Promise<object[]> {
    try {
      const { uniqueKey, clientKeys } = migrationDTO;
      const { uuid, blogName } = uniqueKey as any;

      let responses = [];

      this.logger.debug('getCategoryList: [uuid] %s, [blogName] %s ', uuid, blogName);

      const { accessToken } = clientKeys.find(keys => keys['uuid'] === uuid);

      if (accessToken) {
        let tistoryApi: ITistoryApi = { accessToken, blogName };

        let categoryList: any = await this.tistoryService.getCategoryList(tistoryApi);

        if (categoryList) {
          categoryList = categoryList.map((category) => {
            let item = { ...category };
            const entries = parseInt(item.entries, 10);
            const hasPost = entries > 0;

            item = {
              uuid,
              blogName,
              categoryId: item.id,
              folder: true,
              lazy: hasPost,
              expanded: hasPost,
              isCategory: true,
              checkbox: false,
              title: `${item.name}`,
              ...item,
            };

            return item;
          });

          const ids = categoryList.map((x) => x.id);
          responses = categoryList
            .map((category) => {
              const item = { ...category };

              const children = categoryList.filter((child) => {
                if (child.id !== child.parent && child.parent === item.id) {
                  return child;
                }

                return false;
              });

              if (children && children.length) {
                item.children = children;
              }

              return item;
            })
            .filter((obj) => obj.id === obj.parent || !ids.includes(obj.parent));
        }
      }

      return responses;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getPostList(migrationDTO: IMigrationDTO): Promise<object[]> {
    try {
      const { uniqueKey, clientKeys, page = 1 } = migrationDTO;
      const { uuid, categoryId, blogName } = uniqueKey as any;

      let responses = [];

      const { accessToken } = clientKeys.find(keys => keys['uuid'] === uuid);

      if (accessToken) {
        let tistoryApi: ITistoryApi = { accessToken, blogName, page, categoryId };

        const {
          posts: postList,
          page: currentPage,
          totalCount,
        }: { posts: any; page: number; totalCount: number } = await this.tistoryService.getPostList(tistoryApi);

        const postsLength = postList ? postList.length : 0;

        if (postsLength) {
          responses = postList.map((item) => {
            let post = { ...item };

            post = {
              uuid,
              blogName,
              postId: post.id,
              ...post,
            };

            return post;
          });

          if (totalCount % postsLength > 0) {
            responses.push({
              uuid,
              blogName,
              categoryId,
              statusNodeType: 'paging',
              icon: false,
              page: Number(currentPage) + 1,
            });
          }
        }
      }

      return responses;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async progress(migrationDTO: IMigrationDTO): Promise<{ migrationSuccess: any; migrationFail: any }> {
    try {
      const { clientKeys, uniqueKeys, targetUniqueKey, sessionId } = migrationDTO;
      const { uuid: targetUUID, categoryId: targetCategoryId, blogName: targetBlogName } = targetUniqueKey as any;
      const { accessToken: targetAccessToken } = clientKeys.find(keys => keys['uuid'] === targetUUID);

      const requestCount = uniqueKeys.length;

      const promises = uniqueKeys.map(async (uniqueKey, index) => {
        // If you request without delay, an error occurs.
        const delay = 2000 * index;

        const { uuid, blogName, postId } = uniqueKey as any;

        const { accessToken } = clientKeys.find(keys => keys['uuid'] === uuid);

        const post = await this.tistoryService.getPost({ accessToken, blogName, postId } as ITistoryApi);

        const { title, date: published, acceptComment, slogan } = post;

        const tags = (() => {
          if (post.tags && post.tags.tag) {
            return post.tags.tag.join(',');
          }
          return '';
        })();

        let { content } = post;

        content = content.replace(/&quot;/g, '\'').replace(/&nbsp;/g, '');

        await new Promise((r) => setTimeout(r, delay));

        let postPrams: ITistoryApi = {
          accessToken: targetAccessToken,
          blogName: targetBlogName,
          title,
          content,
          categoryId: targetCategoryId,
          slogan,
          tag: tags,
          acceptComment,
          published,
        };

        const result = await this.tistoryService.setPost(postPrams);
        this.logger.info('migration setPost result : %o', result);

        const statusCode = result && result.status ? parseInt(result.status, 10) : 400;

        const socketResponse: {
          totalCount: number;
          originTitle: string;
          originPostId: number;
          originBlogName: string;
          targetBlogName: string;
          targetCategoryId: number;
          statusCode: number;
          targetPostId?: number;
          url?: string;
          progress?: number;
        } = {
          totalCount: requestCount,
          originTitle: title,
          originPostId: postId,
          originBlogName: blogName,
          targetBlogName,
          targetCategoryId,
          statusCode,
        };

        if (statusCode === 200) {
          socketResponse.targetPostId = result.postId;
          socketResponse.url = result.url;
          socketResponse.progress = index + 1;
        }

        this.socket.sockets.to(sessionId).emit('migrationProgress', socketResponse);

        return result;
      });

      const responses = await Promise.all(promises);

      // https://stackoverflow.com/questions/38860643/split-array-into-two-different-arrays-using-functional-javascript
      const bifilter = (f, xs) =>
        xs.reduce(
          ([T, F], x, i, arr) => {
            if (f(x, i, arr) === false) return [T, [...F, x]];
            return [[...T, x], F];
          },
          [[], []],
        );

      const [migrationSuccess, migrationFail] = bifilter((post) => post && post.status === 200, responses);

      return {
        migrationSuccess,
        migrationFail,
      };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async deleteToken(migrationDTO: IMigrationDTO): Promise<{ deleteResult: boolean; remainTokenSize: number; }> {
    try {

      const { storageId, uuid } = migrationDTO;
      const hasKey = await this.redis.existsAsync(storageId);

      if (!hasKey) {
        throw createError.BadRequest();
      }

      /**
       *  await this.redis.hrmAsync(storageId, '*:' + uuid);
       *  hrm. enterprise 6.0 부터 지원.
       *
       *  hsacn으로 대체
       *  cursor가 0 이상인 경우 데이터 적재 문제.
       */
      const [matchedCursor, matchedResults] = await this.redis.send_commandAsync('HSCAN', [storageId, 0, 'MATCH', '*:' + uuid, 'COUNT', 6]);

      if (matchedCursor > 0) {
        this.logger.error('deleteToken storageId, uuid, cursor %s %s %d ', storageId, uuid, matchedCursor);
      }

      if (!matchedResults || !matchedResults.length) {
        throw createError.BadRequest(`Data that doesn't exist.`);
      }

      /**
       * matchedResults가 [key, value, key, value] 형태임으로
       * filed만 추려냄
       */
      const matchedFields = matchedResults.filter(function(d) {
        return /clientId:|clientSecret:|accessToken:/.test(d);
      });
      this.logger.debug('matchedFields %s', matchedFields);

      const deletedFieldCount: number = await this.redis.hdelAsync(storageId, matchedFields);
      const deleteResult = deletedFieldCount > 0;

      const [tokenCursor, remainTokens] = await this.redis.send_commandAsync('HSCAN', [storageId, 0, 'MATCH', 'accessToken:*', 'COUNT', 2]);
      const remainTokenSize = remainTokens.length;

      /**
       * accessToken: 이 없는 storage 라면
       * storage 를 파기함.
       */
      if (!remainTokenSize) {
        this.redis.delAsync(storageId);
      }

      return { deleteResult, remainTokenSize };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}

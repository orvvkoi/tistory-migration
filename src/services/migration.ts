import CryptoUtils from '../utils/CryptoUtils';
import Tistory from './tistory';
import { Service, Inject } from 'typedi';
import { IAuth, IAuthInputDTO } from '../interfaces/IAuth';


@Service()
export default class MigrationService {
    constructor(
        @Inject('logger') private logger,
        @Inject('socketio') private socketio
    ) {
    }

    public async getBlogList(auth: IAuth): Promise<object[]> {
        try {
            const storageData = auth.storageData;

            const promises = Object.values(storageData)
                .filter((storage: any) => storage.accessToken)
                .map(async (storage: any) => {
                    const { clientId, accessToken } = storage;

                    if (accessToken) {
                        let blogInfo = await Tistory.getBlogInfo(accessToken);

                        blogInfo = { clientId, ...blogInfo };
                        return blogInfo;
                    }

                    return false;
                });

            const blogInfos = await Promise.all(promises);

            const blogs = [];

            if (blogInfos) {

                blogInfos.forEach((blogInfo) => {
                    const blogId = blogInfo.id;

                    let arrBlog = blogInfo.blogs;

                    if (arrBlog && arrBlog.length) {
                        arrBlog = arrBlog.reduce((unique, curr) => {
                            let o = curr;

                            if (!unique.some((blog) => blog.blogId === o.blogId)) {
                                const uniqueKey = CryptoUtils.encrypt({
                                    clientId: blogInfo.clientId,
                                    blogName: o.name
                                });

                                const postCount =
                                    o.statistics && o.statistics.post
                                        ? parseInt(o.statistics.post, 10)
                                        : 0;

                                o = {
                                    uniqueKey,
                                    folder: true,
                                    lazy: postCount > 0,
                                    isBlog: true,
                                    checkbox: false,
                                    ...o
                                };

                                unique.push(o);
                            }
                            return unique;
                        }, []);

                        blogs.push({
                            title: blogId,
                            folder: true,
                            expanded: true,
                            lazy: true,
                            checkbox: false,
                            children: arrBlog
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

    public async getCategoryList(auth: IAuth): Promise<object[]> {
        try {
            const { uniqueKey, storageData } = auth;
            const { clientId, blogName } = CryptoUtils.decrypt(uniqueKey);

            let responses = [];

            console.log("uniqueKey, clientId, blogName ",uniqueKey, clientId, blogName)
            const { accessToken } = storageData[clientId];
            if (accessToken) {
                let categoryList = await Tistory.getCategoryList(
                    accessToken,
                    blogName
                );

                if (categoryList) {
                    categoryList = categoryList.map((category) => {
                        let item = { ...category };
                        const entries = parseInt(item.entries, 10);
                        const hasPost = entries > 0;

                        const uniqueKey = CryptoUtils.encrypt({
                            clientId,
                            categoryId: item.id,
                            blogName
                        });

                        item = {
                            uniqueKey,
                            folder: true,
                            lazy: hasPost,
                            expanded: hasPost,
                            isCategory: true,
                            checkbox: false,
                            title: `${item.name}`,
                            ...item
                        };

                        return item;
                    });

                    const ids = categoryList.map((x) => x.id);
                    responses = categoryList
                        .map((category) => {
                            const item = { ...category };

                            const children = categoryList.filter((child) => {
                                if (
                                    child.id !== child.parent &&
                                    child.parent === item.id
                                ) {
                                    return child;
                                }

                                return false;
                            });

                            if (children && children.length) {
                                item.children = children;
                            }

                            return item;
                        })
                        .filter(
                            (obj) => obj.id === obj.parent || !ids.includes(obj.parent)
                        );
                }
            }

            return responses;
        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }
    public async getPostList(auth: IAuth): Promise<object[]> {
        try {
            const { uniqueKey, storageData, page } = auth;
            const { clientId, categoryId, blogName } = CryptoUtils.decrypt(uniqueKey);

            let responses = [];

            const { accessToken } = storageData[clientId];
            if (accessToken) {
                const {
                    posts: postList,
                    page: currentPage,
                    totalCount
                }: {posts: any; page: number; totalCount: number } = await Tistory.getPostList(
                    accessToken,
                    blogName,
                    page,
                    categoryId
                );
                const postsLength = postList ? postList.length : 0;

                if (postsLength) {
                    responses = postList.map((item) => {
                        let post = { ...item };

                        const postUniqueKey = CryptoUtils.encrypt({
                            clientId,
                            blogName,
                            postId: post.id
                        });

                        post = {
                            uniqueKey: postUniqueKey,
                            ...post
                        };

                        return post;
                    });

                    if (totalCount % postsLength > 0) {
                        const categoryUniqueKey = CryptoUtils.encrypt({
                            clientId,
                            blogName,
                            categoryId
                        });

                        responses.push({
                            title: `<span class='fa fa-plus-circle'>&nbsp;&nbsp;More...</span>`,
                            uniqueKey: categoryUniqueKey,
                            statusNodeType: 'paging',
                            icon: false,
                            page: Number(currentPage) + 1,
                            url: `/migration/posts`
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
    public async progress(auth: IAuth): Promise<{ copySuccess: any; copyFail: any }> {
        try {
            const { uniqueKeys, targetUniqueKey, socketId } = auth;

            const storageData = auth.storageData;

            const {
                clientId: targetClientId,
                categoryId: targetCategoryId,
                blogName: targetBlogName
            } = CryptoUtils.decrypt(targetUniqueKey);

            const targetAccessToken = storageData[targetClientId].accessToken;

            const requestCount = uniqueKeys.length;

            const promises = uniqueKeys.map(async (uniqueKey, index) => {
                // If you request without delay, an error occurs.
                const delay = 2000 * index;

                const { clientId, blogName, postId } = CryptoUtils.decrypt(uniqueKey);

                const { accessToken } = storageData[clientId];
                const post = await Tistory.getPost(
                    accessToken,
                    blogName,
                    postId
                );

                const { title, date: published, acceptComment, slogan } = post;
                const tags = (() => {
                    if (post.tags && post.tags.tag) {
                        return post.tags.tag.join(',');
                    }
                    return '';
                })();

                let { content } = post;

                content = content.replace(/&quot;/g, "'");
                content = content.replace(/&nbsp;/g, '');

                await new Promise((r) => setTimeout(r, delay));

                const result = await Tistory.setPost(
                    targetAccessToken,
                    targetBlogName,
                    title,
                    content,
                    targetCategoryId,
                    slogan,
                    tags,
                    acceptComment,
                    published
                );


                const statusCode = result && result.status ? result.status : 400;
                let socketResponse: {
                    totalCount: number;
                    originTitle: string;
                    originPostId: number,
                    originBlogName: string,
                    targetBlogName: string,
                    targetCategoryId: number,
                    statusCode: number,
                    targetPostId?: number,
                    url?: string,
                    progress?: number,
                } = {
                    totalCount: requestCount,
                    originTitle: title,
                    originPostId: postId,
                    originBlogName: blogName,
                    targetBlogName,
                    targetCategoryId,
                    statusCode,
                };

                if (statusCode === '200') {
                    socketResponse.targetPostId = result.postId;
                    socketResponse.url = result.url;
                    socketResponse.progress = index + 1;
                }

                this.socketio.to(socketId).emit('migration_progress', socketResponse);

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
                    [[], []]
                );

            const [copySuccess, copyFail] = bifilter(
                (post) => post && post.status === '200',
                responses
            );

           return {
               copySuccess,
               copyFail
           }
        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

}
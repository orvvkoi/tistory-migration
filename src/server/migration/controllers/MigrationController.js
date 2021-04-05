import CryptoUtils from '@server/utils/CryptoUtils';

import redis from '@server/redis/redis-server';
import TistoryController from './TistoryController';

const { COOKIE_SCHEME } = process.env;

const migration = async (req, res) => {
    try {

        if (!req.mainClientId) {
            return res.render('index', { step: 1 });
        }

        const storageData = req.storageData;

        const storages = Object.values(storageData).filter((storage) => storage.accessToken);

        if (storages.length) {
            res.render('index', {
                step: 3,
                storages,
            });
        } else {
            res.render('index', { step: 1 });
        }
    } catch(e) {
        res.render('index', { step: 1 });
    }
};

const blogs = async (req, res) => {
    const storageData = req.storageData;

    const promises = Object.values(storageData)
        .filter((storage) => storage.accessToken)
        .map(async (storage) => {
            const { clientId, accessToken } = storage;

            if (accessToken) {
                let blogInfo = await TistoryController.getBlogInfo(accessToken);

                blogInfo = { clientId, ...blogInfo };
                return blogInfo;
            }

            return false;
        });

    const blogInfoList = await Promise.all(promises);

    const responses = [];

    if (blogInfoList) {

        blogInfoList.forEach((blogInfo) => {
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

                responses.push({
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

    res.json(responses);
};

const categories = async (req, res) => {
    const { uniqueKey } = req.query;
    const storageData = req.storageData;
    const { clientId, blogName } = CryptoUtils.decrypt(uniqueKey);

    let responses = [];

    const { accessToken } = storageData[clientId];
    if (accessToken) {
        let categoryList = await TistoryController.getCategoryList(
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

    res.json(responses);
};

const posts = async (req, res) => {
    const { uniqueKey, page } = req.query;
    const storageData = req.storageData;
    const { clientId, categoryId, blogName } = CryptoUtils.decrypt(uniqueKey);

    let responses = [];

    const { accessToken } = storageData[clientId];
    if (accessToken) {
        const {
            posts: postList,
            page: currentPage,
            totalCount
        } = await TistoryController.getPostList(
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
                    page: parseInt(currentPage, 10) + 1,
                    url: `/migration/posts`
                });
            }
        }
    }

    res.json(responses);
};

const progress = async (req, res) => {
    const { uniqueKeys, targetUniqueKey } = req.body;

    if (!uniqueKeys || !targetUniqueKey) {
        return res.render('error', { message: `Required parameters are missing.` });
    }

    const io = req.app.get('socketio');
    const session = req.session;

    const storageData = req.storageData;

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
        const post = await TistoryController.getPost(
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

        const result = await TistoryController.setPost(
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
        const socketResponse = {
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

        io.to(session.socketio).emit('migration_progress', socketResponse);

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

    res.json({
        copySuccess,
        copyFail
    });
};

const MigrationController = {
    migration,
    blogs,
    categories,
    posts,
    progress
};

export default MigrationController;

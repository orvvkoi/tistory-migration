import RequestUtils from '../utils/RequestUtils';

const tistoryJsonParser = (res) => {
    const data =
        res && res.data && typeof res.data !== 'object' ? JSON.parse(res.data).tistory : res.data.tistory;

    const status = data.status ? parseInt(data.status, 10) : '';
    if (status === 200) {
        return data.item || data;
    }

    return data;
};

const getBlogInfo = async (accessToken) => {
    const url = `https://www.tistory.com/apis/blog/info?access_token=${accessToken}&output=json`;

    let data = await RequestUtils.get(url);
    data = tistoryJsonParser(data);

    return data;
};

const getCategoryList = async (accessToken, blogName) => {
    const url = `https://www.tistory.com/apis/category/list?access_token=${accessToken}&output=json&blogName=${blogName}`;

    let data = await RequestUtils.get(url);
    data = tistoryJsonParser(data);

    return data.categories;
};

const getPostList = async (
    accessToken,
    blogName,
    page = 1,
    categoryId = ''
) => {
    const url = `https://www.tistory.com/apis/post/list?access_token=${accessToken}&blogName=${blogName}&page=${page}&output=json&count=30${
        categoryId ? `&categoryId=${categoryId}` : ``
    }`;

    let data = await RequestUtils.get(url);
    data = tistoryJsonParser(data);

    const { count } = data;
    const { totalCount } = data;
    const { posts } = data;

    return {
        posts,
        page,
        count,
        totalCount
    };
};

const getPost = async (accessToken, blogName, postId) => {
    const url = `https://www.tistory.com/apis/post/read?access_token=${accessToken}&output=json&blogName=${blogName}&postId=${postId}`;

    let data = await RequestUtils.get(url);
    data = tistoryJsonParser(data);

    return data;
};

const setPost = async (
    accessToken,
    blogName,
    title = '',
    content = '',
    category = 0,
    slogan = '',
    tag = '',
    acceptComment = 1,
    published = ''
) => {
    const url = `https://www.tistory.com/apis/post/write`;
    const params = `access_token=${accessToken}&output=json&blogName=${blogName}&title=${encodeURI(title)}&content=${encodeURI( content)}&visibility=3&category=${category}&slogan=${slogan}&tag=${tag}&acceptComment=${acceptComment}&published=${published}`;

    let data = await RequestUtils.post(url, params);
    data = tistoryJsonParser(data);

    return data;
};

const Tistory = {
    getBlogInfo,
    getCategoryList,
    getPostList,
    getPost,
    setPost
};

export default Tistory;

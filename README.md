# TISTORY MIGRATION
티스토리의 복수개 계정이나 복수개의 블로그로부터 특정 블로그로 게시물을 복사하기 위한 용도.
## 개발 목적

재미와 개인 편의를 위한 프로젝트.
1500개 가량의 게시물을 특정 블로그로 옮기기 위해 만들어졌습니다.
cron으로 만들면 쉬우나, 티스토리는 하루에 등록 가능한 게시물이 30개로 제한 되어 있고, 
무엇보다 카테고리 구분이나, 특정 제목을 기준으로 필터링하여 게시할 필요가 있었습니다.

## 적용된 기술
- [bulletproof-nodejs]
- [socket.io]
- [redis]
- [jsonwebtoken] 
- [node.js]
- [Express] 
- [pug] 
- [jQuery]


## Installation
node 버전 v14.15.3에서 작성되었습니다.
redis가 설치되어 있어야 합니다.

```sh
cd tistory-migration
npm i
```

## Development
For Development
```sh
npm run dev
```

#### Building for source

For production release:

```sh
npm run start
```


[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

   [bulletproof-nodejs]:<https://github.com/santiq/bulletproof-nodejs>
   [socket.io]: <https://socket.io/r>
   [redis]: <https://redis.io/>
   [jsonwebtoken]: <https://github.com/auth0/node-jsonwebtoken#readme>
   [pug]: <https://pugjs.org/api/getting-started.html>
   [node.js]: <http://nodejs.org>
   [jQuery]: <http://jquery.com>
   [express]: <http://expressjs.com>

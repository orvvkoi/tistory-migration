$(function() {
  const socket = io({
    transports: [
      'websocket',
      'polling'
    ]
  });

  socket.on('serv:ping', function(response) {
    console.log('serv:ping : ', response);
  });

  socket.on('authStatus', function(response) {
    if (response) {
      const { status, type = '' } = response;
      if (status > 300) {
        UTIL.modal.alert(response.message, response.title || '');
        return;
      }

      if(type === 'new') {
        viewRender([response]);
      }
    }
  });

  socket.on('expireNotification', function(response) {
    UTIL.modal.alert(response.message, response.title);
  });

  socket.on('migrationProgress', function(response) {
    let $successCount = $('#successCount');
    let successCount = response.progress || parseInt($successCount.text());
    let originTitle = response.originTitle;
    let originPostId = response.originPostId;
    let originBlogName = response.originBlogName;
    let targetBlogName = response.targetBlogName;
    let targetCategoryId = response.targetCategoryId;
    let targetPostId = response.targetPostId;
    let statusCode = response.statusCode;

    let $progressStatus = $('#progressStatus' + originPostId);
    let $progressResult = $('#progressResult' + originPostId);
    if (statusCode === 200) {
      let blogKey = originBlogName;
      let migrationHistory = UTIL.LocalStorage.get(blogKey) || {};

      let targetBlog = migrationHistory[targetBlogName];

      if (targetBlog) {
        let targetCategory = targetBlog[targetCategoryId] || [];
        targetCategory[originPostId] = targetCategory[originPostId] || [];

        targetCategory[originPostId] = [...[targetPostId], ...targetCategory[originPostId]];
        migrationHistory[targetBlogName][targetCategoryId] = targetCategory;
      } else {
        migrationHistory[targetBlogName] = {
          [targetCategoryId]: {
            [originPostId]: [targetPostId],
          },
        };
      }

      UTIL.LocalStorage.set(blogKey, migrationHistory);

      $successCount.text(successCount);
      $progressStatus.html(`<div class='fa fa-check fa-2x fa-fw' style='color: #78b13f;'></div>`);
      $progressResult.html(`<a href='${response.url}' target='popup'>${response.url}</a>`);
    } else {
      // progressRequest.abort();

      $progressStatus.html(`<div class='fas fa-exclamation-circle fa-2x fa-fw' style='color:red;'> </div>`);
      $progressResult.html(`하루에 새롭게 공개 발행할 수 있는 글은 최대 30 개까지입니다.`);
    }
  });
});


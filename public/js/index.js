const openDialog = function(uri, name, options, closeCallback) {
  const win = window.open(uri, name, options);
  const interval = window.setInterval(function() {
    try {
      if (win == null || win.closed) {
        window.clearInterval(interval);
        closeCallback(win);
      }
    } catch (e) {
      window.clearInterval(interval);
    }
  }, 1000);
  return win;
};

const viewRender = function(tokens) {
  if (!tokens) {
    return;
  }

  for (const token of tokens) {
    const { uuid, clientId } = token;
    const $tokenSection = $('.token-list-section');

    if (!$tokenSection.find('#tokenList').length) {
      $tokenSection.append(`<ul id='tokenList' class='token-list'></ul>`);
    }

    const $tokenList = $('#tokenList');
    $tokenList.append(
      $(`<li>${clientId.substring(0, clientId.indexOf('*'))}<span class='asterisk'>${clientId.substring(clientId.indexOf('*'))}</span><span class='close' data-id='delToken' data-uuid='${uuid}'>x</span></li>`).hide().fadeIn('slow'),
    );
  }

  treeSourceHandler(tokens);
};

const treeSourceHandler = function(tokens) {
  const $originTree = $.ui.fancytree.getTree("#originTree");

  if(tokens) {
    $originTree.options.source = { url: '/api/migration/blogs', cache: false };
  } else {
    $originTree.options.source = [];
  }

  $originTree.reload();
}

$(function() {
  const req = UTIL.ajax.get('/api/migration/tokens');
  req.done((tokens) => {
    viewRender(tokens);
  });

  const jForm = $('#form');
  const jBtnGetToken = $('#btnGetToken');

  const formLoadingToggle = (isLoading) => {
    const btnText = jBtnGetToken.text();
    const isDisabled = jBtnGetToken.hasClass('disabled');

    // isLoading, isDisabled 둘다 true인 경우 로딩중.
    if (isLoading && isDisabled) {
      return;
    }

    if (isLoading) {
      jBtnGetToken.addClass('disabled btn-wait').html(`<i class='fa fa-spinner fa-spin'></i> ${btnText}`);
      jForm.find('input').prop('disabled', true);
    } else {
      jBtnGetToken.removeClass('disabled btn-wait').text(`${btnText}`);
      jForm.find('input').prop('disabled', false);
    }
  };

  jForm.validate({
    normalizer: function(value) {
      return $.trim(value);
    },
    rules: {
      clientId: {
        required: true,
      },
      clientSecret: {
        required: true,
      },
    },
    errorPlacement: function(error, element) {
      // $(element).after(error);
      return;
    },
    // unhighlight ?
    onfocusout: function(element) {
      $(element).removeClass('error-class');
    },
    highlight: function(element) {
      $(element).addClass('error-class');
      formLoadingToggle(false);
    },

  });

  jBtnGetToken.on('click', function(e) {
    e.preventDefault();

    const _this = $(this);

    if (!jForm.valid() || _this.hasClass('disabled')) {
      return;
    }

    const queryString = jForm.serialize();
    const url = `/api/auth/tistory?${queryString}`;

    openDialog(url, 'auth', '', function() {
      formLoadingToggle(false);
    });

    formLoadingToggle(true);
  });

  $(document).on('click', '[data-id="delToken"]', function(e) {
    e.preventDefault();
    const _this = $(this);

    const uuid = _this.data('uuid');

    _this.addClass('disabled btn-wait').html(`<i class='fa fa-spinner fa-spin'></i>`);

    const req = UTIL.ajax.delete(`/api/migration/tokens/${uuid}`);

    req.done(res => {
      if (res.result) {
        _this.closest('li').hide('slow', function() {
          _this.remove();
        });

        treeSourceHandler(res.remainTokenSize);
        return;
      }

      _this.removeClass('disabled btn-wait').text(`x`);
    }).fail(err => {
      _this.removeClass('disabled btn-wait').text(`x`);
    });

  });

});

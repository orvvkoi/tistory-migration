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

const treeSourceHandler  = () => {
  const { tokens } = tokenStore.getState();

  const $originTree = $.ui.fancytree.getTree('#originTree');

  if (tokens && tokens.length) {
    $originTree.options.source = { url: '/api/migration/blogs', cache: false };
  } else {
    $originTree.options.source = [];
  }

  $originTree.reload();
};

const viewRender = () => {
  const { tokens } = tokenStore.getState();

  if(tokens) {
    $('#tokenList').html(
      tokens.map(token => {
        const { uuid, clientId } = token;
        return `<li data-id='${uuid}'>
                    ${clientId.substring(0, clientId.indexOf('*'))}
                    <span class='asterisk'>${clientId.substring(clientId.indexOf('*'))}</span>
                    <span class='close' data-id='delToken' data-uuid='${uuid}'>x</span>
                  </li>`
      })
    );
  }

};

const tokenStore = Redux.createStore(
  tokenReducer
)

tokenStore.subscribe(viewRender);
tokenStore.subscribe(treeSourceHandler);

$(function() {
  const req = UTIL.ajax.get('/api/migration/tokens');
  req.done((tokens) => {
    tokenStore.dispatch({type:'FETCHED_TOKEN_LIST', payload: { tokens } })
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

  $.validator.addMethod('alphanumeric', function(value, element) {
    return this.optional(element) || /^[a-zA-Z0-9]+$/.test(value);
  });

  jForm.validate({
    normalizer: function(value) {
      return $.trim(value);
    },
    rules: {
      clientId: {
        required: true,
        minlength: 30,
        maxlength: 50,
        alphanumeric: true,
      },
      clientSecret: {
        required: true,
        minlength: 70,
        maxlength: 100,
        alphanumeric: true,
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

        tokenStore.dispatch({
          type:'DELETE_TOKEN',
          payload: {
            uuid: uuid,
          }
        })

        return;
      }

      _this.removeClass('disabled btn-wait').text(`x`);
    }).fail(err => {
      _this.removeClass('disabled btn-wait').text(`x`);
    });

  });

});

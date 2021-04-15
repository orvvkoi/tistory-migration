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


$(function() {
  const jForm = $('#form');
  const jBtnGetToken = $('#btnGetToken');

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
    onfocusout: function (element) {
      $(element).removeClass('error-class');
    },
    highlight: function(element) {
      $(element).addClass('error-class');
      formLoadingToggle(false);
    },

  });

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

    _this.addClass('disabled btn-wait').html(`<i class="fa fa-spinner fa-spin"></i>`);

    const req = UTIL.ajax.delete(`/api/migration/tokens/${ uuid }`);

    req.done(res => {
      if(res.result) {
        _this.closest('li').hide('slow', function() {
          _this.remove();
        });

       /* $.ui.fancytree.getTree("#originTree").getRootNode().children.find(o=> o.data.uuid === uuid).remove();
        $.ui.fancytree.getTree("#targetTree").getRootNode().children.find(o=> o.data.uuid === uuid).remove();*/

        $.ui.fancytree.getTree("#originTree").reload();
        return;
      }

      _this.removeClass('disabled btn-wait').text(`x`);
    }).fail(err => {
      _this.removeClass('disabled btn-wait').text(`x`);
    });

  });

});

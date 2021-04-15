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
    highlight: function(element) {
      $(element).addClass('error-class');
      formLoadingToggle(false);
    },
    unhighlight: function(element) {
      $(element).removeClass('error-class');
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
      jBtnGetToken.addClass('disabled btn-wait').html(`<span class='fa fa-spinner fa-spin'></span> ${btnText}`);
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
      console.log('unload');
      formLoadingToggle(false);
    });

    formLoadingToggle(true);
  });

  $(document).on('click', '[data-id="delToken"]', function(e) {
    e.preventDefault();
    const _this = $(this);

    const uuid = _this.data('uuid');

    const req = UTIL.ajax.delete(`/api/migration/tokens/${ uuid }`);

    req.done(res => {

    }).fail(err => {

    });

  });

});

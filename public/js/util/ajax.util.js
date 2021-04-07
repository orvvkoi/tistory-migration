if (!window['UTIL']) window['UTIL'] = {};

(function ($) {
    $.ajaxSetup({ cache: false });

    UTIL.ajax = (() => {
        const context = {
            get: function(url, params)  {
                return this.ajax({
                    type: 'get',
                    url: url,
                    data: params
                });
            },
            post: function(url, params)  {
                return this.ajax({
                    type: 'post',
                    url: url,
                    data: params
                });
            },
            put: function(url, params)  {
                return this.ajax({
                    type: 'put',
                    url: url,
                    data: params
                });
            },
            delete: function(url, params) {
                return this.ajax({
                    type: 'delete',
                    url: url,
                    data: params
                });
            },
            ajax: (options) => {
                let ajaxOption = {
                    type: 'post',
                    cache: false,
                    dataType: "json",
                    contentType: "application/json; charset=utf-8"
                }

                if (['post', 'put', 'delete'].includes(options.type)) {
                    options.data = JSON.stringify(options.data);
                }

                ajaxOption = $.extend(ajaxOption, options);

                return $.ajax(ajaxOption);
            }
        };

        return context
    })();
})(jQuery);
/*

helper.modal = {
    errorAlert : (content) => {
        return $.alert({
            title: 'Error',
            icon: 'fa fa-exclamation-triangle',
            type: 'red',
            boxWidth :'400px',
            useBootstrap: false,
            animation: 'scale',
            content: content,
        });
    }
}*/

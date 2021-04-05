if (!window['UTIL']) window['UTIL'] = {};

(function ($) {
    $.ajaxSetup({ cache: false });

    UTIL.ajax = (() => {
        const context = {
            get: (url, params) => {
                if (params) {
                    return $.get(url, params);
                } else {
                    return $.get(url);
                }
            },
            post: (url, params) => {
                if (params) {
                    return $.post(url, params);
                } else {
                    return $.post(url);
                }

            },
            send: (opts) => {
                return $.ajax(opts);
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

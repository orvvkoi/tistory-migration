if (!window['UTIL']) window['UTIL'] = {};

(function ($) {
    $.ajaxSetup({ cache: false });

    UTIL.ajax = (() => {
        const context = {
            get: function(url, data)  {
                return this.ajax({
                    type: 'GET',
                    url,
                    data
                });
            },
            post: function(url, data)  {
                return this.ajax({
                    type: 'POST',
                    url,
                    data
                });
            },
            put: function(url, data)  {
                return this.ajax({
                    type: 'PUT',
                    url,
                    data
                });
            },
            delete: function(url, data) {
                return this.ajax({
                    type: 'DELETE',
                    url,
                    data
                });
            },
            patch: function(url, data) {
                return this.ajax({
                    type: 'PATCH',
                    url,
                    data
                });
            },
            head: function(url) {
                return this.ajax({
                    type: 'HEAD',
                    url: url
                });
            },
            ajax: (options) => {
                const allowMethod = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].includes(options.type);

                if (allowMethod) {
                    options.data = JSON.stringify(options.data);
                    options.headers = {
                        'X-HTTP-Method-Override': options.type
                    }

                    options.type = 'POST';
                }

                let ajaxOption = {
                    cache: false,
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    headers: {
                        'X-HTTP-Method-Override': options.type
                    }
                }

                ajaxOption = $.extend(ajaxOption, options);

                return $.ajax(ajaxOption);
            }
        };

        return context
    })();
})(jQuery);

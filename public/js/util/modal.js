if (!window['UTIL']) window['UTIL'] = {};

(function ($) {
    UTIL.modal = (() => {
        const context = {
            alert: function(content, title)  {
                if(!content) {
                    return;
                }

                return $.alert({
                    title: title || 'Something went wrong',
                    icon: 'fas fa-exclamation',
                    type: 'dark',
                    boxWidth: '400px',
                    useBootstrap: false,
                    animation: 'scale',
                    content: content,
                });
            },
            error: function(content, title) {
                if(!content && !title) {
                    return;
                }

                return $.alert({
                    title: 'Error',
                    icon: 'fa fa-exclamation-triangle',
                    type: 'red',
                    boxWidth :'400px',
                    useBootstrap: false,
                    animation: 'scale',
                    content: `${title}<hr>${content}`,
                });
            }
        };

        return context
    })();
})(jQuery);

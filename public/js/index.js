var openDialog = function(uri, name, options, closeCallback) {
    var win = window.open(uri, name, options);
    var interval = window.setInterval(function() {
        try {
            if (win == null || win.closed) {
                window.clearInterval(interval);
                closeCallback(win);
            }
        }
        catch (e) {
        }
    }, 1000);
    return win;
}

$(function() {
    const socket = io();

    socket.on('connection:sid', function(socketId) {
        // Set socketId to your cookies, or global variable
        console.log("socketId ", socketId);

      //  sessionStorage.setItem('SID', socketId);
    });

    socket.on("auth_status", function(response) {
        if(response) {
            const form = $("form:visible");
            const index = pageHandler(form).index;

            if(response.status === "success") {
                const step2 = $("div.modal-body.modal-body-step-2");
                const list = step2.find("div.layout-description.tal ul");
                if(list.length) {
                    list.append(`<li>${response.clientId}</li>`);
                } else {
                    step2.find("div.layout-description").after(`<div class="layout-description tal">client id list.<ul><li>${response.clientId}</li></ul></div>`);
                }
                if(index === 0) {
                    setTimeout(() => {
                        pageHandler(form).move();
                    },800);
                } else if(index === 1) {
                    form.find("#btnAdd").removeClass("disabled btn-wait").html(`<i class='fas fa-plus mr-5'></i>add to storage`);
                    form.find("input").prop("disabled", false);
                }
            } else {
                if(index === 0) {
                    form.find("#btnSend").removeClass("disabled btn-wait").text("send");
                } else if(index === 1) {
                    form.find("#btnAdd").removeClass("disabled btn-wait").html(`<i class='fas fa-plus mr-5'></i>add to storage`);
                }
                form.find("input").prop("disabled", false);
            }


        }
    });

    $("form").each(function() {
        // attach to all form elements on page
        $(this).validate({
            rules: {
                client_id: {
                    required: true
                },
                client_secret: {
                    required: true
                }
            },
            errorPlacement: function(){
                return false;  // suppresses error message text
            },
            highlight: function(element) {
                $(element).addClass('error');
            }, unhighlight: function(element) {
                $(element).removeClass('error');
            },
            submitHandler: function(form) {
                form.submit();
            }
        });
    });


    $("#btnAdd, #btnSend").on("click", function(){
        const _this = $(this);
        const form = _this.closest("form");

        if(_this.hasClass("disabled")) {
            return;
        }
       /* const test = $("form").serialize();
        openDialog('/api/auth/tistory?'+test, 'test', '', function() {
            console.log('unload');
        })

        return;
*/



        const btnText= _this.text();
        _this.addClass("disabled btn-wait").html(`<span class="fa fa-spinner fa-spin"></span> ${btnText}`);

        form.submit();

        form.find("input").prop("disabled", true);
    });

    $(document).on("click", "div.button[id^=btnNext]", function(){
        let _this = $(this);
        let form = _this.closest("form");
        pageHandler(form).move();
    });


    function pageHandler(form) {
        const modalBody = form.closest(".modal-body"),
            stepIndex = modalBody.index(),
            pag = $('.modal-header span').eq(stepIndex);

        return {
            index: (() => {
                return stepIndex;
            })(),
            move: () => {
                changeStep(modalBody, pag);

                if(stepIndex === 1) {
                    treeInitialize();
                }
            },
        }
    }

    function changeStep(step, pag){
        // animate the step out
        step.addClass('animate-out');

        // animate the step in
        setTimeout(function(){
            step.removeClass('animate-out is-showing').next().addClass('animate-in');
            pag.removeClass('is-active').next().addClass('is-active');
        }, 600);

        // after the animation, adjust the classes
        setTimeout(function(){
            step.next().removeClass('animate-in').addClass('is-showing');

        }, 1200);
    }

    $('.rerun-button').click(function(){
        $('.modal-wrap').removeClass('animate-up')
            .find('.modal-body')
            .first().addClass('is-showing')
            .siblings().removeClass('is-showing');

        $('.modal-header span').first().addClass('is-active')
            .siblings().removeClass('is-active');
        $(this).hide();
    });

});


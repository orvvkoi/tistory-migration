if (!window['UTIL']) window['UTIL'] = {};

UTIL.LocalStorage = (() => {
    if (!window.localStorage || !window.JSON) {
        return;
    }

    const context = {
        get: (key) => {
            const item = localStorage.getItem(key);

            if (!item) {
                return;
            }

            try {
                return JSON.parse(item);
            } catch (e) {
                return item
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
            } catch (e) {
                if (e === "QUOTA_EXCEEDED_ERR") {
                    console.log("Local Storage limit EXCEEDED");
                    //localStorage.clear();
                }
            }
        },
        remove: (key) => {
            localStorage.removeItem(key);
        }
    }

    return context
})();




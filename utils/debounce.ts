export function debounce (func, wait = 200) {
    let timeout;

    return function () {
        const self = this;

        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => func.apply(self, arguments), wait);
    };
}

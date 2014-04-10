module.exports = function (key) {
    if (key === true) {
        return function () { return true };
    }
    else if (typeof key === 'string') {
        return function (row) { return row && row[key] }
    }
    else if (typeof key === 'function') {
        return key;
    }
    return false;
};

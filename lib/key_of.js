var json = require('jsonify');

module.exports = function (key) {
    if (key === true) {
        return function () { return true };
    }
    else if (typeof key === 'string') {
        return function (row) {
            var x = row && row[key]
            if (typeof x === 'string') return x
            else return json.stringify(x)
        }
    }
    else if (typeof key === 'function') {
        return key;
    }
    return false;
};

var json = require('jsonify');
var isarray = require('isarray');

module.exports = function (key) {
    if (key === true) key = 'key';
    if (typeof key === 'function') {
        return function (row) { return key(row) };
    }
    return function (row) {
        if (!isarray(key)) key = [ key ];
        var x = row && getKey(row, key);
        if (typeof x === 'string') return x
        else return json.stringify(x)
    }
};

function getKey (obj, keys) {
    for (var i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
        if (!obj) return;
    }
    return obj[keys[i]];
}

var through = require('through');
var hyperglue = require('hyperglue');

module.exports = function (html, cb) {
    return through(function (line) {
        var row;
        if (typeof line === 'string' || Buffer.isBuffer(line)) {
            try { row = JSON.parse(line) }
            catch (err) { this.emit('error', err) }
        }
        else row = line;
        var res = cb(row);
        if (res) this.queue(encode(hyperglue(html, res).outerHTML));
    });
};

function encode (s) {
    var res = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 128) {
            res += '&#' + c + ';';
        }
        else res += s.charAt(i);
    }
    return res;
}

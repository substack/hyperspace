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
        if (res) this.queue(hyperglue(html, res).outerHTML);
    });
};

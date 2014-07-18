var hyperstream = require('hyperstream');
var through = require('through2');
var split = require('split');
var splicer = require('stream-splicer');
var encode = require('ent').encode;
var u8 = require('utf8-stream');
var combine = require('stream-combiner2');

module.exports = function (html, opts, fn) {
    if (typeof opts === 'function') {
        fn = opts;
        opts = {};
    }
    var first = true;
    var rower = through.obj(function (row, enc, next) {
        if (first && (typeof row === 'string' || Buffer.isBuffer(row))) {
            first = false;
            var sp = split(function (s) {
                if (s) return JSON.parse(s);
            });
            pipeline.unshift(sp);
            pipeline.write(row);
            return next();
        }
        first = false;
        
        var params = fn(row);
        if (!params || typeof params !== 'object') return next();
        
        var hs = hyperstream(fix(params));
        
        hs.pipe(through(write, end));
        hs.end(html);
        
        function write (buf, enc, next) { rower.push(buf); next() }
        function end () { next() }
    });
    var pipeline = splicer.obj([ rower ]);
    return pipeline;
};

function fix (params) {
    var res = {};
    Object.keys(params).forEach(function (key) {
        var p = params[key];
        if (isStream(p)) {
            res[key] = p.pipe(encoder());
        }
        else if (typeof p === 'string') {
            res[key] = encode(p);
        }
        else if (p && typeof p === 'object' && p._text && !p._html) {
            p._html = encode(p._text);
        }
        else {
            res[key] = p;
        }
    });
    return res;
}

function isStream (x) { return x && typeof x.pipe === 'function' }

function encoder () {
    return combine(u8(), through(function (buf, enc, next) {
        this.push(encode(buf.toString('utf8')));
        next();
    }));
}

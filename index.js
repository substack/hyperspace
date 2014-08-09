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
    if (!opts) opts = {};
    
    var first = true;
    var buckets = {}, bkeys = [];
    var keyName = opts.keyName || 'key';
    if (!Array.isArray(keyName)) keyName = [ keyName ];
    
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
        
        if (opts.key === true) {
            buckets[true] = fn(row);
            if (bkeys.length === 0) bkeys.push(true);
            next();
        }
        else if (opts.key) {
            var k = getKey(row, keyName);
            if (k) {
                bkeys.push(k);
                buckets[k] = fn(row);
            }
            next();
        }
        else sendParams(fn(row), null, next)
    }, rend);
    var pipeline = splicer.obj([ rower ]);
    return pipeline;
    
    function rend () {
        if (!opts.key) return rower.push(null);
        
        (function next () {
            if (bkeys.length === 0) return rower.push(null);
            var k = bkeys.shift();
            sendParams(buckets[k], k, next);
        })();
    }
    
    function sendParams (params, key, next) {
        if (!params || typeof params !== 'object') return next();
        var fparams = fix(params);
        if (key && key !== true) {
            var akey = opts.key === true ? 'key' : opts.key;
            var star = '*:first';
            if (!fparams[star]) fparams[star] = {};
            fparams[star][akey] = key;
        }
        
        var hs = hyperstream(fparams);
        hs.pipe(through(write, end));
        hs.end(html);
        function write (buf, enc, next) { rower.push(buf); next() }
        function end () { next() }
    }
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

function getKey (obj, keys) {
    for (var i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
        if (!obj) return;
    }
    return obj[keys[i]];
}

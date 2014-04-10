var trumpet = require('trumpet');
var Transform = require('readable-stream/transform');
var hyperglue = require('hyperglue');
var encode = require('ent').encode;
var through = require('through');
var KeyOf = require('./lib/key_of.js');

var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate : process.nextTick
;

module.exports = function hyperspace (html, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var keyOf = KeyOf(opts.key);
    
    var buffering = false;
    if (opts.buffer || (opts.key && typeof opts.key !== 'string')) {
        buffering = {};
    }
    
    var tf = new Transform({ objectMode: true });
    tf._flush = function (next) {
        nextTick(function () {
            tf.push(null);
            next();
        });
    };
    
    tf._transform = function (line, _, next) {
        var row;
        
        if (typeof line === 'string' || Buffer.isBuffer(line)) {
            if (line.length === 0) return next();
            if (typeof line !== 'string') line = String(line);
            try { row = JSON.parse(line) }
            catch (err) { this.emit('error', err) }
        }
        else row = line;
        var res = cb(row);
        if (!res) return next();
        
        var tr = trumpet();
        var k = keyOf && keyOf(row);
        if (typeof opts.key === 'string') {
            var rk = typeof k === 'string' ? k : String(k);
            tr.select('*').setAttribute(opts.key, rk);
        }
        
        if (buffering && k) {
            var first = !buffering[k];
            buffering[k] = [];
            tr.on('data', function (buf) { buffering[k].push(buf) });
            if (first) {
                tf.on('finish', function () {
                    tf.push(Buffer.concat(buffering[k]));
                    delete buffering[k];
                });
            }
        }
        else {
            tr.pipe(through(function (buf) { tf.push(buf) }));
        }
        tr.on('end', function () { next() });
        
        Object.keys(res).forEach(function (key) {
            if (key === ':first') {
                each(key, tr.select('*'));
            }
            else if (/:first$/.test(key)) {
                each(key, tr.select(key.replace(/:first$/, '')));
            }
            else tr.selectAll(key, function (elem) { each(key, elem) })
        });
        
        function each (key, elem) {
            if (isStream(res[key])) {
                tf.emit('stream', res[key]);
                res[key].pipe(elem.createWriteStream());
            }
            else if (Array.isArray(res[key])) {
                var bufs = [];
                var write = function (buf) { bufs.push(buf) };
                var end = function (next) {
                    var html = Buffer.concat(bufs).toString('utf8');
                    if (html.length) {
                        res[key].forEach(function (m) {
                            var mm = {}; mm[key] = m;
                            trf.queue(hyperglue(html, mm).outerHTML);
                        });
                    }
                    trf.queue(null);
                };
                var trf = through(write, end);
                trf.pipe(elem.createStream({ outer: true })).pipe(trf);
            }
            else if (typeof res[key] === 'object') {
                Object.keys(res[key]).forEach(function (k) {
                    var v = res[key][k];
                    if (k === '_html') {
                        if (isStream(v)) {
                            v.pipe(elem.createWriteStream());
                        }
                        else if (typeof v === 'string' || Buffer.isBuffer(v)) {
                            elem.createWriteStream().end(v);
                        }
                        else {
                            elem.createWriteStream().end(String(v));
                        }
                    }
                    else if (k === '_text') {
                        if (Buffer.isBuffer(v)) v = v.toString('utf8')
                        else if (typeof v !== 'string') v = String(v);
                        elem.createWriteStream().end(encode(v));
                    }
                    else {
                        if (Buffer.isBuffer(v)) v = v.toString('utf8')
                        else if (typeof v !== 'string') v = String(v);
                        elem.setAttribute(k, v);
                    }
                });
            }
            else {
                var v = res[key];
                if (Buffer.isBuffer(v)) v = v.toString('utf8')
                else if (typeof v !== 'string') v = String(v);
                elem.createWriteStream().end(encode(v));
            }
        }
        tr.end(html);
    };
    return tf;
};

function isStream (x) {
    return x && typeof x.pipe === 'function';
}

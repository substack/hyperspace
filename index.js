var trumpet = require('trumpet');
var Transform = require('readable-stream/transform');
var encode = require('ent').encode;

module.exports = function (html, cb) {
    var tf = new Transform({ objectMode: true });
    tf._transform = function (line, _, next) {
        var row;
        if (typeof line === 'string' || Buffer.isBuffer(line)) {
            try { row = JSON.parse(line) }
            catch (err) { this.emit('error', err) }
        }
        else row = line;
        var res = cb(row);
        if (!res) return next();
        
        var tr = trumpet();
        tr.on('data', function (buf) { tf.push(buf) });
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

function isStream (x) {
    return x && typeof x.pipe === 'function';
}

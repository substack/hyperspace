var through = require('through');
var hyperglue = require('hyperglue');
var domify = require('domify');
var KeyOf = require('./lib/key_of.js');

module.exports = function (html, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var keyOf = KeyOf(opts.key);
    var elements = {};
    
    var className = classNameOf(html);
    
    var tr = through(write, end);
    function write (line) {
        var row;
        if (Buffer.isBuffer(line)) {
            line = line.toString('utf8');
        }
        else if (isInt8Array(line)) {
            var s = '';
            for (var i = 0; i < line.length; i++) s += line[i];
            line = s;
        }
        if (typeof line === 'string') {
            try { row = JSON.parse(line) }
            catch (err) { this.emit('error', err) }
        }
        else row = line;
        
        if (opts.key && row && row.type === 'del') {
            var k = keyOf(row);
            if (k && elements[k]) {
                return this.emit('delete', elements[k]);
            }
        }
        
        var res = cb.call(this, row);
        if (!res) return;
        var keys = objectKeys(res);
        var streams = [];
        
        for (var i = 0; i < keys.length; i++) (function (key) {
            var x = res[key];
            if (isStream(x)) {
                delete res[key];
                streams.push([ key, x ]);
            }
            else if (x && typeof x === 'object' && isStream(x._html)) {
                var st = x._html;
                delete x._html;
                streams.push([ key, st ]);
            }
            else if (x && typeof x === 'object' && isStream(x._text)) {
                var st = x._text;
                delete x._text;
                streams.push([ key, st ]);
            }
        })(keys[i]);
        
        var type, elem;
        var k = opts.key && keyOf(row);
        
        if (k && elements[k]) {
            elem = hyperglue(elements[k], res);
            type = 'update';
        }
        else {
            elem = hyperglue(html, res);
            type = 'element';
        }
        if (k) elements[k] = elem;
        
        for (var i = 0; i < streams.length; i++) (function (ks) {
            var key = ks[0], stream = ks[1];
            tr.emit('stream', stream, elem);
            var cur = elem.querySelector(key);
            if (!cur) return;
            
            stream.on('element', function (elem) {
                cur.appendChild(elem);
                stream.removeListener('data', ondata);
            });
            stream.on('data', ondata);
            function ondata (e) { cur.innerHTML += e }
        })(streams[i]);
        
        this.emit(type, elem);
        
        if (opts.key !== true) this.queue(elem.outerHTML);
    }
    
    function end () {
        if (opts.key === true) {
            this.queue(elements[true].outerHTML);
        }
        this.queue(null);
    }
    
    tr.prependTo = function (t) {
        var target = getTarget(t);
        
        tr.on('element', function (elem) {
            target.insertBefore(elem, target.childNodes[0]);
        });
        
        tr.on('delete', function (elem) {
            if (hasChild(target, elem)) target.removeChild(elem);
        });
        
        return tr;
    };
    
    tr.appendTo = function (t) {
        var target = getTarget(t);
        
        tr.on('element', function (elem) {
            target.appendChild(elem);
        });
        
        tr.on('delete', function (elem) {
            if (hasChild(target, elem)) target.removeChild(elem);
        });
        
        return tr;
    };
    
    tr.sortTo = function (t, cmp) {
        if (opts.key && cmp === undefined) {
            cmp = function (a, b) {
                var ka = a.getAttribute(opts.key);
                var kb = b.getAttribute(opts.key);
                return ka < kb ? -1 : 1;
            };
        }
        else if (typeof cmp === 'string') {
            cmp = (function (str) {
                var flip = /^~/.test(str);
                if (flip) str = str.replace(/^~/, '');
                var n = flip ? 1 : -1;
                
                return function (a, b) {
                    var qa = a.querySelector(str);
                    var xa = qa && qa.textContent || qa.innerText;
                    var qb = b.querySelector(str);
                    var xb = qb && qb.textContent || qb.innerText;
                    if (isNum(xa) && isNum(xb)) {
                        return Number(xa) < Number(xb) ? -n : n;
                    }
                    else return xa < xb ? -n : n;
                };
            })(cmp);
        }
        if (typeof cmp !== 'function') {
            throw new Error('comparison function not provided');
        }
        var target = getElem(t);
        
        var sorted = [].slice.call(target.getElementsByClassName(className));
        sorted.sort(cmp);
        for (var i = 0; i < sorted.length; i++) {
            if (target.childNodes[i] === sorted[i]) continue;
            target.removeChild(sorted[i]);
            target.insertBefore(sorted[i], target.childNodes[i]);
        }
        
        tr.on('element', onupdate);
        tr.on('update', function (elem) {
            if (hasChild(target, elem)) {
                target.removeChild(elem);
            }
            onupdate(elem);
        });
        tr.on('delete', function (elem) {
            if (hasChild(target, elem)) target.removeChild(elem);
        });
        
        getTarget(t, target);
        return tr;
        
        function onupdate (elem) {
            var nodes = target.getElementsByClassName(className);
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i] === elem) continue;
                var n = cmp(elem, nodes[i]);
                if (n < 0) {
                    if (hasChild(target, elem)) {
                        target.removeChild(elem);
                    }
                    target.insertBefore(elem, nodes[i]);
                    return;
                }
            }
            target.appendChild(elem);
        }
    };
    
    var emittedElements = false;
    tr.className = className;
    return tr;
    
    function getTarget (t, target) {
        if (!target) target = getElem(t);
        tr.emit('parent', target);
        if (!className) return target;
        if (emittedElements) return target;
        emittedElements = true;
        var elems = target.querySelectorAll('.' + className);
        
        process.nextTick(function(){
            for (var i = 0; i < elems.length; i++) {
                var elem = elems[i];
                var key = opts.key && elem.getAttribute(opts.key);
                if (key) elements[key] = elem;
                tr.emit('element', elem);
            }
        });

        return target;
    }
};

function classNameOf (html) {
    var elems = domify(html);
    if (elems.length) return elems[0].getAttribute('class');
}

function hasChild (node, child) {
    var nodes = node.childNodes;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] === child) return true;
    }
    return false;
}

function getElem (target) {
    if (typeof target === 'string') {
        return document.querySelector(target);
    }
    return target;
}

function isInt8Array (line) {
    return line && typeof line === 'object'
        && line.constructor === 'function'
        && line.constructor.name === 'Int8Array'
    ;
}

function isStream (x) {
    return x && typeof x.pipe === 'function';
}

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

function isNum (s) {
    return /^\s*(\d*\.\d+|\d+\.?)(e-?\d+)?\s*$/.test(s);
}

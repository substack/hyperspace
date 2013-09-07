var through = require('through');
var hyperglue = require('hyperglue');
var domify = require('domify');

module.exports = function (html, cb) {
    var className = classNameOf(html);
    
    var tr = through(function (line) {
        var row;
        if (isInt8Array(line)) {
            var s = '';
            for (var i = 0; i < line.length; i++) s += line[i];
            line = s;
        }
        if (typeof line === 'string') {
            try { row = JSON.parse(line) }
            catch (err) { this.emit('error', err) }
        }
        else row = line;
        
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
        
        var elem = hyperglue(html, res);
        
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
        
        this.emit('element', elem);
        this.queue(elem.outerHTML);
    });
    
    tr.prependTo = function (t) {
        var target = getTarget(t);
        
        tr.on('element', function (elem) {
            target.insertBefore(elem, target.childNodes[0]);
        });
        return tr;
    };
    
    tr.appendTo = function (t) {
        var target = getTarget(t);
        
        tr.on('element', function (elem) {
            target.appendChild(elem);
        });
        return tr;
    };
    
    tr.sortTo = function (t, cmp) {
        if (typeof cmp !== 'function') {
            throw new Error('comparison function not provided');
        }
        var target = getElem(t);
        
        tr.on('element', function (elem) {
            var nodes = target.getElementsByClassName(className);
            for (var i = 0; i < nodes.length; i++) {
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
        });
        
        getTarget(t, target);
        return tr;
    };
    
    var emittedElements = false;
    return tr;
    
    function getTarget (t, target) {
        if (!target) target = getElem(t);
        tr.emit('parent', target);
        if (!className) return target;
        if (emittedElements) return target;
        emittedElements = true;
        
        var elems = target.querySelectorAll('.' + className);
        for (var i = 0; i < elems.length; i++) {
            tr.emit('element', elems[i]);
        }
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

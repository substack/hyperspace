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
        
        var res = cb(row);
        if (res) {
            var elem = hyperglue(html, res);
            this.emit('element', elem);
            this.queue(elem.outerHTML);
        }
    });
    
    tr.prependTo = function (t) {
        var target = getElem(t);
        findElems(target);
        
        tr.on('element', function (elem) {
            target.insertBefore(elem, target.childNodes[0]);
        });
        return tr;
    };
    
    tr.appendTo = function (t) {
        var target = getElem(t);
        findElems(target);
        
        tr.on('element', function (elem) {
            target.appendChild(elem);
        });
        return tr;
    };
    
    var emittedElements = false;
    return tr;
    
    function findElems (target) {
        if (!className) return;
        if (emittedElements) return;
        emittedElements = true;
        
        var elems = target.querySelectorAll('.' + className);
        for (var i = 0; i < elems.length; i++) {
            tr.emit('element', elems[i]);
        }
    }
};

function classNameOf (html) {
    var elems = domify(html);
    if (elems.length) return elems[0].getAttribute('class');
}

function getElem (target) {
    if (typeof target === 'string') {
        return document.querySelector(target);
    }
    return target;
}

function isInt8Array (x) {
    return x && typeof x === 'object'
        && line.constructor === 'function'
        && line.constructor.name === 'Int8Array'
    ;
}

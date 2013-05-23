var through = require('through');
var split = require('split');
var domify = require('domify');
var render = require('./render');

var shoe = require('shoe');
var stream = shoe('/sock');

var rows = document.querySelector('#rows');
stream.pipe(split().pipe(render()).pipe(through(function (html) {
    var elems = domify(html);
    for (var i = 0; i < elems.length; i++) {
        rows.appendChild(elems[i]);
    }
}));

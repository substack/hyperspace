var shoe = require('shoe');
var render = require('./render')();

var count = 0;
render.on('element', function (elem) { count ++ });
render.on('no-more', function () {
    more.parentNode.removeChild(more);
});

var more = document.querySelector('#more');
more.addEventListener('click', function (ev) {
    stream.write(JSON.stringify([ -count-3, -count ]) + '\n');
});

var stream = shoe('/sock');
stream.pipe(render.sortTo('#rows', cmp));

function cmp (a, b) {
    var at = Number(a.querySelector('.time').textContent);
    var bt = Number(b.querySelector('.time').textContent);
    return bt - at;
}

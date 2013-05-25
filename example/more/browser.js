var shoe = require('shoe');
var render = require('./render');

shoe('/sock').pipe(render().sortTo('#rows', cmp));

function cmp (a, b) {
    var at = Number(a.querySelector('.time').textContent);
    var bt = Number(b.querySelector('.time').textContent);
    return bt - at;
}

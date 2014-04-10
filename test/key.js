var test = require('tape');
var concat = require('concat-stream');
var hyperspace = require('../');

var data = [
    { "size": 3000000 },
    { "size": 4000000 },
    { "size": 5000000 },
    { "size": 1500000 },
    { "size": 520000 }
];

var html = '<div>total: <span class="size"></span></div>';

function render () {
    var size = 0;
    return hyperspace(html, { key: true }, function (row) {
        size += row.size;
        return { '.size': Math.round(size / 1024 / 1024 * 100) / 100 + ' M' };
    });
}

test('opts.key', function (t) {
    t.plan(1);
    
    var r = render();
    r.pipe(concat(function (body) {
        t.equal(
            body.toString(),
            '<div>total: <span class="size">XXX M</span></div>'
        );
    }));
    
    for (var i = 0; i < data.length; i++) {
        r.write(data[i]);
    }
    r.end();
});

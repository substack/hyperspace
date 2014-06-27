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

test('opts.key === true', function (t) {
    t.plan(1);

    var html = '<div>total: <span class="size"></span></div>';
    function render () {
        var size = 0;
        return hyperspace(html, { key: true }, function (row) {
            size += row.size;
            return { '.size': Math.round(size / 1024 / 1024 * 100) / 100 + ' M' };
        });
    }
    
    var r = render();
    r.pipe(concat(function (body) {
        t.equal(
            body.toString(),
            '<div>total: <span class="size">13.37 M</span></div>'
        );
    }));
    
    for (var i = 0; i < data.length; i++) {
        r.write(data[i]);
    }
    r.end();
});

test('typeof opts.key === "string"', function (t) {
    t.plan(1);

    var html = '<div>size: <span class="size"></span></div>';
    function render () {
        return hyperspace(html, { key: 'size' }, function (row) {
            return { '.size': row.size };
        });
    }
    
    var r = render();
    r.pipe(concat(function (body) {
        t.equal(
            body.toString(),
            data.map(function (size) {
                return '<div size="' + size + '"> size: '
                    + '<span class="size">' + size + '</span></div>';
            })
        );
    }));
    
    for (var i = 0; i < data.length; i++) {
        r.write(data[i]);
    }
    r.end();
});

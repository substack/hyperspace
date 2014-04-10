var test = require('tape');
var hyperspace = require('../../');

var data = [
    { "size": 3000000 },
    { "size": 4000000 },
    { "size": 5000000 },
    { "size": 1500000 },
    { "size": 520000 }
];

var html = '<div class="total">total: <span class="size"></span></div>';

function render () {
    var size = 0;
    return hyperspace(html, { key: true }, function (row) {
        size += row.size;
        return { '.size': Math.round(size / 1024 / 1024 * 100) / 100 + ' M' };
    });
}

test('opts.key', function (t) {
    t.plan(2);
    
    var r = render().appendTo(document.body);
    
    for (var i = 0; i < data.length; i++) {
        r.write(data[i]);
    }
    
    var totals = document.querySelectorAll('.total');
    t.equal(totals.length, 1);
    t.equal(
        text(totals[0].querySelector('.size')),
        '13.37 M'
    );
});

function text (elem) {
    return elem.textContent || elem.innerText;
}

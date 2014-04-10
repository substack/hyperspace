var test = require('tape');
var hyperspace = require('../../');

var data = [
    { name: 'A', size: 3000000 },
    { name: 'B', size: 4000000 },
    { name: 'C', size: 5000000 },
    { name: 'D', size: 1500000 },
    { name: 'E', size: 520000 }
];

var sorted = data.sort(function (a, b) {
    return a.size < b.size ? -1 : 1;
});

var html = '<div class="item">'
    + '<div>name: <span class="name"></span></div>'
    + '<div><span class="size"></span></div>'
;

function render () {
    var size = 0;
    return hyperspace(html, function (row) {
        size += row.size;
        return {
            '.name': row.name,
            '.size': Math.round(size / 1024 / 1024 * 100) / 100 + ' M'
        };
    });
}

test('sortTo', function (t) {
    t.plan(data.length);
    
    var r = render().sortTo(document.body, function (a, b) {
        var ax = text(a.querySelector('.size'));
        var bx = text(b.querySelector('.size'));
        return Number(ax) < Number(bx) ? -1 : 1;
    });
    
    for (var i = 0; i < data.length; i++) {
        r.write(data[i]);
    }
    
    var items = document.querySelectorAll('.item');
    for (var i = 0; i < items.length; i++) {
        var name = text(items[i].querySelector('.name'));
        t.equal(name, sorted[i].name);
    }
});

function text (elem) {
    return elem.textContent || elem.innerText;
}

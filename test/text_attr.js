var hyperspace = require('../');
var test = require('tape');
var concat = require('concat-stream');

var html = '<div class="row">'
    + '<div class="who"><a></a></div>'
    + '<div class="message"></div>'
    + '</div>'
;

test('simple obj', function (t) {
    t.plan(1);
    
    var hs = hyperspace(html, function (row) {
        return {
            '.who a': {
                _text: row.who,
                href: '/users/' + row.who
            },
            '.message': row.message
        };
    });
    hs.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), [
            '<div class="row">'
            + '<div class="who"><a href="/users/robot">robot</a></div>'
            + '<div class="message">beep boop</div>'
            + '</div>',
            '<div class="row">'
            + '<div class="who"><a href="/users/t-rex">t-rex</a></div>'
            + '<div class="message">rawr!</div>'
            + '</div>',
            '<div class="row">'
            + '<div class="who"><a href="/users/mouse">mouse</a></div>'
            + '<div class="message">&#x3C;squeak&#x3E;</div>'
            + '</div>'
        ].join(''));
    }));
    
    hs.write({ who: 'robot', message: 'beep boop' });
    hs.write({ who: 't-rex', message: 'rawr!' });
    hs.write({ who: 'mouse', message: '<squeak>' });
    hs.end();
});

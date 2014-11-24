var hyperspace = require('../');
var test = require('tape');
var concat = require('concat-stream');

var html = '<div class="row">'
    + '<div class="who"></div>'
    + '<div class="message"></div>'
    + '</div>'
;

test('simple buf', function (t) {
    t.plan(1);
    
    var hs = hyperspace(html, function (row) {
        return {
            '.who': row.who,
            '.message': row.message
        };
    });
    hs.pipe(concat(function (body) {
        t.equal(body.toString('utf8'), [
            '<div class="row">'
            + '<div class="who">robot</div>'
            + '<div class="message">beep boop</div>'
            + '</div>',
            '<div class="row">'
            + '<div class="who">t-rex</div>'
            + '<div class="message">rawr!</div>'
            + '</div>',
            '<div class="row">'
            + '<div class="who">mouse</div>'
            + '<div class="message">&#x3C;squeak&#x3E;</div>'
            + '</div>',
            '<div class="row">'
            + '<div class="who">dog</div>'
            + '<div class="message">&#x1F4A9;</div>'
            + '</div>'
        ].join(''));
    }));

    hs.write(JSON.stringify({ who: 'robot', message: 'beep boop' }) + '\n');
    hs.write(JSON.stringify({ who: 't-rex', message: 'rawr!' }) + '\n');
    hs.write(JSON.stringify({ who: 'mouse', message: '<squeak>' }) + '\n');
    hs.write(JSON.stringify({ who: 'dog', message: '\uD83D\uDCA9' }) + '\n');
    hs.end();
});

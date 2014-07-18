var hyperspace = require('../');

var html = '<div class="row">\n'
    + '<div class="who"></div>\n'
    + '<div class="message"></div>\n'
    + '</div>\n'
;

var hs = hyperspace(html, function (row) {
    return {
        '.who': row.who,
        '.message': row.message
    };
});
hs.pipe(process.stdout);
    
hs.write({ who: 'robot', message: 'beep boop' });
hs.write({ who: 't-rex', message: 'rawr!' });
hs.write({ who: 'mouse', message: '<squeak>' });
hs.end();

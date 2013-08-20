var hyperspace = require('hyperspace');
var html = require('fs').readFileSync(__dirname + '/hacker.html', 'utf8');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.name': row.name,
            '.hackerspace': row.hackerspace
        };
    });
};

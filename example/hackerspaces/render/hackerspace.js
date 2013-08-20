var hyperspace = require('hyperspace');
var html = require('fs').readFileSync(__dirname + '/hackerspace.html', 'utf8');
var renderHacker = require('./hacker.js');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.name': row.value.name,
            '.hackers': 'PLACEHOLDER'
        };
    });
};

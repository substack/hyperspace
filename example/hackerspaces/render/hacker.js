var hyperspace = require('../../../');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/hacker.html', 'utf8');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.name': row.value.name,
            '.hackerspace': row.value.hackerspace
        };
    });
};

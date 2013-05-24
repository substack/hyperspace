var hyperspace = require('../../');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/static/row.html');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.who': row.who,
            '.message': row.message
        };
    });
};

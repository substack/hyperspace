var through = require('through');
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/static/row.html');
var hyperspace = require('../');

module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.who': row.who,
            '.message': row.message
        };
    });
};

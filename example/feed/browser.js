var shoe = require('shoe');
var render = require('./render');

shoe('/sock').pipe(render().appendTo('#rows'));

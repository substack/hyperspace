var http = require('http');
var fs = require('fs');

//var level = require('level');
var level = require('level-test')();
var live = require('level-live-stream');
var sub = require('level-sublevel');
var db = sub(level('hackerspaces', { valueEncoding: 'json' }));

db.batch(require('./data.json').map(function (row) {
    return { type: 'put', key: row.key, value: row.value };
}));

var hyperstream = require('hyperstream');
var ecstatic = require('ecstatic')(__dirname + '/static');
var trumpet = require('trumpet');

var assoc = require('level-assoc')(db);

assoc.add('hackerspace')
    .hasMany('hackers', [ 'type', 'hacker' ])
;

var render = {
    hackerspace: require('./render/hackerspace.js'),
    hacker: require('./render/hacker.js')
};

var server = http.createServer(function (req, res) {
    if (req.url === '/') {
        var tr = trumpet();
        assoc.list('hackerspace')
            .pipe(render.hackerspace())
            .pipe(tr.createWriteStream('#hackerspaces'))
        ;
        readStream('index.html').pipe(tr).pipe(res);
    }
    else ecstatic(req, res)
});
server.listen(8000);

var shoe = require('shoe');
var sock = shoe(function (stream) {
    live(db).pipe(stream);
});
sock.install(server, '/sock');

function readStream (file) {
    return fs.createReadStream(__dirname + '/static/' + file);
}

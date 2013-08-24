var http = require('http');
var fs = require('fs');
var through = require('through');

//var level = require('level');
var level = require('level-test')();
var sub = require('level-sublevel');
var db = sub(level('hackerspaces', { valueEncoding: 'json' }));

db.batch(require('./data.json').map(function (row) {
    return { type: 'put', key: row.key, value: row.value };
}));

setInterval(function () {
    var spaces = [ 'noisebridge', 'sudoroom' ];
    var space = spaces[Math.floor(Math.random() * spaces.length)];
    var name = '';
    for (var i = 0; i < 4 || Math.random() > 0.3; i++) {
        name += String.fromCharCode(97 + Math.random() * 26);
    }
    db.put(name, { type: 'hacker', name: name, hackerspace: space });
}, 3000);

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
            .pipe(createHackerspaceStream())
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
    assoc.list('hackerspace', { follow: true })
        .pipe(createHackerspaceStream())
    ;
});
sock.install(server, '/sock');

function readStream (file) {
    return fs.createReadStream(__dirname + '/static/' + file);
}

function createHackerspaceStream () {
    return through(function (space) {
        var tr = this;
        tr.pending = (tr.pending || 0) + 1;
        tr.queue(JSON.stringify(space) + '\n');
        space.value.hackers().on('data', function (hacker) {
            tr.queue(JSON.stringify(hacker) + '\n');
            if (-- tr.pending === 0) tr.queue(null);
        });
    }, function () {});
}

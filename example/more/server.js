var http = require('http');
var fs = require('fs');
var hyperstream = require('hyperstream');
var through = require('through');
var split = require('split');
var ecstatic = require('ecstatic')(__dirname + '/static');

var sliceFile = require('slice-file');
var sf = sliceFile(__dirname + '/data.txt');

var render = require('./render');

var server = http.createServer(function (req, res) {
    if (req.url === '/') {
        var hs = hyperstream({
            '#rows': sf.sliceReverse(-3).pipe(render())
        });
        var rs = fs.createReadStream(__dirname + '/static/index.html');
        rs.pipe(hs).pipe(res);
    }
    else ecstatic(req, res)
});
server.listen(8000);

var shoe = require('shoe');
var sock = shoe(function (stream) {
    sf.follow(-1,0).pipe(stream);
    stream.pipe(split()).pipe(through(function (line) {
        var offsets = JSON.parse(line);
        sf.sliceReverse(offsets[0], offsets[1])
            .pipe(insertBoundary(offsets[0], offsets[1]))
            .pipe(stream)
        ;
    }));
});
sock.install(server, '/sock');

function insertBoundary (i, j) {
    // add a `false` to the result stream when there are no more records
    var count = 0;
    return through(write, end);
    function write (line) { count ++; this.queue(line) }
    function end () {
        if (count < j - i) this.queue('false\n');
    }
}

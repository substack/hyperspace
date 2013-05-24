var http = require('http');
var fs = require('fs');
var hyperstream = require('hyperstream');
var through = require('through');
var ecstatic = require('ecstatic')(__dirname + '/static');

var sliceFile = require('slice-file');
var sf = sliceFile(__dirname + '/data.txt');

var render = require('./render');

var server = http.createServer(function (req, res) {
    if (req.url === '/') {
        var hs = hyperstream({
            '#rows': sf.slice(-5).pipe(reverse()).pipe(render())
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
});
sock.install(server, '/sock');

function reverse () {
    var lines = [];
    return through(write, end);
    
    function write (line) { lines.unshift(line) }
    function end () {
        lines.forEach(this.queue.bind(this));
        this.queue(null);
    }
}

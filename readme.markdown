# hyperspace

render streams of html on the client and the server

Use the same rendering logic in the browser and the server to build
SEO-friendly pages with indexable realtime updates.

This module is just an encapsulation of
[the streaming html example](https://github.com/substack/stream-handbook#html-streams-for-the-browser-and-the-server)
from the stream handbook that uses
[hyperglue](https://github.com/substack/hyperglue) and json internally instead
of externally.

# example

First pick a stream data source that will give you records and let you subscribe
to a changes feed. In this example we'll use
[slice-file](https://github.com/substack/slice-file) to read from a single text
file to simplify the example code.

Let's start with the rendering logic that will be used on both the client and
the server:

render.js:

``` js
var hyperspace = require('hyperspace');
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
```

The return value of `hyperspace()` is a stream that takes lines of json as input
and returns html strings as its output. Text, the universal interface!

We're doing `fs.readFileSync()` in this shared rendering code but we can use
[brfs](http://github.com/substack/brfs) to make this work for the browser using
[browserify](http://browserify.org). The callback to `hyperspace()` merely
takes `row` objects and returns
[hyperglue](https://github.com/substack/hyperglue) mapping of css selectors to
content and attributes. Here we're updating the `"who"` and `"message"` divs
from the `row.html` which looks like:

row.html:

``` html
<div class="row">
  <div class="who"></div>
  <div class="message"></div>
</div>
```

The browser code to render this is super simple. We can just `require()` the
shared `render.js` file and hook that into a stream. In this example we'll use
[shoe](http://github.com/substack/shoe) to open a simple streaming websocket
connection with fallbacks:

browser.js:

``` js
var shoe = require('shoe');
var render = require('./render');

shoe('/sock').pipe(render().appendTo('#rows'));
```

Now our server will need to serve up 2 parts of our data stream: the initial
content list and the stream of realtime updates. We'll use
[hyperstream](https://github.com/substack/hyperstream) to pipe content rendered
with our `render.js` from before into the `#rows` div of our `index.html` file.
Then we'll use [shoe](http://github.com/substack/shoe) to pipe the rest of the
content to the browser where it can be rendered client-side.

server.js:

``` js
var http = require('http');
var fs = require('fs');
var hyperstream = require('hyperstream');
var ecstatic = require('ecstatic')(__dirname + '/static');

var sliceFile = require('slice-file');
var sf = sliceFile(__dirname + '/data.txt');

var render = require('./render');

var server = http.createServer(function (req, res) {
    if (req.url === '/') {
        var hs = hyperstream({ '#rows': sf.slice(-5).pipe(render()) });
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
```

And our `index.html` file is just:

index.html

``` html
<html>
  <head>
    <link rel="stylesheet" href="/style.css">
  </head>
  <body>
    <h1>rows</h1>
    <div id="rows"></div>
    <script src="/bundle.js"></script>
  </body>
</html>
```

Now just compile with [browserify](http://browserify.org) and
[brfs](http://github.com/substack/brfs):

```
$ browserify -t brfs browser.js > static/bundle.js
```

Now we can populate `data.txt` with some silly data:

```
$ echo '{"who":"substack","message":"beep boop."}' >> data.txt
$ echo '{"who":"zoltar","message":"COWER PUNY HUMANS"}' >> data.txt
```

then spin up the server:

```
$ node server.js
```

then navigate to `localhost:8000` where we will see our content. If we add some
more content:

```
$ echo '{"who":"substack","message":"oh hello."}' >> data.txt
$ echo '{"who":"zoltar","message":"HEAR ME!"}' >> data.txt
```

then the page updates automatically with the realtime updates, hooray!

We're now using exactly the same rendering logic on both the client and the
server to serve up SEO-friendly, indexable realtime content.

# methods

```
var hyperstream = require('hyperstream')
```

# var render = hyperstream(html, f)

Return a new `render` through stream that takes json strings or objects as input
and outputs a stream of html strings after applying the transformations from
`f(row)`.

`f(row)` gets an object from the data source as input and should return an
object of [hyperglue](https://github.com/substack/hyperglue) css selectors
mapped to content and attributes or a falsy value if nothing should be rendered
for the given `row`.

# browser methods

These methods only apply browser-side because they deal with how to handle the
realtime update stream.

## render.appendTo(target)

Append the html elements created from the hyperstream transform function
`f(row)` directly to `target`.

`target` can be an html element or a css selector.

## render.prependTo(target)

Prepend the html elements created from the hyperstream transform function
`f(row)` directly to `target`.

`target` can be an html element or a css selector.

# browser events

## render.on('element', function (elem) {})

This event fires for all elements created by the result stream, including those
elements created server-side so long as `.prependTo()` or `.appendTo()` as been
called on the same container that the server populated content with.

# install

With [npm](https://npmjs.org) do:

```
npm install hyperstream
```

# license

MIT

# hyperspace

render streams of html on the client and the server

Use the same rendering logic in the browser and the server to build
SEO-friendly pages with indexable realtime updates.

This module is just an encapsulation of
[the streaming html example](https://github.com/substack/stream-handbook#html-streams-for-the-browser-and-the-server)
from the stream handbook that uses
[hyperglue](https://github.com/substack/hyperglue) and json internally instead
of externally.

![hyperspace](http://substack.net/images/hyperspace.png)

# example

## simple

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

It's easy to pipe some data the renderer in stdout

```
var r = require('./render')();
r.pipe(process.stdout);
r.write(JSON.stringify({ who: 'substack', message: 'beep boop' }) + '\n');
r.write(JSON.stringify({ who: 'h4ckr', message: 'h4x' }) + '\n');
```

which prints:

```
<div class="row">
  <div class="who">substack</div>
  <div class="message">beep boop</div>
</div>
<div class="row">
  <div class="who">h4ckr</div>
  <div class="message">h4x</div>
</div>
```

To make the rendering code work in browsers, we can just `require()` the
shared `render.js` file and hook that into a stream. In this example we'll use
[shoe](http://github.com/substack/shoe) to open a simple streaming websocket
connection with fallbacks:

browser.js:

``` js
var shoe = require('shoe');
var render = require('./render');

shoe('/sock').pipe(render().appendTo('#rows'));
```

If you need to do something with each rendered row you can just listen for
`'element'` events from the `render()` object to get each element from the
dataset, including the elements that were rendered server-side.

## hooking up a data feed

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

## requesting more data

We can extend the previous example with a "more" button to load more content on
demand using the existing streams and rendering logic already in place.

We'll first supplement the rendering in `server.js` to parse incoming requests
offsets:

``` js
var sock = shoe(function (stream) {
    sf.follow(-1,0).pipe(stream);
    stream.pipe(split()).pipe(through(function (line) {
        var offsets = JSON.parse(line);
        sf.sliceReverse(offsets[0], offsets[1]).pipe(stream);
    }));
});
```

Now when the browser sends us a json array `[i,j]`, we'll send back the reversed
slice from `data.txt` at those indices.

However, now results arrive both from realtime updates and from requested
offsets on the same websocket stream so we'll need to add some additional data
to our data and rendering logic in `render.js`.

Add a `<div class="time"></div>` to `row.html` then set that element to
`row.time`:

``` js
module.exports = function () {
    return hyperspace(html, function (row) {
        return {
            '.time': row.time,
            '.who': row.who,
            '.message': row.message
        };
    });
};
```

Now we can add a more button to the `index.html` and bind a click handler in the
`browser.js` to request more rows given the `count` of rows we've already
observed. The comparison function passed to `.sortTo()` will make sure that all
the results end up in the proper order no matter if they arrived from a realtime
update or a requested slice:

``` js
var shoe = require('shoe');
var render = require('./render')();

var count = 0;
render.on('element', function (elem) { count ++ });

var more = document.querySelector('#more');
more.addEventListener('click', function (ev) {
    stream.write(JSON.stringify([ -count-3, -count ]) + '\n');
});

var stream = shoe('/sock');
stream.pipe(render.sortTo('#rows', cmp));

function cmp (a, b) {
    var at = Number(a.querySelector('.time').textContent);
    var bt = Number(b.querySelector('.time').textContent);
    return bt - at;
}
```

And now we have an seo-friendly, indexable feed with realtime updates and a
"more" button to load more content!

## no more

For a simple extension to the previous example, we can remove the "more" button
once the end of the feed is reached by sending a `false` row in the result set
to specify a "no more" boundary.

In the server.js we can just pipe through an intermediary stream:

``` js
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
```

then our `render.js` can emit a `'no-more'` event when it finds a falsy row:

``` js
module.exports = function () {
    return hyperspace(html, function (row) {
        if (!row) {
            this.emit('no-more');
            return undefined;
        }
        return {
            '.time': row.time,
            '.who': row.who,
            '.message': row.message
        };
    });
};
```

and we can listen for the `'no-more'` event in `browser.js`:

``` js
render.on('no-more', function () {
    more.parentNode.removeChild(more);
});
```

which removes the `more` button from the page when the end of the feed is
reached.

The complete code for this demo is in `example/more`.

# methods

``` js
var hyperspace = require('hyperspace')
```

# var render = hyperspace(html, f)

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

Append the html elements created from the hyperspace transform function
`f(row)` directly to `target`.

`target` can be an html element or a css selector.

## render.prependTo(target)

Prepend the html elements created from the hyperspace transform function
`f(row)` directly to `target`.

`target` can be an html element or a css selector.

## render.sortTo(target, cmp)

Insert the html elements created from the hyperspace transform function
`f(row)` to `target` using the sorting function `cmp(a, b)` for each html
element `a` and `b` to be sorted.

`target` can be an html element or a css selector.

# browser events

## render.on('element', function (elem) {})

This event fires for all elements created by the result stream, including those
elements created server-side so long as `.prependTo()` or `.appendTo()` as been
called on the same container that the server populated content with.

## render.on('parent', function (elem) {})

This event fires with the container element when `.appendTo()`, `.prependTo()`,
or `.sortTo()` is called.

# install

With [npm](https://npmjs.org) do:

```
npm install hyperspace
```

# license

MIT

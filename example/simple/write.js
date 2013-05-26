var r = require('./render')();
r.pipe(process.stdout);
r.write(JSON.stringify({ who: 'substack', message: 'beep boop' }) + '\n');
r.write(JSON.stringify({ who: 'h4ckr', message: 'h4x' }) + '\n');

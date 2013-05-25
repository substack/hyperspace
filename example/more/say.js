#!/usr/bin/env node
var fs = require('fs');
var ws = fs.createWriteStream('data.txt', { flags: 'a' });

ws.write(JSON.stringify({
    who: process.argv[2],
    message: process.argv.slice(3).join(' '),
    time: Date.now()
}) + '\n');

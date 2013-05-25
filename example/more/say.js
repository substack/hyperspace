#!/usr/bin/env node
var fs = require('fs');
var ws = fs.createWriteStream('data.txt', { flags: 'a' });

ws.write(JSON.stringify({
    who: process.argv[2],
    message: process.argv.slice(2).join(' '),
    time: Date.now()
}) + '\n');

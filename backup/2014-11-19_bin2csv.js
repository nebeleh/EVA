#!/usr/bin/env node

var fs = require('fs');

var inp = fs.openSync('pa_rac_all.txt', 'r');
var out = fs.openSync('pa_rac_all.csv', 'w');

var byteSchema = [8,8,8,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,8,2];

for(var t = 0; t < 2845527; t++) {
  if (t % 10000 == 0) console.log('processing line ' + t);
  for (var i = 0; i < byteSchema.length; i++) {
    var buf = new Buffer(byteSchema[i]);
    fs.readSync(inp, buf, 0, buf.length);
    if (byteSchema[i] == 8) {
      fs.writeSync(out, buf.readDoubleLE(0));
    } else {
      fs.writeSync(out, buf.readInt16LE(0));
    }
    if (i < byteSchema.length-1) {
      fs.writeSync(out, ', ');
    } else {
      fs.writeSync(out, '\n');
    }
  }
}

console.log('done');

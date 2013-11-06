#!/usr/bin/env node

// run like this: $./data_handler.js ./weather/temperature

var fs = require('fs');
var $ = jQuery = require('jQuery');
require('../js/jquery.csv.js');

// a multi dimension object of weather data
var processData = function(fn) {
  if (fs.existsSync(fn + '.json')) {
    console.log(fn + '.json already exists. doing nothing ...');
  } else if (!fs.existsSync(fn + '.txt')) {
    console.log('doing nothing as no txt file was found for ' + fn + '.txt');
  } else {
    console.log('processing file ...');
    var buffer = fs.readFileSync(fn + '.txt', 'utf-8');
    var jsonbuf = JSON.stringify($.csv.toArrays(buffer));
    fs.writeFileSync(fn + '.json', jsonbuf);
    console.log('all done.');
  }
}

processData(process.argv[2]);

#!/usr/bin/env node

// run like this: $./lehd_geo_handler.js ./lehd/pa_od_file.csv ./geo/test.dbf
//
// This is a special handler for LEHD dataset. It reads LEHD csv files
// and converts them into binary arrays. It also reads a dbf tiger line
// file and adds lat and long to the columns

var fs = require('fs');
var path = require('path');
var HashMap = require('hashmap').HashMap;
var lineReader = require('line-reader');

var processData = function(sourceFile, geoFile) {

  var basename = path.basename(sourceFile, path.extname(sourceFile));
  var destFile = path.dirname(sourceFile) + '/' + basename + '.txt'; // save destination file as txt in order to force node.js to gzip the file and cache it

  if (fs.existsSync(destFile)) {
    console.log('Destination file ' + destFile + ' already exists. Doing nothing ...');
  } else if (!fs.existsSync(sourceFile)) {
    console.log('Source file ' + sourceFile + ' doesn\'t exist. Doing nothing ...');
  } else if (!fs.existsSync(geoFile)) {
    console.log('Geo file ' + geoFile + ' doesn\'t exist. Doing nothing ...');
  } else {
    console.log('Processing ' + sourceFile + ' with lat long help from ' + geoFile + ' and writing to ' + destFile + ' ...');
    CSVToBin(sourceFile, destFile, geoFile);
  }
}

// converts CSV to Binary file while adding lat and long based on census block code
function CSVToBin(sourceFile, destFile, geoFile, strDelimiter) {

  // read tiger lines file and create a hashmap from census block code to lat/long
  var geomap = new HashMap();
  var inStream = fs.openSync(geoFile, 'r');

  var buf = new Buffer(577); // header of the file. skip over it
  fs.readSync(inStream, buf, 0, buf.length);
  var censusBlock, geoLat, geoLong;

  console.log('processing geo file ...');
  while(true) {
    buf = new Buffer(22);
    if(!fs.readSync(inStream, buf, 0, buf.length)) break;
    
    buf = new Buffer(16);
    fs.readSync(inStream, buf, 0, buf.length);
    censusBlock = parseFloat(buf.toString());

    buf = new Buffer(51);
    fs.readSync(inStream, buf, 0, buf.length);

    buf = new Buffer(11);
    fs.readSync(inStream, buf, 0, buf.length);
    geoLat = parseFloat(buf.toString());
    //console.log('intptlat: ' + parseFloat(buf.toString()));

    buf = new Buffer(12);
    fs.readSync(inStream, buf, 0, buf.length);
    geoLong = parseFloat(buf.toString());

    geomap.set(censusBlock, [geoLat, geoLong]);
  }
  fs.closeSync(inStream);
  console.log('geo done.');

  var outStream = fs.openSync(destFile, 'w');
  var firstLine = true;
  var lineCounter = 0;

  strDelimiter = (strDelimiter || ",");
  var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");

  lineReader.eachLine(sourceFile, function(line, last) {

    // loop through everyline of CSV and convert it to binary data
    line += '\n';
    var arrMatches = null;
    var tempData = [];

    while (arrMatches = objPattern.exec(line)) {
      var strMatchedDelimiter = arrMatches[1];
      if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
        if (tempData.length > 0) {
          // the first line of CSV file is column names. add it to metadata (JSON file) and continue to the next line of CSV
          // TODO reading and managing metadata
          if (firstLine) {
            firstLine = false;
          } else {
            // TODO handle each type of data differently. right now I'm using doubles for everything, even strings
            var buf = new Buffer(8 * (tempData.length + 4));
            for (var i = 0, j = 0; i < tempData.length; i++) {
              buf.writeDoubleLE(parseFloat(tempData[i]), (j++)*8);
              // write lat, long
              if (i <= 1) {
                var censusBlock = parseFloat(tempData[i]);
                buf.writeDoubleLE(geomap.get(censusBlock)[0], (j++)*8);
                buf.writeDoubleLE(geomap.get(censusBlock)[1], (j++)*8);
              }
            }
            lineCounter++;
            if (lineCounter % 1000 == 0)
              console.log('wrote ' + lineCounter + ' lines ...');
            fs.writeSync(outStream, buf, 0, buf.length);
          }
        }
        tempData = [];
      }
      if (arrMatches[2]) {
        var strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"),"\"");
      } else {
        var strMatchedValue = arrMatches[3];
      }
      tempData.push(strMatchedValue);
    }

    // TODO write size of each row and number of rows to metadata JSON in order to make it easier for the client to load the data
    if (last) {
      //outStream.end();
      fs.closeSync(outStream);
      console.log('Wrote ' + lineCounter + ' lines. All done.');
      return false;
    }
    return true;

  });

}

processData(process.argv[2], process.argv[3]);

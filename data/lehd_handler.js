#!/usr/bin/env node

// run like this: $./lehd_handler.js ./lehd/pa_od_file.csv
//
// This is a special handler for LEHD dataset. It reads LEHD csv files
// and converts them into binary arrays.

var fs = require('fs');
var path = require('path');
var lineReader = require('line-reader');

var processData = function(sourceFile) {

  var basename = path.basename(sourceFile, path.extname(sourceFile));
  var destFile = path.dirname(sourceFile) + '/' + basename + '.bin';

  if (fs.existsSync(destFile)) {
    console.log('Destination file ' + destFile + ' already exists. Doing nothing ...');
  } else if (!fs.existsSync(sourceFile)) {
    console.log('Source file ' + sourceFile + ' doesn\'t exist. Doing nothing ...');
  } else {
    console.log('Processing ' + sourceFile + ' and writing to ' + destFile + ' ...');
    CSVToBin(sourceFile, destFile);
  }

}

function CSVToBin(sourceFile, destFile, strDelimiter) {

  var outStream = fs.createWriteStream(destFile);
  var firstLine = true;

  strDelimiter = (strDelimiter || ",");
  var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");

  lineReader.eachLine(sourceFile, function(line, last) {

    // loop through everyline of CSV and convert it to binary data
    line += '\n';
    var arrMatches = null;
    var tempData = [];
    var lineCounter = 0;

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
            var buf = new Buffer(8 * tempData.length);
            for (var i = 0; i < tempData.length; i++) {
              buf.writeDoubleLE(parseFloat(tempData[i]), i*8);
            }
            lineCounter++;
            if (lineCounter % 5000 == 0)
              console.log('wrote ' + lineCounter + ' lines ...');
            outStream.write(buf);
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
      outStream.end();
      console.log('Wrote ' + lineCounter + ' lines. All done.');
      return false;
    }
    return true;

  });

}

processData(process.argv[2]);

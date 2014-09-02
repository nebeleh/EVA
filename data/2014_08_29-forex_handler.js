#!/usr/bin/env node

// run like this: $./forex_handler.js ./forex/forex ./forex/forex.csv
//
// files: output_name input_file.csv
//
// This is a special handler for Forex dataset

var fs = require('fs');
var path = require('path');
var lineReader = require('line-reader');

var metaData = {};

var processData = function(files) {

  // check for destination files
  var basename = path.basename(files[0]);
  var destFile = path.dirname(files[0]) + '/' + basename + '.txt';
  var destJSON = path.dirname(files[0]) + '/' + basename + '.json';

  if (fs.existsSync(destFile)) {
    console.log('Destination binary file ' + destFile + ' already exists. Doing nothing ...');
    return;
  }
  if (fs.existsSync(destJSON)) {
    console.log('Destination JSON file ' + destJSON + ' already exists. Doing nothing ...');
    return;
  }

  // check for source file
  if (!fs.existsSync(files[1])) {
    console.log('Source file ' + files[1] + ' doesn\'t exist. Doing nothing ...');
    return;
  }

  // filling out metaData
  metaData.filename = basename + '.txt';
  metaData.dataClass = 'forex';

  console.log('Processing ' + basename + ' and writing to ' + destFile + ' ...');
  CSVToBin(destFile, destJSON, files[1]);
}

// converts CSV to Binary
function CSVToBin(destFile, destJSON, sourceFile) {

  // create meta data JSON file
  metaData.CSVcolumns = 25;
  metaData.BINcolumns = 25;
  metaData.byteSchema = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, 8);
  metaData.minOfColumn = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, Number.MAX_VALUE);
  metaData.maxOfColumn = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, -Number.MAX_VALUE);

  // read the CSV file and transform it into binary
  var outStream = fs.openSync(destFile, 'w');
  var firstLine = true;
  var lineCounter = 0;

  // calculate buffer size
  var bufferSize = 0;
  for (var b = 0; b < metaData.byteSchema.length; b++)
    bufferSize += metaData.byteSchema[b];
  
  var strDelimiter = ',';
  var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");

  // reading the source file line by line
  lineReader.eachLine(sourceFile, function(line, last) {

    // loop through everyline of CSV and convert it to binary data
    line += '\n';
    var arrMatches = null;
    var tempData = [];
    var dummy;

    while (arrMatches = objPattern.exec(line)) {
      var strMatchedDelimiter = arrMatches[1];
      if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
        if (tempData.length > 0) {
          if (metaData.CSVcolumns != tempData.length) {
            console.log('metadata and actual data do not have the same number of columns, quiting ...');
            return false;
          }
          // the first line of CSV file is column names. add it to metadata
          if (firstLine) {
            metaData.columnNames = []; //tempData;
            for (var i = 0; i < tempData.length; i++) {
              metaData.columnNames.push(tempData[i]);
            }
            firstLine = false;
          } else {
            // create a buffer with the write size
            var buf = new Buffer(bufferSize);
            var offset = 0;
            for (var i = 0, j = 0; i < tempData.length; i++) {

              dummy = parseFloat(tempData[i]);

              // find max and min
              if (!isNaN(dummy)) {
                metaData.minOfColumn[j] = Math.min(metaData.minOfColumn[j], dummy);
                metaData.maxOfColumn[j] = Math.max(metaData.maxOfColumn[j], dummy);
              }

              (metaData.byteSchema[j] == 8) ? buf.writeDoubleLE(dummy, offset) : buf.writeInt16LE(dummy, offset);
              offset += metaData.byteSchema[j];
              j++;

            }
            lineCounter++;
            if (lineCounter % 10000 == 0)
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

    if (last) {
      fs.closeSync(outStream);
      metaData.totalRows = lineCounter;
      fs.writeFileSync(destJSON, JSON.stringify(metaData));
      console.log('Wrote ' + lineCounter + ' lines. All done.');
      return false;
    }
    return true;

  });
}

processData(process.argv.slice(2));

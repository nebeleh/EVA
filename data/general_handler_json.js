#!/usr/bin/env node

// run like this: $./general_handler_json.js ./weather/temperature
//
// This is a general data handler. It reads a text file (written as csv) line by line
// and converts each line into and array. It then writes the array into JSON format
// and creates a .json file with the same name.

var fs = require('fs');
var lineReader = require('line-reader');

var processData = function(fn) {
  if (fs.existsSync(fn + '.json')) {
    console.log(fn + '.json already exists. doing nothing ...');
  } else if (!fs.existsSync(fn + '.txt')) {
    console.log('doing nothing as no txt file was found for ' + fn + '.txt');
  } else {
    console.log('processing file ...');
    CSVToFile(fn + '.txt', fn + '.json');
  }
}

function CSVToFile(sourceFile, destFile, strDelimiter) {
  strDelimiter = (strDelimiter || ",");

  var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
  fs.writeFileSync(destFile, '[');

  lineReader.eachLine(sourceFile, function(line, last) {
    line += '\n';
    var arrMatches = null;
    var tempData = [];
    while (arrMatches = objPattern.exec(line)) {
      var strMatchedDelimiter = arrMatches[1];
      if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
        if (tempData.length > 0) {
          fs.appendFileSync(destFile, JSON.stringify(tempData));
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
      fs.appendFileSync(destFile, ']');
      console.log('all done.');
      return false;
    }
    fs.appendFileSync(destFile, ',');
    return true;
  });
}

processData(process.argv[2]);

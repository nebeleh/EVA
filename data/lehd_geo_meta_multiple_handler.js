#!/usr/bin/env node

// run like this: $./lehd_geo_meta_multiple_handler.js ./geo/test.dbf ./lehd/pa_rac_all ./lehd/pa_rac_fil1.csv ./lehd/pa_rac_file2.csv ...
//
// files: tiger_line.dbf output_name list_of_input_files.csv
//
// This is a special handler for LEHD dataset. It reads LEHD csv files
// and converts them into binary arrays. It also reads a dbf tiger line
// file and adds lat and long to the columns. It also creates a metadata file
// alongside the binary file. This metadata file contains information about the
// structure of the data, its min and max, etc.

var fs = require('fs');
var path = require('path');
var HashMap = require('hashmap').HashMap;
var lineReader = require('line-reader');
var util = require('util');
var exec = require('child_process').exec;
var child;

var metaData = {};

var processData = function(files) {

  // check for auxiliary files
  var geoFile = files[0];
  if (!fs.existsSync(geoFile)) {
    console.log('Geo file ' + geoFile + ' doesn\'t exist. Doing nothing ...');
    return;
  }

  // check for destination files
  var basename = path.basename(files[1]);
  var destFile = path.dirname(files[1]) + '/' + basename + '.txt'; // save destination file as txt in order to force node.js to gzip the file and cache it
  var destJSON = path.dirname(files[1]) + '/' + basename + '.json';

  if (fs.existsSync(destFile)) {
    console.log('Destination binary file ' + destFile + ' already exists. Doing nothing ...');
    return;
  }
  if (fs.existsSync(destJSON)) {
    console.log('Destination JSON file ' + destJSON + ' already exists. Doing nothing ...');
    return;
  }

  // what type of file this is?
  var dataClass = '';
  if (basename[3] === 'o')
    dataClass = 'od';
  else if (basename[3] === 'r')
    dataClass = 'rac';
  else if (basename[3] === 'w')
    dataClass = 'wac';
  else {
    console.log('LEHD class of output file ' + basename + ' is not recognizable. It should be ST_od, ST_rac or ST_was. Doing nothing ...');
    return;
  }

  // check for source csv files
  var csvFiles = files.slice(2);
  for (var f = 0; f < csvFiles.length; f++) {
    if (!fs.existsSync(csvFiles[f])) {
      console.log('Source file ' + csvFiles[f] + ' doesn\'t exist. Doing nothing ...');
      return;
    }
    if ((path.basename(csvFiles[f]))[3] !== dataClass[0]) {
      console.log('The source file ' + csvFiles[f] + ' is from a different format than expected. Doing nothing ...');
      return;
    }
  }

  // filling out metaData
  metaData.filename = basename + '.txt';
  metaData.dataClass = dataClass;

  console.log('Processing ' + basename + ' with lat long help from ' + geoFile + ' and writing to ' + destFile + ' ...');
  CSVsToBin(destFile, geoFile, dataClass, destJSON, csvFiles);
}

// converts CSV to Binary file while adding lat and long based on census block code
function CSVsToBin(destFile, geoFile, dataClass, destJSON, sourceFiles) {

  // create column name hashmap
  // TODO: don't add ' to texts. client's dropdown list cannot handle it now.
  var namemap = new HashMap();
  namemap.set('w_geocode', 'Workplace Census Block Code');
  namemap.set('h_geocode', 'Residence Census Block Code');
  namemap.set('S000', 'Total number of jobs');
  namemap.set('SA01', 'Number of jobs of workers age 29 or younger');
  namemap.set('SA02', 'Number of jobs for workers age 30 to 54');
  namemap.set('SA03', 'Number of jobs for workers age 55 or older');
  namemap.set('SE01', 'Number of jobs with earnings $1250/month or less');
  namemap.set('SE02', 'Number of jobs with earnings $1251/month to $3333/month');
  namemap.set('SE03', 'Number of jobs with earnings greater than $333/month');
  namemap.set('SI01', 'Number of jobs in Goods Producing industry sectors');
  namemap.set('SI02', 'Number of jobs in Trade, Transportation, and Utilities industry sectors');
  namemap.set('SI03', 'Number of jobs in All Other Services inductry sectors');
  namemap.set('createdate', 'Date on which data was created');
  namemap.set('C000', 'Total number of jobs');
  namemap.set('CA01', '#j for workers age 29 or younger');
  namemap.set('CA02', '#j for workers age 30 to 54');
  namemap.set('CA03', '#j for workers age 55 or older');
  namemap.set('CE01', '#j with earnings $1250/month or less');
  namemap.set('CE02', '#j with earnings $1251/month to $3333/month');
  namemap.set('CE03', '#j with earnings greater than $3333/month');
  namemap.set('CNS01', '#j agriculture, forestry, fishing and hunting');
  namemap.set('CNS02', '#j mining, quarrying, and oil and gas extraction');
  namemap.set('CNS03', '#j utilities');
  namemap.set('CNS04', '#j construction');
  namemap.set('CNS05', '#j manufacturing');
  namemap.set('CNS06', '#j wholesale trade');
  namemap.set('CNS07', '#j retail trade');
  namemap.set('CNS08', '#j transportation and warehousing');
  namemap.set('CNS09', '#j information');
  namemap.set('CNS10', '#j finance and insurance');
  namemap.set('CNS11', '#j real estate and rental and leasing');
  namemap.set('CNS12', '#j professional, scientific, and technical services');
  namemap.set('CNS13', '#j management of companies and enterprises');
  namemap.set('CNS14', '#j administrative and support and waste management and remediation services');
  namemap.set('CNS15', '#j educational services');
  namemap.set('CNS16', '#j health care and social assitance');
  namemap.set('CNS17', '#j arts, entertainment and recreation');
  namemap.set('CNS18', '#j accommodation and food services');
  namemap.set('CNS19', '#j other services except public administration');
  namemap.set('CNS20', '#j public administration');
  namemap.set('CR01', '#j for workers with race: white, alone');
  namemap.set('CR02', '#j for workers with race: black or african american alone');
  namemap.set('CR03', '#j for workers with race: american indian or alaska native alone');
  namemap.set('CR04', '#j for workers with race: asian alone');
  namemap.set('CR05', '#j for workers with race: native hawaiian or other pacific islander alone');
  namemap.set('CR07', '#j for workers with race: two or more race groups');
  namemap.set('CT01', '#j for workers with ethnicity: not hispanic or latino');
  namemap.set('CT02', '#j for workers with ethnicity: hispanic or latino');
  namemap.set('CD01', '#j for workers with educational attainment: less than high school');
  namemap.set('CD02', '#j for workers with educational attainment: high school or equivalent, no college');
  namemap.set('CD03', '#j for workers with educational attainment: some college or associate degree');
  namemap.set('CD04', '#j for workers with educational attainment: bachelor degree or advanced degree');
  namemap.set('CS01', '#j for workers with sex: male');
  namemap.set('CS02', '#j for workers with sex: female');
  namemap.set('CFA01', '#j for workers at firms with firm age: 0-1 years');
  namemap.set('CFA02', '#j for workers at firms with firm age: 2-3 years');
  namemap.set('CFA03', '#j for workers at firms with firm age: 4-5 years');
  namemap.set('CFA04', '#j for workers at firms with firm age: 6-10 years');
  namemap.set('CFA05', '#j for workers at firms with firm age: 11+ years');
  namemap.set('CFS01', '#j for workers at firms with firm size: 0-19 employees');
  namemap.set('CFS02', '#j for workers at firms with firm size: 20-49 employees');
  namemap.set('CFS03', '#j for workers at firms with firm size: 50-249 employees');
  namemap.set('CFS04', '#j for workers at firms with firm size: 250-499 employees');
  namemap.set('CFS05', '#j for workers at firms with firm size: 500+ employees');

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

  // create meta data JSON file
  if (dataClass === 'od') {
    metaData.CSVcolumns = 14;
    metaData.censusBlock = Array.apply(null, new Array(metaData.CSVcolumns)).map(Number.prototype.valueOf, 0);
    metaData.censusBlock[0] = 1;
    metaData.censusBlock[1] = 1;
    metaData.BINcolumns = 18;
    // initially, all numbers are 2 bytes signed ints
    metaData.byteSchema = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, 2);
    // define which numbers are 8 bytes doubles
    metaData.byteSchema[0] = metaData.byteSchema[1] = metaData.byteSchema[2] = metaData.byteSchema[3] = metaData.byteSchema[4] = metaData.byteSchema[5] = metaData.byteSchema[16] = 8;
  } else if (dataClass === 'rac' ) {
    metaData.CSVcolumns = 44;
    metaData.censusBlock = Array.apply(null, new Array(metaData.CSVcolumns)).map(Number.prototype.valueOf, 0);
    metaData.censusBlock[0] = 1;
    metaData.BINcolumns = 46;
    metaData.byteSchema = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, 2);
    metaData.byteSchema[0] = metaData.byteSchema[1] = metaData.byteSchema[2] = metaData.byteSchema[44] = 8;
  } else if (dataClass === 'wac') {
    metaData.CSVcolumns = 54;
    metaData.censusBlock = Array.apply(null, new Array(metaData.CSVcolumns)).map(Number.prototype.valueOf, 0);
    metaData.censusBlock[0] = 1;
    metaData.BINcolumns = 56;
    metaData.byteSchema = Array.apply(null, new Array(metaData.BINcolumns)).map(Number.prototype.valueOf, 2);
    metaData.byteSchema[0] = metaData.byteSchema[1] = metaData.byteSchema[2] = metaData.byteSchema[54] = 8;
  } else {
    console.log('this data class not implemented yet.');
    return;
  }
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
  
  var strDelimiter = ",";
  var objPattern = new RegExp(("(\\" + strDelimiter + "|\\r?\\n|\\r|^)" + "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" + "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");

  // combinding all files together and then reading it line by line
  // TODO: improving this section. there should be a better way
  var cmd = 'rm combined.csv -f';
  cmd += ' && head -n +1 ' + sourceFiles[0] + ' | awk \'{print $0, ",year"}\' > combined.csv'
  for (var f = 0; f < sourceFiles.length; f++) {
    var s = path.basename(sourceFiles[f], '.csv');
    cmd += ' && tail -n +2 ' + sourceFiles[f] + ' | awk \'{print $0, ",' + s.slice(s.length-4) + '"}\' >> combined.csv';
  }
  child = exec(cmd, function (error, stdout, stderr) {

    if (error !== null) {
      console.log('couldn\'t combine csv files: ' + error);
      return;
    }

    // reading the combined file line by line
    lineReader.eachLine('combined.csv', function(line, last) {

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
                if (typeof namemap.get(tempData[i]) !== "undefined")
                  metaData.columnNames.push(namemap.get(tempData[i]));
                else
                  metaData.columnNames.push(tempData[i]);

                if (metaData.censusBlock[i]) {
                  metaData.columnNames.push(namemap.get(tempData[i]) + ' LAT');
                  metaData.columnNames.push(namemap.get(tempData[i]) + ' LONG');
                }
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

                // write lat, long
                if (metaData.censusBlock[i]) {
                  var censusBlock = parseFloat(tempData[i]);

                  dummy = geomap.get(censusBlock)[0];

                  if (!isNaN(dummy)) {
                    metaData.minOfColumn[j] = Math.min(metaData.minOfColumn[j], dummy);
                    metaData.maxOfColumn[j] = Math.max(metaData.maxOfColumn[j], dummy);
                  }

                  (metaData.byteSchema[j] == 8) ? buf.writeDoubleLE(dummy, offset) : buf.writeInt16LE(dummy, offset);
                  offset += metaData.byteSchema[j];
                  j++;

                  dummy = geomap.get(censusBlock)[1];

                  if (!isNaN(dummy)) {
                    metaData.minOfColumn[j] = Math.min(metaData.minOfColumn[j], dummy);
                    metaData.maxOfColumn[j] = Math.max(metaData.maxOfColumn[j], dummy);
                  }

                  (metaData.byteSchema[j] == 8) ? buf.writeDoubleLE(dummy, offset) : buf.writeInt16LE(dummy, offset);
                  offset += metaData.byteSchema[j];
                  j++;
               }
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

      // TODO write size of each row and number of rows to metadata JSON in order to make it easier for the client to load the data
      if (last) {
        fs.closeSync(outStream);
        metaData.totalRows = lineCounter;
        fs.writeFileSync(destJSON, JSON.stringify(metaData));
        console.log('Wrote ' + lineCounter + ' lines. All done.');
        return false;
      }
      return true;

    });
  });
}

processData(process.argv.slice(2));

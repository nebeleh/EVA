var fs = require('fs');
var $ = jQuery = require('jQuery');
require('../js/jquery.csv.js');

module.exports = {
  getData: function(dataset) {
    switch(dataset) {
      case 'pitt-temperature':
        return pittTempData();
        break;
      case 'pitt-weather':
        return pittWeatherData();
        break;
      default:
        break;
    }
  }
};

// a multi dimension object of weather data
var pittWeatherData = function() {
  if (fs.existsSync('data/weather/weather.json')) {
    return (fs.readFileSync('data/weather/weather.json', 'utf-8'));
  }

  var buffer = fs.readFileSync('data/weather/weather.txt', 'utf-8');
  var jsonbuf = JSON.stringify($.csv.toObjects(buffer));
  fs.writeFileSync('data/weather/weather.json', jsonbuf);
  return jsonbuf;
}

// a single dimension array of temperature readings
var pittTempData = function() {
  if (fs.existsSync('data/weather/temperature.json')) {
    return (fs.readFileSync('data/weather/temperature.json', 'utf-8'));
  }

  var buffer = fs.readFileSync('data/weather/temperature.txt');
  var myArray = buffer.toString().split('\r\n');
  var ndata = [];
  for (var i = 0; i < myArray.length; i++) {
    ndata[i] = parseFloat(myArray[i]);
  }
  buffer = JSON.stringify(ndata);
  fs.writeFileSync('data/weather/temperature.json', buffer);
  return buffer;
}


var express = require('express');
var fs = require('fs');
var dh = require('./data/data_handler');
//var $ = jQuery = require('jQuery');
//require('./js/jquery.csv.js');

var app = express();

app.get('/', function(request, response) {
  var buffer = fs.readFileSync('html/index.html');
  response.send(buffer.toString());
});

app.get('/data', function(req, res) {
  res.json(dh.getData(req.query.set));
});

app.configure(function() {
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/css', express.static(__dirname + '/css'));
})

var port = process.env.PORT || 8080;
  app.listen(port, function() {
  console.log("Listening on " + port);
});

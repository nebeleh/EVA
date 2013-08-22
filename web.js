var express = require('express');
var fs = require('fs');

var app = express();

app.get('/', function(request, response) {
  var buffer = fs.readFileSync('html/index.html');
  response.send(buffer.toString());
});

app.get('/data', function(req, res) {
  var buffer = fs.readFileSync('data/temperature.txt');
  var myArray = buffer.toString().split('\r\n');
  var ndata = [];
  for (var i = 0; i < myArray.length; i++) {
    ndata[i] = parseFloat(myArray[i]);
  }
  res.json(JSON.stringify(ndata));
});

app.configure(function() {
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/css', express.static(__dirname + '/css'));
  //app.use('/data', express.static(__dirname + '/data'));
})

var port = process.env.PORT || 8080;
  app.listen(port, function() {
  console.log("Listening on " + port);
});

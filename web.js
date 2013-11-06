var express = require('express');
var fs = require('fs');

var app = express();
app.use(express.compress());

app.get('/', function(request, response) {
  var buffer = fs.readFileSync('html/index.html');
  response.send(buffer.toString());
});

app.configure(function() {
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/css', express.static(__dirname + '/css'));
  app.use('/data', express.static(__dirname + '/data'));
})

var port = process.env.PORT || 8080;
  app.listen(port, function() {
  console.log("Listening on " + port);
});

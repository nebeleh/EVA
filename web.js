var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();
app.use(compression());
app.use(bodyParser.raw());

app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/data', express.static(__dirname + '/data', { maxAge: oneHour}));

var oneHour = 3600000;

app.get('/', function(request, response) {
  var buffer = fs.readFileSync('html/index.html');
  response.send(buffer.toString());
});

// logger for experiments
var log;
app.post('/setLogger', function (req, res) {
  log = fs.createWriteStream('logs/user-' + req.body.user + '-time-' + req.body.time, {'flags': 'a'});
  res.send('');
});
app.post('/logger', function (req, res) {
  log.write(JSON.stringify(req.body) + '\n');
  res.send('');
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});

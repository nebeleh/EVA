var express = require('express');
var fs = require('fs');

var app = express();
app.use(express.compress());
app.use(express.bodyParser());

var oneHour = 3600000;

app.get('/', function(request, response) {
  var buffer = fs.readFileSync('html/index.html');
  response.send(buffer.toString());
});


/*
// logger for experiments
var log;
app.post('/setLogger', function (req, res) {
  log = fs.createWriteStream('logs/user-' + req.body.user + '-time-' + req.body.time, {'flags': 'a'});
  res.send('');
});
app.post('/logger', function (req, res) {
  log.write(JSON.stringify(req.body) + '\n');
  res.send('');
});*/

app.configure(function() {
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/css', express.static(__dirname + '/css'));
  app.use('/data', express.static(__dirname + '/data', { maxAge: oneHour}));
})

var port = process.env.PORT || 8081;
app.listen(port, function() {
  console.log("Listening on " + port);
});

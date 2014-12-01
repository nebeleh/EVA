var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var fs = require('fs');
var shortId = require('shortid');

var app = express();
app.use(compression());
app.use(bodyParser.json());

app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/data', express.static(__dirname + '/data', { maxAge: oneHour}));

var oneHour = 3600000;

app.get('/', function (req, res) {
  fs.readFile('html/index.html', function (err, buffer) {
    if (err) throw err;
    res.send(buffer.toString());
  });
});


// share (create): receive a snapshot, create a share file, send the file hash
app.post('/createShareView', function (req, res) {
  var fname = 'view-' + Date.now() + '-' + shortId.generate();
  var fout = fs.createWriteStream('shares/' + fname, {'flags': 'a'});

  var obj = {type: "view", uid: fname, count: 0, snapshot: req.body};

  fout.write(JSON.stringify(obj));

  res.send(fname);
});

app.post('/createShareHistory', function (req, res) {
  var fname = 'history-' + Date.now() + '-' + shortId.generate();
  var fout = fs.createWriteStream('shares/' + fname, {'flags': 'a'});

  var obj = {type: "history", uid: fname, count: 0, snapshots: req.body};

  fout.write(JSON.stringify(obj));

  res.send(fname);
});

// share (read): receive a file hash, read the content from share folder and return it
app.post('/loadShareView', function (req, res) {
  fs.readFile('shares/'+req.body.uid, function (err, buffer) {
    if (err) {
      res.send('');
    } else {
      var obj = JSON.parse(buffer.toString());

      // make necessary changes to the share file
      obj.count++;
      var fout = fs.createWriteStream('shares/' + obj.uid);
      fout.write(JSON.stringify(obj));

      // send info to client
      res.send(JSON.stringify(obj));
    }
  });
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


// start the server
var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});

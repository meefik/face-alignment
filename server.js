var port = process.env.PORT || 3000;
var host = process.env.HOST || '0.0.0.0';

var path = require('path');
var express = require('express');
var app = express();
var server = require('http').Server(app);

app.enable('trust proxy');
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  res.status(404).end();
});

server.listen(port, host, function() {
  console.log('Server listening on port ' + server.address().port);
});

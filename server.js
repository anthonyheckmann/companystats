//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http'),
    path = require('path'),
    async = require('async'),
    socketio = require('socket.io'),
    express = require('express'),
    sqlite3 = require('sqlite3'),
    util = require('util'),
    url = require('url'),
    httpAgent = require('http-agent'),
    jsdom = require('jsdom').jsdom,
    db,
    _ = require('underscore'),
    zlib = require('zlib');



//init things here
doDBstuff();
var rawDeflater=zlib.createDeflateRaw();

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];


// ##Scraper
function printTop3(body) {
    jsdom.env(
    body, ["http://code.jquery.com/jquery.js"],

    function(errors, window) {

        $ = window.$;
        //
        // Now you can use jQuery to your heart's content!
        //
        var titles = $('.title a'),
            points = $('.subtext span');

        var printme = $.map(points, function(el, i) {
            if (i < 3) {
                return $(el).text() + '\t' + $(titles[i]).text();
            }
        });

        console.log(printme.join('\n'));
    });
}

var urls = ['', 'newest'],
    nowdate=Date.now();
//check if any urls have been cached.
    _.each(urls,function (ploop) {
        db.get(
            "SELECT whenvisited, domain, url FROM webcache WHERE whenvisited > ? AND whenvisited < ?",
            [],
            function (err,row)
            {
                if (row)
                {

                }
                else
                {

                }
            }
        )

    });
var agent = httpAgent.create('news.ycombinator.com', urls);
console.log('Scraping', urls.length, 'pages from', agent.host);

agent.addListener('next', function(err, agent) {

    zlib.deflateRaw(agent.body, function() {
        db.run("INSERT INTO webcache VALUES(?,?,?,?)", agent.host || "", Date.now(), agent.url, this);
        });


    printTop3(agent.body);
    console.log();
    agent.next();
});

agent.addListener('stop', function(err, agent) {
    if (err)
        console.log(err);
    console.log('All done!');
});

// Start scraping
agent.start();




// SQL connection

function doDBstuff() {
    db = new sqlite3.cached.Database("db_test.db");

    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS lorem (info TEXT)");

        db.run("CREATE TABLE IF NOT EXISTS webcache (domain TEXT, whenvisited INTEGER,url TEXT,body TEXT)");

        db.run("CREATE TABLE IF NOT EXISTS company (name TEXT)");


        var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
        for (var i = 0; i < 10; i++) {
            stmt.run("Ipsum " + i);
        }
        stmt.finalize();

        db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
            console.log(row.id + ": " + row.info);
        });
    });
};
//db.close();








// ##socket.io stuff
io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('compmessage', function (msg) {
      var twitter = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          twitter: twitter,
          agent: agent,
        };

        broadcast('compmessage', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

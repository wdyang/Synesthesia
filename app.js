//////////////////////////////////////////
///
/// SYNESTHESIA
/// A collaboration between Kinetech and Hack Reactor
///
/// November 2013
/// Weidong Yang
/// David Ryan Hall
/// George Bonner
/// Kate Jenkins
/// Joey Yang
///
/// Check out http://kine-tech.org/ for more information.
///
//////////////////////////////////////////

// Instantiate server
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var port = process.env.PORT || 8080;
server.listen(port);
var io = require('socket.io').listen(server);
app.set('io', io);
// var db = require('./server/database_server');
// var helpers = require('./server/helpers');
var routes = require('./config/routes.js');
var middleware = require('./config/middleware.js');

// define socket.io spaces
var conductor = io.of('/conductor');
var clients = io.of('/client');
var fireworks = io.of('/fireworks');
var dancer = io.of('/dancer');
var audio = io.of('/audio');

// instantiate state object (keeps track of performance state)
var state = {
  connections: 0,
  strobe: false,
  audio: false,
  audioLights: false,
  motionTrack: false,
  currentColor: '#000000',
  resetMC: function() {
    this.strobe = false;
    this.audio = false;
    this.audioLights = false;
    this.motionTrack = false;
  }
};

// set middleware
middleware.setSettings(app, express);

//////////////////////////////////////////
/// ROUTES
//////////////////////////////////////////


// render routes
app.get('/', routes.renderClient);
app.get('/conductor', routes.renderConductor);
app.get('/fireworks', routes.renderFireworks);
app.get('/audio', routes.renderAudio);
app.get('/dancer', routes.renderDancer);
app.get('/update', routes.renderUpdate);
app.get('*', routes.render404);
app.use(function(err, req, res, next){
  res.send(500, 'Houston, your server has a problem.');
});

//////////////////////////////////////////
/// EVENTS
//////////////////////////////////////////

//////////////////////////////////////////
/// Visualizer events
//////////////////////////////////////////

fireworks.on('connection', function (firework) {
  firework.emit("welcome", "Visualizer connected.");
});

//////////////////////////////////////////
/// Dancer / Motion Tracker events
//////////////////////////////////////////

dancer.on('connection', function (dancer) {
  dancer.emit('welcome', {
    message: "Connected for motion tracking.",
    tracking: state.motionTrack
  });
  dancer.on('motionData', function (data) {
    fireworks.emit('motionData', data);
  });
});

//////////////////////////////////////////
/// Conductor events
//////////////////////////////////////////

conductor.on('connection', function (conductor) {
  state.resetMC();
  clients.emit('reset');
  dancer.emit('reset');
  audio.emit('reset');

  conductor.emit("welcome");

  conductor.on('changeColor',function (data){
    var clients = io.of('/client');
    state.currentColor = data.color;
    clients.emit('changeColor', data);
  });

  conductor.on('randomColor', function (data){
    var clients = io.of('/client');
    state.currentColor = '#000000';    // Set current to black in the case of random
   clients.emit('randomColor', data);
  });

  conductor.on('toggleSound', function (data){
    state.audio = data.sound;
    audio.emit('toggleSound', data);
  });

  conductor.on('toggleMotion', function (data){
    var dancer = io.of('/dancer');
    if (data.motion) {
      state.motionTrack = true;
    } else if (!data.paint) {
      state.motionTrack = false;
    }
    dancer.emit('toggleMotion', data);
  });

  conductor.on('toggleStrobe', function (data){
    var clients = io.of('/client');
    if (data.strobe) {
      state.strobe = true;
    } else {
      state.strobe = false;
    }
    clients.emit('toggleStrobe');
  });

  conductor.on('audioLightControl', function (data){
    var clients = io.of('/client'); 
    if (data.audio) {
      state.audioLights = true;
    } else {
      state.audioLights = false;
    }
  });

  conductor.on('newFadeTime', function (data){
    var clients = io.of('/client');
    clients.emit('newFadeTime', data);
  });
});

//////////////////////////////////////////
/// Client events
//////////////////////////////////////////

clients.on('connection', function (client) {
  state.connections += 1;

  client.emit("welcome", {
    id: client.id,
    message: "welcome!",
    mode: {
      color: state.currentColor,
      strobe: state.strobe,
      audioLights: state.audioLights
    }
  });

  client.on('disconnect', function (){
    state.connections -= 1;
  });

});

//////////////////////////////////////////
/// Audio events
//////////////////////////////////////////

audio.on('connection', function (audio) {
  audio.emit('welcome', {audio: state.audio});
  audio.on('audio', function (data){
    console.log(data);  // Leave in for test logging until Monday
    var clients = io.of('/client');
    if (state.audioLights) {
      clients.emit('audio', data);
    }
    fireworks.emit('audio', data);
  });
});



io.sockets.on('connection', function (socket) {

  socket.on('move', function (data) {
    console.log(data);
    // socket.broadcast.emit('move', data);

    // http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
    // var x=data.x;
    // var y=data.y;
    // var z=data.z;
    // var w=data.w/2.0/Math.PI;
    // var phi=Math.atan(2.0*(w*x+y*z)/(1.0-2.0*(x*x+y*y)))*180/Math.PI;
    // var theta = Math.asin(2.0*(w*y-z*x))*180/Math.PI;
    // var psi=Math.atan(2.0*(w*z+x*y)/(1-2.0*(y*y+z*z)))*180/Math.PI;
    // console.log(Math.floor(phi), Math.floor(theta), Math.floor(psi));


  });

});

var http = require('http'),
	express = require('express'),
	app = express(),
	engines = require('consolidate'),
	io = require('socket.io');

//var app = module.exports.app = express();

app.engine('html', engines.htmling);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.get('/', function(req, res){
	res.render('index', {
		title: 'Front page'
	});
});
app.get('/ctrl', function(req, res){
	res.render('ctrl', {
		title: 'Mobile view'
	});
});

// Middleware
app.use(express.static(__dirname + '/views'));
app.use('/static', express.static(__dirname + '/static'));
app.use(express.static(__dirname + '/static'));


var server = app.listen(3000);
var socket = io.listen(server);

var clients = {
	screens : [],
	ctrls: []
};

socket.on('connection', function(client){

	client.on('register', function(data){

		var registerID = client.id;

		if(data.id == 'screen') {
			clients['screens'].push(registerID);
		} else if(data.id == 'ctrl') {
			clients['ctrls'].push(registerID);
		}

		socket.to(registerID).emit('registered', {id: registerID, type: data.id});

		console.log(clients);
	});

	client.on('ready', function(data){
		console.log('Client ready: ', data);
		for(key in clients) {
			for(var c = 0, b = clients[key].length; c < b; c++) {
				if (clients[key][c] != data.ctrl) {
					if(clients['screens'].length) {
						for(var a = 0, b = clients['screens'].length; a < b; a++) {
							socket.to(clients['screens'][a]).emit('ready', {player: data.ctrl});
						}
					}
				}
			}
		}
	});

	client.on('started playing', function(){
		for(var c = 0, d = clients['ctrls'].length; c < d; c++) {
			socket.to(clients['ctrls'][c]).emit('started');
		}
	});

	client.on('get beat', function(value){
		if(clients['ctrls'].length) {
			var reciever = value.to;
			socket.to(reciever).emit('beat', {value: value.value, pos: value.position});
		}
	});

	client.on('player score', function(data){
		for(var e = 0, f = clients['screens'].length; e < f; e++) {
			socket.to(clients['screens'][e]).emit('score', {id: data.playerId, score: data.score});
		}
	});

	client.on('disconnect', function(){
		console.log('Disconnected', client.id);
		for(key in clients) {
			for(var a = 0, b = clients[key].length; a < b; a++) {
				if(client.id == clients[key][a]) {
					var indexOfClient = clients[key].indexOf(a);
					clients[key].splice(indexOfClient, 1);
				}
			}
		}
	});
});

console.log('Express server listening on port 3000');
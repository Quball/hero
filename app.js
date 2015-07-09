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

var clients = {};

socket.on('connection', function(client){

	client.emit('welcome', 'client');

	client.on('register', function(data){
		clients[data.id] = client.id;
		console.log(clients);
	});

	client.on('button pressed', function(data){
		console.log('Button pressed on front', data);
	});

	client.on('disconnect', function(){
		console.log('Disconnected')
	});

	client.on('get beat', function(value){
		if(clients.ctrl) {
			var reciever = clients[value.to];
			socket.to(reciever).emit('beat', {value: value.value, pos: value.position});
		}
	});
});

console.log('Express server listening on port 3000');
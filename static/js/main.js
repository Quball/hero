var socket = io.connect('http://192.168.1.123:3000');

var playersInRoom = [],
	$playersList = $('.overlay .players'),
	$startBtn = $('#start');

$startBtn.hide();

$(function() {
	socket.emit('register', {id: 'screen'});

	socket.on('registered', function(data) {
		console.log(data);
	});

	socket.on('ready', function(data){
		console.log('PLayers ready: ', data.player);
		if($.inArray(data.player, playersInRoom) == -1) {
			playersInRoom.push(data.player)
			$playersList.append('<div class="player ' + data.player + '"><p>Name:</p><p>' + data.player + '</p><p>Score:</p><p class="playerscore"></p></div>')
			console.log(playersInRoom);
		}
	});

	socket.on('score', function(data){
		console.log('client ', data.id, ' has score of ', data.score);
		$playersList.find('.'+data.id+' .playerscore').text(data.score);
	});
});

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var analyser = audioCtx.createAnalyser(),
	sourceNode,
	ScriptProcessorNode,
	dataArray,
	sampleRate,
	bufferLength;
var freqCanvas = $('#frequencyCanvas').get()[0],
	canvasCtx = freqCanvas.getContext('2d'),
	WIDTH = freqCanvas.width,
	HEIGHT = freqCanvas.height,
	drawVisual;

// MUSIC SETTINGS

// Frequency threshold
var threshold = 2500;
// Usually 3500, lower quality stuff 2500

// Difficulty, delay between beats
var delay = 300;
// ReallyHard: 250, Hard: 300. Medium: 350, Easy: 400
// Usually 350, lower quality stuff 300

// Used to calculate time since last beat
var timeSinceBeat = 0;

/**
 * Setup and load audio
 */

setupAudioNodes();
loadSound('video/domi.mp4');

function setupAudioNodes() {
	// setup a javascript node
	ScriptProcessorNode = audioCtx.createScriptProcessor(2048, 1, 1);

	// connect to destination, else it isn't called
	ScriptProcessorNode.connect(audioCtx.destination);

	sampleRate = audioCtx.sampleRate;

	// setup analyser
	analyser.smoothingTimeConstant = 0.3;
	analyser.fftSize = 128;

	bufferLength = analyser.fftSize;
	dataArray = new Float32Array(bufferLength);

	// create a buffer source node
	sourceNode = audioCtx.createBufferSource();

	// connect the source to the analyser
	sourceNode.connect(analyser);

	// connect the splitter to the javascriptnode, we use the jsNode to draw at a specific interval
	analyser.connect(ScriptProcessorNode);

	// and connect to destination
	sourceNode.connect(audioCtx.destination);

	console.log('Bufferlength: ', bufferLength);
}

function loadSound(url) {
	var request = new XMLHttpRequest();
	request.open('GET', 'assets/'+url, true);
	request.responseType = 'arraybuffer';

	// when loaded decode the data
	request.onload = function() {

		// decode the data
		audioCtx.decodeAudioData(request.response, function(buffer) {
			// when audio is decoded play the sound
			console.log('Sound ready');
			$startBtn.show();
			playSound(buffer);
		}, onError);
	};
	request.send();

	function onError(e) {
		console.log('Error playing soundfile: ', e);
	}
}

function playSound(buffer) {
	sourceNode.buffer = buffer;
}

$startBtn.on('click', function(){
	sourceNode.start();
	socket.emit('started playing');
});

/**
 * Draw to canvas
 */

function drawOscilloscope() {

	drawVisual = requestAnimationFrame(drawOscilloscope);

	var dataArray = new Uint8Array(analyser.frequencyBinCount);
	//analyser.getByteFrequencyData(dataArray);
	analyser.getByteTimeDomainData(dataArray);

	canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

	canvasCtx.lineWidth = 2;
	canvasCtx.strokeStyle = 'rgb(200, 0, 0)';

	canvasCtx.beginPath();

	var diffUp = 0,
		diffDown = 0;

	var sliceWidth = Math.ceil(WIDTH * 1.9 / bufferLength);
	var x = 0;

	var roomLength = playersInRoom.length;

	for(var i = 0; i < bufferLength - 1; i++) {

		var v = dataArray[i] / 128.0;
		var y = v * HEIGHT/2;

		if(i === 0) {
			canvasCtx.moveTo(x, y);
		} else {
			canvasCtx.lineTo(x, y);
		}
		x += sliceWidth;

		if(y > 128) {
			diffUp += y - 128;
		} else if(y < 128) {
			diffDown += 128 - y;
		}
	}

	if(diffUp >= threshold || diffDown >= threshold) {

		var tmpBeatTime = Math.floor(new Date().getTime());

		if(diffUp >= threshold) {
			if(tmpBeatTime >= (timeSinceBeat + delay)) {
				timeSinceBeat = tmpBeatTime;
				for(var a = 0, b = roomLength; a < b; a++) {
					socket.emit('get beat', {to: playersInRoom[a], value: diffUp, position: 0});
				}
			}
		}
		if(diffDown >= threshold) {
			if(tmpBeatTime >= (timeSinceBeat + delay)) {
				timeSinceBeat = tmpBeatTime;
				for(var c = 0, d = roomLength; c < d; c++) {
					socket.emit('get beat', {to: playersInRoom[c], value: diffDown, position: 1});
				}
			}
		}
	}

	//if(diffUp !== null && diffUp >= threshold) {
	//	var tmpTimeUp = Math.floor(new Date().getTime());
	//	if(tmpTimeUp >= (timeSinceBeat + delay)) {
	//		timeSinceBeat = tmpTimeUp;
	//		for(var a = 0, b = roomLength; a < b; a++) {
	//			socket.emit('get beat', {to: playersInRoom[a], value: diffUp, position: 0});
	//		}
	//	}
	//}
	//
	//if(diffDown !== null && diffDown >= threshold) {
	//	var tmpTimeDown = Math.floor(new Date().getTime());
	//	if(tmpTimeDown >= (timeSinceBeat + delay)) {
	//		timeSinceBeat = tmpTimeDown;
	//		for(var c = 0, d = roomLength; c < d; c++) {
	//			socket.emit('get beat', {to: playersInRoom[c], value: diffDown, position: 1});
	//		}
	//	}
	//}

	canvasCtx.lineTo(WIDTH, HEIGHT / 2);
	canvasCtx.stroke();
}

drawOscilloscope();
var socket = io.connect('http://192.168.1.123:3000');
var soundReady = false;

var playersInRoom = [],
	$playersList = $('.overlay .players');

$(function() {
	socket.emit('register', {id: 'screen'});

	socket.on('registered', function(data) {
		console.log(data);
	});

	socket.on('ready', function(data){
		if(soundReady) {
			console.log('PLayers ready: ', data.player);
			if($.inArray(data.player, playersInRoom) == -1) {
				playersInRoom.push(data.player)
				$playersList.append('<p class="' + data.player + '">' + data.player + '<span class="playerscore"></span></p>')
				console.log(playersInRoom);
			}
		}
	});

	socket.on('score', function(data){
		console.log('client ', data.id, ' has score of ', data.score);
		$playersList.find('.'+data.id+' span.playerscore').text(data.score);
	});
});

var video = $('#vid')[0];

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

console.log(WIDTH, HEIGHT);

/**
 * Setup and load audio
 */

setupAudioNodes();
loadSound('domi.mp4');

function setupAudioNodes() {
	// setup a javascript node
	ScriptProcessorNode = audioCtx.createScriptProcessor(2048, 1, 1);

	// connect to destination, else it isn't called
	ScriptProcessorNode.connect(audioCtx.destination);

	sampleRate = audioCtx.sampleRate;

	// setup analyser
	analyser.smoothingTimeConstant = 0.3;
	analyser.fftSize = 512;

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
	request.open('GET', 'assets/video/'+url, true);
	request.responseType = 'arraybuffer';

	// when loaded decode the data
	request.onload = function() {

		// decode the data
		audioCtx.decodeAudioData(request.response, function(buffer) {
			// when audio is decoded play the sound
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
	soundReady = true;
}

$('#start').on('click', function(){
	sourceNode.start();
	video.play();
	socket.emit('started playing');
});

/**
 * Draw to canvas
 */

canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

// flags controlling socket emits
var prevLeft = 0,
	prevLast = null;

function draw() {

	drawVisual = requestAnimationFrame(draw);

	// get the average for the first channel
	var dataArray = new Uint8Array(analyser.frequencyBinCount);
	//analyser.getByteFrequencyData(dataArray);
	analyser.getByteTimeDomainData(dataArray);

	canvasCtx.fillStyle = 'rgb(0, 0, 0)';
	canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

	var barWidth = (WIDTH / bufferLength) * 2.5,
		barHeight;
	var x = 0;
	var	sumLeft = 0,
		sumLast = 0;

	var roomLength = playersInRoom.length;

	// BufferLength = 256
	// Half buffer length = 128

	for(var i = 1; i < bufferLength; i++) {
		if (dataArray[i]) {
			barHeight = dataArray[i];
			canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
			canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
			x += barWidth + 1;
			if(i <= 64) {
				sumLeft += dataArray[i];
			} else if(i >= 192) {
				sumLast += dataArray[i];
			}
		}
	}

	var avgLeft = Math.floor(sumLeft / (bufferLength / 4)),
		avgLast = Math.floor(sumLast / (bufferLength / 4));

	if(avgLeft > 95 && avgLeft != prevLeft) {
		prevLeft = avgLeft;

		for(var a = 0, b = roomLength; a < b; a++) {
			socket.emit('get beat', {to: playersInRoom[a], value: avgLeft, position: 0});
		}
	}

	if(avgLast > 95 && avgLast != prevLast) {
		prevLast = avgLast;

		for(var c = 0, d = roomLength; c < d; c++) {
			socket.emit('get beat', {to: playersInRoom[c], value: avgLast, position: 1});
		}
	}

	/** Testing below
	 *
	 * Might be good for a lightshow, not for this

	//var threshold = 250;
	//
	//var peak = [];
	//
	//for(var i = 0; i < bufferLength;i++) {
	//
	//	if(dataArray[i] > threshold) {
	//		peak.push(i);
	//		i+=1000;
	//	}
	//}
	//
	//if(peak[0] > 0) {
	//	console.log(peak);
	//}

	 End testing */

}

draw();
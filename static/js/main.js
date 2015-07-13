var socket = io.connect('http://192.168.1.123:3000');
var soundReady = false;

var playersInRoom = [],
	$playersList = $('.overlay .players');

$('#start').hide();

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
	request.open('GET', 'assets/video/'+url, true);
	request.responseType = 'arraybuffer';

	// when loaded decode the data
	request.onload = function() {

		// decode the data
		audioCtx.decodeAudioData(request.response, function(buffer) {
			// when audio is decoded play the sound
			console.log('Sound ready');
			$('#start').show();
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
	socket.emit('started playing');
	video.play();
});

/**
 * Draw to canvas
 */

//canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

// flags controlling socket emits
//var prevLeft = 0,
//	prevLast = 0;
//
//var timeSinceLeft = 0,
//	timeSinceLast = 0;
//
//var delayDraw = 750;
//
//var thresholdLeft = 9500,
//	thresholdLast = 9500;

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
	// Half buffer length = 64

	for(var i = 1; i < bufferLength; i++) {
		if (dataArray[i]) {
			barHeight = dataArray[i];
			canvasCtx.fillStyle = 'rgb(' + (barHeight) + ',50,50)';
			canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
			x += barWidth + 1;
			if(i <= 64) {
				sumLeft += dataArray[i];
			}
			if(i >= 192) {
				sumLast += dataArray[i];
			}
		}
	}

	var avgLeft = Math.floor(sumLeft / (bufferLength / 2)),
		avgLast = Math.floor(sumLast / (bufferLength / 2));

	if(sumLeft > thresholdLeft && sumLeft !== prevLeft) {
		prevLeft = sumLeft;
		var tmpTimeLeft = Math.floor(new Date().getTime());
		if(tmpTimeLeft >= (timeSinceLeft + delayDraw)) {
			console.log('left', sumLeft);
			timeSinceLeft = tmpTimeLeft;
			for(var a = 0, b = roomLength; a < b; a++) {
				socket.emit('get beat', {to: playersInRoom[a], value: sumLeft, position: 0});
			}
		}
	}

	if(sumLast > thresholdLast && sumLast !== prevLast) {
		prevLast = sumLast;
		var tmpTimeLast = Math.floor(new Date().getTime());
		if(tmpTimeLast >= (timeSinceLast + delayDraw)) {
			console.log('last', sumLast);
			timeSinceLast = tmpTimeLast;
			for(var c = 0, d = roomLength; c < d; c++) {
				socket.emit('get beat', {to: playersInRoom[c], value: sumLast, position: 1});
			}
		}
	}

	/** Testing below
	 *
	 * Might be good for a lightshow, not for this */

	//var threshold = 245;
	//
	//var peak = [];
	//
	//for(var p = 0; p < bufferLength;) {
	//
	//	if(dataArray[p] > threshold) {
	//		//console.log(dataArray[p], threshold);
	//		peak.push(p);
	//		p+=1000;
	//	}
	//	p++;
	//}
	//
	//if(peak[0] > 0) {
	//	if(peak[0] % 2 == 0) {
	//		console.log('Left ', peak[0]);
	//		for(var a = 0, b = roomLength; a < b; a++) {
	//			socket.emit('get beat', {to: playersInRoom[a], value: peak[0], position: 0});
	//		}
	//	} else {
	//		console.log('Right ', peak[0]);
	//		for(var c = 0, d = roomLength; c < d; c++) {
	//			socket.emit('get beat', {to: playersInRoom[c], value: peak[0], position: 1});
	//		}
	//	}
	//}

	/* End testing */

}

//draw();

var threshold = 3500;

// Difficulty
var delay = 150;

var timeSinceUp = 0,
	timeSinceDown = 0;

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
			//console.log(y - 128);
			diffUp += y - 128;
		} else if(y < 128) {
			//console.log(128 - y);
			diffDown += 128 - y;
		}
	}

	if(diffUp !== null && diffUp >= threshold) {
		var tmpTimeUp = Math.floor(new Date().getTime());
		if(tmpTimeUp >= (timeSinceUp + delay)) {
			timeSinceUp = tmpTimeUp;
			for(var a = 0, b = roomLength; a < b; a++) {
				socket.emit('get beat', {to: playersInRoom[a], value: diffUp, position: 0});
			}
		}
	}

	if(diffDown !== null && diffDown >= threshold) {
		var tmpTimeDown = Math.floor(new Date().getTime());
		if(tmpTimeDown >= (timeSinceDown + delay)) {
			timeSinceDown = tmpTimeDown;
			for(var c = 0, d = roomLength; c < d; c++) {
				socket.emit('get beat', {to: playersInRoom[c], value: diffDown, position: 1});
			}
		}
	}

	canvasCtx.lineTo(WIDTH, HEIGHT / 2);
	canvasCtx.stroke();
}

drawOscilloscope();
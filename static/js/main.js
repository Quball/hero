var socket = io.connect('http://192.168.3.56:3000');
$(function(){
	socket.on('welcome', function(data){
		socket.emit('register', { id: 'player' });
	});
});

var video = $('#vid')[0];
var context = new AudioContext(),
	sampleRate;
var audioBuffer;
var sourceNode;
var splitter;
var analyser, analyser2, analyser3;
var ScriptProcessorNode, ScriptProcessorNode2;

// get canvas context
var ctx = $('#channelCanvas').get()[0].getContext('2d');
var ctx2 = $('#frequencyCanvas').get()[0].getContext('2d');
// create a gradient for the fill, Note the strange offset,
// since the gradient is calculated based on
// the canvas, not the specific element we draw
var gradient = ctx2.createLinearGradient(0,0,1000,0);
gradient.addColorStop(1, '#000000');
gradient.addColorStop(0.5, '#6600CC');
gradient.addColorStop(0, '#003366');

/**
 * Setup and load audio
 */
setupAudioNodes();
loadSound('domi.mp4');

function setupAudioNodes() {

	// setup a javascript node
	ScriptProcessorNode = context.createScriptProcessor(2048, 1, 1);
	// connect to destination, else it isn't called
	ScriptProcessorNode.connect(context.destination);

	sampleRate = context.sampleRate;

	// setup analyser
	analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0.3;
	analyser.fftSize = 1024;

	analyser2 = context.createAnalyser();
	analyser2.smoothingTimeConstant = 0.0;
	analyser2.fftSize = 1024;

	analyser3 = context.createAnalyser();
	analyser3.smoothingTimeConstant = 0.6;
	analyser3.fftSize = 32;

	// create a buffer source node
	sourceNode = context.createBufferSource();
	splitter = context.createChannelSplitter(2);

	// connect the source to the analyser and the splitter
	sourceNode.connect(splitter);

	sourceNode.connect(analyser3);

	// connect one of the outputs from the splitter to the analyser
	splitter.connect(analyser, 0, 0);
	splitter.connect(analyser2, 1, 0);

	// connect the splitter to the javascriptnode, we use the jsNode to draw at a specific interval
	analyser.connect(ScriptProcessorNode);

	analyser3.connect(ScriptProcessorNode);

	// and connect to destination
	sourceNode.connect(context.destination);
}

function loadSound(url) {
	var request = new XMLHttpRequest();
	request.open('GET', 'assets/video/'+url, true);
	request.responseType = 'arraybuffer';

	// when loaded decode the data
	request.onload = function() {

		// decode the data
		context.decodeAudioData(request.response, function(buffer) {
			// when audio is decoded play the sound
			playSound(buffer);
		}, onError);
	}
	request.send();
}

function playSound(buffer) {
	sourceNode.buffer = buffer;
	sourceNode.start(0);
	video.play();
	video.muted = "muted";
}

function onError(e) {
	console.log(0);
}

// when the javascript node is called we use
// information from the analyser node
// to draw the volume

ScriptProcessorNode.onaudioprocess = function() {
	frequencyDraw();
	channelDraw();
	//drawCurve();
	//borderDraw();
}

var main = $('.container'),
	overlay = $('.overlay');

function drawCurve() {

	var cWidth = $('#vid').width();

	for(var x = 0; x <= cWidth; x++) {

	}
}

function drawCircle() {

}

function borderDraw() {
	// get the average for the first channel
	var array = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);
	var average = getAverageVolume(array);

	// get the average for the second channel
	var array2 =  new Uint8Array(analyser2.frequencyBinCount);
	analyser2.getByteFrequencyData(array2);
	var average2 = getAverageVolume(array2);

	main.css('border-left-width', average);
	main.css('border-right-width', average2);

	var median = ((average + average2) / 2) * 4;
	//console.log(median);
	main.css({
		borderColor: 'hsla('+median+', 20%, 20%, .5)'
	});
	//overlay.css('background', 'hsla('+(180-median)+', 20%, 20%, .7)');
}

function channelDraw() {
	// get the average for the first channel
	var array = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(array);
	var average = getAverageVolume(array);

	// get the average for the second channel
	var array2 =  new Uint8Array(analyser2.frequencyBinCount);
	analyser2.getByteFrequencyData(array2);
	var average2 = getAverageVolume(array2);

	// clear the current state
	ctx.clearRect(0, 0, 75, 562);

	ctx.fillStyle = gradient;

	// create the meters
	ctx.fillRect(10, 562-average, 25, 325);
	ctx.fillRect(40, 562-average2, 25, 325);
}

function getAverageVolume(array) {
	var values = 0;
	var average;

	var length = array.length;

	// get all the frequency amplitudes
	for(var i = 0; i < length; i++) {
		values += array[i];
	}

	average = values / length;
	return average;
}

var div;

function frequencyDraw() {

	// get the average for the first channel
	var array = new Uint8Array(analyser3.frequencyBinCount);
	//analyser3.getByteFrequencyData(array);
	analyser3.getByteTimeDomainData(array);

	div = Math.ceil(array.length / 2); // 128
	//console.log(div, array.length);

	// clear the current state
	ctx2.clearRect(0, 0, 1000, 562);

	// set fill style
	ctx2.fillStyle = gradient;

	drawSpectrum(array);
}

var offset = 10;

function drawSpectrum(array) {

	ctx2.beginPath();

	var length = array.length; // 16

	for(var i = 0; i < length; i++) {

		if(i == 0 || i == length - 1) {

			if(Math.floor(array[i]) >= 180) {
				//console.log(i, array[i]);
				var value = array[i];
				socket.emit('get beat', {to: 'ctrl', value: value, position: i});
			}
		}

		var value = 562 - array[i];
		var x = i * offset,
			y = value;

		ctx2.moveTo(x, y);
		//ctx2.quadraticCurveTo(x + 12, cy, ((i + 4) * offset), 562 - array[i + 4]);
		ctx2.fillRect(x, y, 8, 562);
	}

	ctx2.stroke();
}
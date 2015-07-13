$(function(){

	var $playground = $('.playground'),
		$ballTemplate = $('#ballTemplate'),
		$scoreCounter = $('.score');

	var score = 0;

	var myId = null;

	$playground.css({
		width: $(window).innerWidth(),
		height: $(window).innerHeight()
	});

	var socket = io.connect('http://192.168.1.123:3000');

	socket.emit('register', { id: 'ctrl' });

	socket.on('registered', function(data) {
		console.log(data);
		myId = data.id;
	});

	socket.on('started', function(){
		$('.controller button.start').remove();
	});

	socket.on('beat', function(data) {
		console.log(data.pos, data.value);
		createBall(data);
	});

	function createBall(data) {

		var tmpBall = $ballTemplate.clone().removeAttr('id').addClass('falling ball');

		tmpBall.text(data.value);

		if(data.pos == 0) {
			tmpBall.css({
				left: '20%'
			});
		} else if(data.pos == 1) {
			tmpBall.css({
				right: '20%'
			});
		}

		$playground.append(tmpBall);
		setTimeout(function(){
			tmpBall.addClass('toBottom');
			tmpBall.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
				function(e) {
					tmpBall.remove();
				});
		}, 0);
	}

	$('body').on('touchend', function(e) {
		var $target = $(e.target);
		if ($target.hasClass('ball')) {
			console.log('hit');
			if (!$target.hasClass('out')) {

				$target.addClass('out');
				score += 10;
				$scoreCounter.text(score);

				socket.emit('player score', {playerId: myId, score: score});

				console.log(score);

				$scoreCounter.addClass('flash').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
					function(e) {
						$scoreCounter.removeClass('flash');
					});
			}
		} else if($target.hasClass('start')) {
			socket.emit('ready', {ctrl: myId});
		} else {
			console.log('miss');
			score -= 10;

			socket.emit('player score', {playerId: myId, score: score});

			$scoreCounter.text(score);
			console.log(score);
		}
	});

	$(window).on('resize', function(){
		$playground.css({
			width: $(window).innerWidth(),
			height: $(window).innerHeight()
		});
	});
});
$(function(){

	var $controller = $('main.controller'),
		$playground = $('.playground'),
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
		createBall(data);
	});

	function createBall(data) {

		var tmpBall = $ballTemplate.clone().removeAttr('id').addClass('falling ball pos' + data.pos).attr('pos', data.pos);

		var val = Math.floor((data.value / 8000) * 100);

		if(data.pos == 0) {
			tmpBall.css({
				left: '20%',
				top: -(val * 2) + 'px',
				height: val * 2 + 'px'
			});
		} else if(data.pos == 1) {
			tmpBall.css({
				right: '20%',
				top: -(val * 2) + 'px',
				height: val * 2 + 'px'
			});
		}

		$playground.append(tmpBall);
		setTimeout(function(){
			tmpBall.addClass('toBottom').css('top', '100%');
			tmpBall.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
				function(e) {
					tmpBall.remove();
				});
		}, 0);
	}

	$('body').on('touchend', function(e) {
		var $target = $(e.target);
		if ($target.hasClass('ball')) {
			if (!$target.hasClass('out')) {

				$target.addClass('out');
				score += 10;
				$scoreCounter.text(score);

				socket.emit('player score', {playerId: myId, score: score});

				if($target.attr('pos') == 0) {
					$controller.addClass('flashLeft').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
						function(e) {
							$controller.removeClass('flashLeft');
						});
				} else {
					$controller.addClass('flashRight').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
						function(e) {
							$controller.removeClass('flashRight');
						});
				}
			}
		} else if($target.hasClass('start')) {
			$target.text('Waiting for music...');
			socket.emit('ready', {ctrl: myId});
		} else {
			score -= 10;

			socket.emit('player score', {playerId: myId, score: score});

			$controller.addClass('miss').one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
				function(e) {
					$controller.removeClass('miss');
				});

			$scoreCounter.text(score);
		}
	});

	$(window).on('resize', function(){
		$playground.css({
			width: $(window).innerWidth(),
			height: $(window).innerHeight()
		});
	});
});
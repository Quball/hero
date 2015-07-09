$(function(){

	var $playground = $('.playground'),
		$ballTemplate = $('#ballTemplate'),
		$scoreCounter = $('.score');

	var score = 0;

	$playground.css({
		width: $(window).innerWidth(),
		height: $(window).innerHeight()
	});

	var socket = io.connect('http://192.168.3.56:3000');

	socket.emit('register', { id: 'ctrl' });

	socket.on('beat', function(data) {
		createBall(data);
	});

	function createBall(data) {

		var tmpBall = $ballTemplate.clone().removeAttr('id').addClass('ball');
		if(data.pos == 0) {
			tmpBall.css('left', '20%');
		} else if(data.pos == 15) {
			tmpBall.css('right', '20%');
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
		if($target.hasClass('ball')) {
			console.log('hit');
			$target.addClass('flash');
			score += 10;
			$scoreCounter.text(score);
			console.log(score);
		} else {
			console.log('miss');
			score -= 10;
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
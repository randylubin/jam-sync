$(document).ready(function() {
	var myDataRef = new Firebase('https://jam-sync.firebaseio.com/');
	myDataRef.on('value', function(snapshot){
		console.log('Playing', snapshot.val().playing);
		playing = snapshot.val().playing;
		startTime = snapshot.val().startTime;
	});

	var offsetRef = new Firebase("https://jam-sync.firebaseio.com/.info/serverTimeOffset");
	offsetRef.on("value", function(snap) {
		offset = snap.val();
		console.log(offset);
		estimatedServerTimeMs = new Date().getTime() + offset;
	});
	console.log(offset);

	bpm = 90;
	upperTimeSignature = 4;
	lowerTimeSignature = 4;
	frequency = (60 / bpm) * 1000; //in ms
	playing = false;
	progression = [ 'E', 'B', 'C#', 'A'];
	currentChordNumber = -1;
	beatInMeasure = -1;
	startTime = 9375935090405;
	var startPlaying;
	var checkIfStarted;
	var offset;

	togglePlay = function(){
		if (playing) {
			turnStuffOff();
		} else {
			var d = new Date();
			startTime = d.getTime() + 3000 - offset;
			myDataRef.update({startTime: startTime});
			playing = true;
		}

		myDataRef.update({playing: playing});
		
	};

	turnStuffOff = function(){
		playing = false;
		$('.play-stop').removeClass('btn-danger').removeClass('btn-warning').addClass('btn-primary');
		currentChordNumber = -1;
		beatInMeasure = -1;
		activateChord(0);
		clearInterval(startPlaying);
		checkIfStarted = setInterval(checkStart, 50);
	};

	moveOn = function(){
		var d = new Date();
		if (playing === true){
			if (d.getTime() + offset >= startTime) {
				beatInMeasure = (beatInMeasure + 1) % lowerTimeSignature;
				flashMetronome();
				console.log('in move on', currentChordNumber);
				if (beatInMeasure === 0) {
					currentChordNumber = nextChord(currentChordNumber);
				}
				console.log('beep');
			} else {
				
			}
		} else {
			turnStuffOff();
		}
	};

	flashMetronome = function(){
		$('.metronome').removeClass('off').addClass('flashOn');
		setTimeout(function(){$('.metronome').removeClass('flashOn').addClass('off');}, 100);
	};

	nextChord = function(chordNumber){
		console.log('in next chord', chordNumber);
		//deactivateChord(chordNumber + 1);
		chordNumber = ((chordNumber + 1) % 4);
		activateChord(chordNumber + 1);
		return chordNumber;
	};

	activateChord = function(chordNumber){
		$('.chord-viewer > div.active').removeClass('active').addClass('inactive');
		$('.chord-viewer > div:nth-child('+ chordNumber +')').addClass('active').removeClass('inactive');
	};

	deactivateChord = function(chordNumber){
		$('.chord-viewer > div:nth-child('+ chordNumber +')').removeClass('active').addClass('inactive');
	};

	checkStart = function(){
		var d = new Date();

		if (playing === true){
			if ((d.getTime() + offset) >= startTime) {
				$('.play-stop').removeClass('btn-warning').addClass('btn-danger');
				startPlaying = setInterval(moveOn, frequency);
				clearInterval(checkIfStarted);
			} else {
				$('.play-stop').removeClass('btn-primary').addClass('btn-warning');
			}
		} else {
			console.log ('still checking');
		}
	};
	
	checkIfStarted = setInterval(checkStart, 50);

});
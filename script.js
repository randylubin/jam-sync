//AngularFire
url = 'https://jam-sync.firebaseio.com/';

// Angular
angular.module('jam-sync', ['firebase']).
	value('fbURL', url).
	factory('Projects', function(angularFireCollection, fbURL) {
		return angularFireCollection(fbURL);
	}).
	/*config(function($httpProvider){
		delete $httpProvider.defaults.headers.common['X-Requested-With'];
	}).*/
	config(function($routeProvider) {
		$routeProvider.
			when('/', {controller:SyncCtrl, templateUrl:'sync.html'}).
			when('/:room', {controller:SyncCtrl, templateUrl:'sync.html'}).
			otherwise({redirectTo:'/'});
	});

function SyncCtrl($scope, Projects) {
	//var promise = angularFire(url, $scope, 'jamInfo', {});

	$scope.projects = Projects;
	$scope.bpm = 90;
	$scope.change = function(){
		bpm = $scope.bpm;
		frequency = (60 / bpm) * 1000;
		console.log('new bpm', bpm);
	};
}

// Firebase

var myDataRef = new Firebase('https://jam-sync.firebaseio.com/jamInfo');
myDataRef.on('value', function(snapshot){
	console.log('Playing', snapshot.val().playing);
	jamInfo.playing = snapshot.val().playing;
	jamInfo.startTime = snapshot.val().startTime;
});

// clock skew

var offsetRef = new Firebase("https://jam-sync.firebaseio.com/.info/serverTimeOffset");
offsetRef.on("value", function(snap) {
	offset = snap.val();
	console.log(offset);
	estimatedServerTimeMs = new Date().getTime() + offset;
});
console.log(offset);

// basic setup

jamInfo = {
	playing: false,
	startTime: 9375935090405
};
bpm = 90;
upperTimeSignature = 4;
lowerTimeSignature = 4;
frequency = (60 / bpm) * 1000; //in ms
progression = [ 'E', 'B', 'C#', 'A'];
currentChordNumber = -1;
beatInMeasure = -1;
var startPlaying;
var checkIfStarted;
var offset;

checkStart = function(){
	var d = new Date();

	if (jamInfo.playing === true){
		if ((d.getTime() + offset) >= jamInfo.startTime) {
			angular.element('.play-stop').removeClass('btn-warning').addClass('btn-danger');
			startPlaying = setInterval(moveOn, frequency);
			clearInterval(checkIfStarted);
			checkIfStarted = false;
		} else {
			angular.element('.play-stop').removeClass('btn-primary').addClass('btn-warning');
		}
	} else {
		console.log ('still checking');
	}
};

moveOn = function(){
	console.log('moveOn');
	var d = new Date();
	if (jamInfo.playing === true){
		if (d.getTime() + offset >= jamInfo.startTime) {
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

turnStuffOff = function(){
	clearInterval(checkIfStarted);
	jamInfo.playing = false;
	angular.element('.play-stop').removeClass('btn-danger').removeClass('btn-warning').addClass('btn-primary');
	currentChordNumber = -1;
	beatInMeasure = -1;
	activateChord(1);
	clearInterval(startPlaying);
	checkIfStarted = setInterval(checkStart, 50);
	console.log('turning stuff off');
};

togglePlay = function(){
	if (jamInfo.playing) {
		turnStuffOff();
	} else {
		var d = new Date();
		jamInfo.startTime = d.getTime() + 3000 - offset;
		myDataRef.update({startTime: jamInfo.startTime});
		jamInfo.playing = true;
	}

	myDataRef.update({playing: jamInfo.playing});
	
};

flashMetronome = function(){
	angular.element('.metronome').removeClass('off').addClass('flashOn');
	setTimeout(function(){angular.element('.metronome').removeClass('flashOn').addClass('off');}, 100);
};

nextChord = function(chordNumber){
	console.log('in next chord', chordNumber);
	//deactivateChord(chordNumber + 1);
	chordNumber = ((chordNumber + 1) % 4);
	activateChord(chordNumber + 1);
	return chordNumber;
};

activateChord = function(chordNumber){
	angular.element('.chord-viewer > span.active').removeClass('active').addClass('inactive');
	angular.element('.chord-viewer > span:nth-child('+ chordNumber +')').addClass('active').removeClass('inactive');
};

deactivateChord = function(chordNumber){
	angular.element('.chord-viewer > span:nth-child('+ chordNumber +')').removeClass('active').addClass('inactive');
};



checkIfStarted = setInterval(checkStart, 50);

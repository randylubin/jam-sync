//AngularFire
url = 'https://jam-sync.firebaseio.com/jamInfo';

// Angular
jamSync = angular.module('jamSync', ['firebase']).
	value('fbURL', url).
	/*factory('JamInfo', function(angularFireCollection, fbURL) {
		return angularFireCollection(fbURL);
	}).*/
	/*config(function($httpProvider){
		delete $httpProvider.defaults.headers.common['X-Requested-With'];
	}).*/
	config(function($routeProvider) {
		$routeProvider.
			when('/', {controller:'roomPickerCtrl', templateUrl:'views/roomPicker.html'}).
			when('/room/:room', {controller:'SyncCtrl', templateUrl:'views/sync.html'}).
			when('/room/:room/edit/:chordNumber', {controller:'chordEditCtrl', templateUrl:'views/chordEdit.html'}).
			when('/404', {controller:'SyncCtrl', templateUrl:'views/404.html'}).
			otherwise({redirectTo:'/'});
	});


jamSync.factory('chordService', function($rootScope, $timeout) {
	var chordService = {};

	chordService.chord = [];
	chordService.updated = false;

	chordService.prepForBroadcast = function(newChord, index) {
		this.chord = newChord;
		this.chordIndex = index;
		this.chordProgression[index].name = newChord;
		this.broadcastItem();
	};

	chordService.chordProgression = [
				{name: 'E',
				number: 0},
				{name: 'B',
				number: 1},
				{name: 'C#',
				number: 2},
				{name: 'A',
				number: 3}
			];

	chordService.broadcastItem = function(){
		$timeout(function(){
			$rootScope.$broadcast('updateChord');
		}, 100);
		chordService.updated = true;
		console.log('updating chord broadcast');
	};

	return chordService;
});

jamSync.controller('SyncCtrl', ['$scope', 'chordService', '$location', '$timeout', '$routeParams', 'angularFire',
	function SyncCtrl($scope, chordService, $location, $timeout, $routeParams, angularFire){

		justEntered = true;

		$scope.activeChordMap = ['active','inactive','inactive','inactive'];

		$scope.jamInfo = {
			bpm: 90,
			playStatus: 'btn-warning',
			playing: false,
			startTime: 99999999999,
			chordProgression: chordService.chordProgression,
			disconnected: true
		};

		var url = 'https://jam-sync.firebaseio.com/' + $routeParams.room;
		var promise = angularFire(url, $scope, 'jamInfo', {});

		console.log('room number:', $routeParams.room);

		$scope.bpmOptions = [60, 90, 120, 150, 180];
		$scope.chordProgression = chordService.chordProgression;

		$scope.metronomeLight = 'off';
		$scope.playStatus = 'btn-warning';

		var offsetRef = new Firebase("https://jam-sync.firebaseio.com/.info/serverTimeOffset");
		offsetRef.on("value", function(snap) {
			offset = snap.val();
			console.log('clock skew', offset);
			estimatedServerTimeMs = new Date().getTime() + offset;
		});

		// basic setup


		upperTimeSignature = 4;
		lowerTimeSignature = 4;
		frequency = (60 / 90) * 1000; //in ms
		currentChordNumber = 0;
		beatInMeasure = -1;
		var offset;


		// upon angularFire response:

		promise.then(function(){
			console.log('from fb', $scope.jamInfo);

			$scope.playStatus = 'btn-primary';

			// add defaults, if none
			if (!$scope.jamInfo.bpm){
				$scope.jamInfo = {
					bpm: 90,
					playing: false,
					startTime: 9378000726393,
					chordProgression: chordService.chordProgression,
					disconnected: false
				};
			}


			$scope.$watch('jamInfo.bpm', function(){
				frequency = (60 / $scope.jamInfo.bpm) * 1000;
				console.log('new bpm', $scope.jamInfo.bpm);
			});

			$scope.$watch('jamInfo.chordProgression', function(){
				console.log('fire');
				chordService.chordProgression = $scope.jamInfo.chordProgression;
				$scope.chordProgression = chordService.chordProgression;
			});

			checkStart = function(){
				//$scope.checkUpdatedChords();

				if (justEntered) {
					return;
				}
				var d = new Date();

				if ($scope.jamInfo.playing === true){
					if ((d.getTime() + offset) >= $scope.jamInfo.startTime) {
						$scope.playStatus = 'btn-danger';
						$scope.startPlaying = $timeout($scope.moveOn, frequency);
						$timeout.cancel(checkIfStarted);
						checkIfStarted = false;
					} else {
						$scope.playStatus = 'btn-warning';
						$scope.$apply(); //TODO: refactor this
						checkIfStarted = $timeout(checkStart, 50);
					}
				} else {
					console.log ('still checking');
					checkIfStarted = $timeout(checkStart, 50);
				}
			};

			$scope.checkUpdatedChords = function (){
				if ($scope.jamInfo.chordProgression != chordService.chordProgression){
					$scope.jamInfo.chordProgression = chordService.chordProgression;
					console.log ('actually updated');
					chordService.updated = false;
				}
			};

			$scope.moveOn = function(){
				console.log('$scope.moveOn');
				
				//check if chords have changed
				//$scope.checkUpdatedChords();



				var d = new Date();
				if ($scope.jamInfo.playing === true){
					if (d.getTime() + offset >= $scope.jamInfo.startTime) {
						
						// advance beats and chords
						if (beatInMeasure === upperTimeSignature - 1) {
							currentChordNumber = $scope.nextChord(currentChordNumber);
						}
						beatInMeasure = (beatInMeasure + 1) % upperTimeSignature;

						//flash metronome
						$scope.metronomeLight = 'flashOn';
						$timeout(function(){$scope.metronomeLight = 'off';}, 100);
						$scope.$apply(); //TODO: refactor this
						
					} else {
						$scope.playStatus = 'btn-warning';
						$scope.$apply(); //TODO: refactor this
					}
					$scope.startPlaying = $timeout($scope.moveOn, frequency);
				} else {
					$scope.turnStuffOff();
				}
			};

			justEntered = false;
			checkIfStarted = $timeout(checkStart, 50);


			$scope.togglePlay = function(){
				if ($scope.jamInfo.playing) {
					$scope.turnStuffOff();
				} else {
					var d = new Date();
					$scope.jamInfo.startTime = d.getTime() + 3000 - offset;
					$scope.jamInfo.playing = true;
				}
			};


			$scope.turnStuffOff = function(){
				
				$timeout.cancel(checkIfStarted);
				$scope.jamInfo.playing = false;
				$scope.playStatus = 'btn-primary';
				$scope.toggleChord(currentChordNumber);
				$scope.toggleChord(0);
				currentChordNumber = 0;
				beatInMeasure = -1;
				
				
				$timeout.cancel($scope.startPlaying);
				checkIfStarted = $timeout(checkStart, 50);
				console.log('turning stuff off');
			};

			$scope.toggleChord = function(chordNumber){
				$scope.activeChordMap[chordNumber] = ($scope.activeChordMap[chordNumber] =='active') ? 'inactive' : 'active';
			};


			$scope.nextChord = function(chordNumber){
				$scope.toggleChord(chordNumber);
				chordNumber = ((chordNumber + 1) % upperTimeSignature);
				$scope.toggleChord(chordNumber);
				return chordNumber;
			};

			$scope.editChord = function(index){
				justEntered = false;
				newLocation = $location.path() + '/edit/' + index;
				$location.path(newLocation);
			};

			$scope.$on('updateChord', function(){
				console.log('broadcast in main controller', chordService.chord);
				$scope.chordProgression[chordService.chordIndex].name = chordService.chord;
				$scope.jamInfo.chordProgression = $scope.chordProgression;
				//$scope.$apply();
			});

		});
	}
]);

jamSync.controller('roomPickerCtrl', ['$scope', '$timeout', '$location', 'angularFire',
	function roomPickerCtrl($scope, $timeout, $location, angularFire){
		$scope.roomNumber = [];
		$scope.addNum = function(num){
			console.log('added', num);
			$scope.roomNumber.push(num);
			if ($scope.roomNumber.length >= 4){
				$location.path('/room/' + $scope.roomNumber.join(''));
			}
		};
		
		$scope.deleteNum = function(){
			$scope.roomNumber.pop();
		};
		$scope.clearNum = function(){
			$scope.roomNumber = [];
		};
	}
]);

jamSync.controller('chordEditCtrl', ['$scope', '$routeParams', 'chordService', '$location', 'angularFire',
	function chordEditCtrl($scope, $routeParams, chordService, $location, $angularFire){
		// connect to service? chordNumber = $routeParams.chordNumber;
		
		$scope.chordNumber = parseInt($routeParams.chordNumber, 0) + 1;
		$scope.chordInProgress = [chordService.chordProgression[$scope.chordNumber-1].name];
		
		$scope.addToChord = function(part){
			$scope.chordInProgress.push(part);
		};

		$scope.deleteFromChord = function(){
			$scope.chordInProgress.pop();
		};

		$scope.clearChord = function(){
			$scope.chordInProgress = [];
		};

		$scope.saveChord = function(){
			chordService.prepForBroadcast($scope.chordInProgress.join(''), $routeParams.chordNumber);
			$location.path('/room/' + $routeParams.room);
		};

		$scope.$on('updateChord', function(){
			//console.log('broadcast from edit controller', chordService.chord);
			
		});
	}
]);




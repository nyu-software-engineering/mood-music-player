var app = angular.module('smoodifyApp', ['ngRoute', 'ngResource', 'angularCSS']).run(function($rootScope, $http) {
	$rootScope.authenticated = false;
	$rootScope.current_user = '';
	
	$rootScope.signout = function(){
    	$http.get('auth/signout');
    	$rootScope.authenticated = false;
    	$rootScope.current_user = '';
	};
});

app.config(function($routeProvider){
	$routeProvider
		// the landing display
		.when('/', {
			css: {
				href: '../stylesheets/login.css',
				preload: true
			},
			templateUrl: 'landing.html',
			controller: 'mainController'
		})
		// the login display
		.when('/login', {
			css: {
				href: '../stylesheets/login.css',
				preload: true
			},
			templateUrl: 'login.html',
			controller: 'authController'
		})
		// the signup display
		.when('/register', {
			css: {
				href: '../stylesheets/login.css',
				preload: true
			},
			templateUrl: 'register.html',
			controller: 'authController',
		})
		// the logged in display
		.when('/browse', {
			css: {
				href: '../stylesheets/base.css',
				preload: true
			},
			templateUrl: 'main.html',
			controller: 'browseController'
		}).when('/spotify_login', {
			css: {
				/* Code to get to Spotify Login */
			},
			templateUrl: 'main.html',
			controller: 'spotifyController'
		});
});

app.factory('songService', function($resource) {
	return $resource ('api/songs');
});

app.controller('mainController', function(songService, $scope, $rootScope, $window){
	$scope.songs = songService.query();

	$scope.post = function() {
	  $scope.newSong.title = $scope.new.title;
	  $scope.newSong.artist = $scope.new.artist;
	  songService.save($scope.newSong, function(){
	    $scope.songs = songService.query();
	    $scope.newSong = {title: '', artist: ''};
	  });
	};

});

/* Currently separated browse page into browseController. Merge with mainController later */
app.controller('browseController', function(songService, $scope, $rootScope, $window){

		$scope.songs = songService.query();

		$scope.post = function() {
			$scope.newSong.title = $scope.new.title;
			$scope.newSong.artist = $scope.new.artist;
			songService.save($scope.newSong, function(){
				$scope.songs = songService.query();
				$scope.newSong = {title: '', artist: ''};
			});
		};
		
  		/* created spotify web sdk playback code into a ng-click function called by clicking a temp button in main.html */
      /* TODO: Going to need to make token dynamic in that it obtains the current users token. Code once CORS Issue is solved.*/
      const token = 'BQCiKiTysePuuZOp_lyF87FtSHFVDkhzRYdMk7mkq4ug3leBvMvoYMmDHUvRlxw7Ib6k6jqx0tdZC__jqkcqAd9SWK10NGdy_nFfsAGAMNE1Zmsoic2TZEPrc3HGkbfd4GHqYdhDwI6EmqqfCW2JOiufYY0UICbTrKdT';
      const player = new Spotify.Player({
        name: 'Smoodify',
        getOAuthToken: cb => { cb(token); }
      });

      // Error handling
      player.addListener('initialization_error', ({ message }) => { console.error(message); });
      player.addListener('authentication_error', ({ message }) => { console.error(message); });
      player.addListener('account_error', ({ message }) => { console.error(message); });
      player.addListener('playback_error', ({ message }) => { console.error(message); });

      // Playback status updates
      player.addListener('player_state_changed', state => { console.log(state); });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      });

      // Connect to the player!
			player.connect().then(success => {
				if (success) {
					console.log('The Web Playback SDK successfully connected to Spotify!');
			  }
			})

		/* Play a song. Trigger this function when play button is pressed */
		$scope.play = function() {
			player.togglePlay().then(() => {
				console.log('Toggle Button Fired');
			});


			/* code to get the metadata of the song currently playing */
			player.getCurrentState().then(state => {
				if (!state) {
					console.error('User is not playing music through the Web Playback SDK');
					return;
				}
			
				let {
					current_track,
					next_tracks: [next_track]
				} = state.track_window;
			
				console.log('Currently Playing', current_track.name);
				console.log('Playing Next', next_track);

				/* scope variables to send back to html */
				$scope.imgSrc = current_track.album.images[0].url;
				/* Code to change the title <p> tag to the current song title. */
				$scope.songTitle = current_track.name;
				$scope.artistName = current_track.artists[0].name;
			});


		};

		/* Go back to previous song. Trigger this function when previous button is clicked */
		$scope.previous = function() {
			player.previousTrack().then(() => {
				console.log('Previous');
			});
		};

		/* Skip song. Trigger this function when skip button is pressed */
		$scope.skip = function() {
			player.nextTrack().then(() => {
				console.log('Skip');
			});
		};



		

});

/* controller for spotify login. Currently giving a CORS Error */
app.controller('spotifyController', function($scope, $http, $location, $window) {
			// Get the hash of the url
			/* Spotify Login API Code */
		const hash = window.location.hash
		.substring(1)
		.split('&')
		.reduce(function (initial, item) {
			if (item) {
				var parts = item.split('=');
				initial[parts[0]] = decodeURIComponent(parts[1]);
			}
			return initial;
		}, {});
		window.location.hash = '';

		// Set token
		let _token = hash.access_token;

		const authEndpoint = 'https://accounts.spotify.com/authorize';

		// Replace with your app's client ID, redirect URI and desired scopes
		const clientId = 'dcddb8d13b2f4019a1dadb4b4c070661';
		const redirectUri = 'http://localhost:3000';
		const scopes = [
			'user-read-birthdate',
			'user-read-email',
			'user-read-private'
		];

		// If there is no token, redirect to Spotify authorization
		if (!_token) {
			window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token`;
		}
});



app.controller('authController', function($scope, $http, $rootScope, $location){
  $scope.user = {username: '', password: ''};
  $scope.error_message = '';
  $scope.login = function(){
    $http.post('/auth/login', $scope.user).success(function(data){
      if(data.state == 'success'){
        $rootScope.authenticated = true;
        $rootScope.current_user = data.user.username;
        $location.path('/browse');
      }
      else{
        $scope.error_message = data.message;
      }
    });
  };

  $scope.register = function(){
    $http.post('/auth/signup', $scope.user).success(function(data){
      if(data.state == 'success'){
        $rootScope.authenticated = true;
        $rootScope.current_user = data.user.username;
        $location.path('/browse');
      }
      else{
        $scope.error_message = data.message;
      }
    });
  };
});
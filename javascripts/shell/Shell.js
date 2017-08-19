define([
	'util/log',
	'db/connection',
	'db/PlayerORM',
	'dateformat',
	'util/EventHelper'
], function(
	log,
	db,
	PlayerORM,
	dateFormat,
	EventHelper
) {
	function Shell(mud) {
		this.mud = mud;
		this.players = {};
		this.playersBeingLoggedIn = {};
		this._events = new EventHelper([ 'send' ]);
	}
	Shell.prototype.receive = function(userId, text) {
		var self = this;
		var logPrefix = '[' + userId.substr(0, 4) + '] ';
		var player = this.players[userId];
		var isLoggingIn = this.playersBeingLoggedIn[userId];
		if(text === '~help') {
			this.send(userId, 'Type `~login` to log in');
			this.send(userId, 'Type `~logout` to log out');
		}
		else if(isLoggingIn) {
			this.send(userId, 'Hold on you\'re being logged in...');
		}
		else if(text === '~login') {
			if(player) {
				this.send(userId, 'You are already logged in');
			}
			else {
				//log the player in
				this.playersBeingLoggedIn[userId] = true;
				log.info(logPrefix + 'Player logging in...');
				this.send(userId, 'Logging in...');
				PlayerORM.getPlayerByUserId(userId)
					//create the player if it doesn't already exist
					.then(function(player) {
						if(!player) {
							log.verbose(logPrefix + 'First time logging in');
							player = PlayerORM.createPlayer({
								userId: userId
							});
						}
						return player;
					})
					//add the player to the mud
					.then(function(player) {
						return self.mud.addPlayer(player)
							.then(function() {
								return player;
							});
					})
					.then(function(player) {
						self.players[userId] = player;
						delete self.playersBeingLoggedIn[userId];
						log.info(logPrefix + 'Player logged in!');
						if(player.model.dateLastLoggedIn) {
							self.send(userId, 'Logged in! Last logged in ' + dateFormat(player.model.dateLastLoggedIn, 'dddd, mmmm dS, yyyy, h:MM:ss TT'));
						}
						else {
							self.send(userId, 'Logged in!');
						}
						player.model.dateLastLoggedIn = new Date();
						player.needsToSave = true;
						player.on('send', function(text) {
							self.send(userId, text);
						});
					})
					.catch(function(err) {
						delete self.players[userId];
						delete self.playersBeingLoggedIn[userId];
						log.error(logPrefix + 'Error logging in', err);
						self.send(userId, 'Error logging in!');
					});
			}
		}
		else if(text === '~logout') {
			if(!player) {
				this.send(userId, 'You are not logged in');
			}
			else {
				//log the player out
				player.leave();
				PlayerORM.unloadPlayer(player);
				delete this.players[userId];
				log.info(logPrefix + 'Player logged out');
				this.send(userId, 'You have been logged out');
			}
		}
		else if(!player) {
			this.send(userId, 'You are not logged in. Type `~login` to log in or `~help` for a list of commands');
		}
		else {
			//forward the text to the MUD, through the Player object
			player.receive(text);
		}
	};
	Shell.prototype.send = function(userId, text) {
		this._events.trigger('send', userId, text);
	};
	Shell.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return Shell;
});
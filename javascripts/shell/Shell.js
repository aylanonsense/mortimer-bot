define([
	'shell/Player',
	'util/EventHelper'
], function(
	Player,
	EventHelper
) {
	function Shell(mud) {
		this.mud = mud;
		this.players = {};
		this.playersBeingLoggedIn = {};
		this._events = new EventHelper([ 'send' ]);
		this._killReason = null;
	}
	Shell.prototype.receive = function(userId, text) {
		var self = this;
		var player = this.players[userId];
		var isLoggingIn = this.playersBeingLoggedIn[userId];
		if(text == '~help') {
			this.send(userId, "Type `~login` to log in\nType `~logout` to log out");
		}
		else if(this._killReason) {
			this.send(userId, "Game stopped: " + this._killReason);
		}
		else if(isLoggingIn) {
			this.send(userId, "Hold on hold on you're being logged in...");
		}
		else if(text === '~login') {
			if(player) {
				this.send(userId, "You are already logged in");
			}
			else {
				//log the player in
				this.send(userId, "Logging in...");
				this.playersBeingLoggedIn[userId] = true;
				//TODO get/create/login player
				setTimeout(function() {
					player = new Player();
					player.on('send', function(text) {
						this.send(userId, text);
					}, self);
					self.players[userId] = player;
					delete self.playersBeingLoggedIn[userId];
					self.send(userId, "Logged in!");
					self.mud.addPlayer(player);
				}, 2000);
			}
		}
		else if(text === '~logout') {
			if(!player) {
				this.send(userId, "You are not logged in");
			}
			else {
				//log the player out
				player.leave();
				delete this.players[userId];
				this.send(userId, "You have been logged out");
			}
		}
		else if(!player) {
			this.send(userId, "You are not logged in. Type `~login` to log in or `~help` for a list of commands");
		}
		else {
			//forward the text to the MUD, through the Player object
			player.receive(text);
		}
	};
	Shell.prototype.kill = function(reason) {
		this._killReason = reason;
		for(var userId in this.players) {
			this.send(userId, "Game stopped: " + this._killReason);
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
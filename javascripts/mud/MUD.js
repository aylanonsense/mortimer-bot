define([
	'util/EventHelper'
], function(
	EventHelper
) {
	function MUD() {
		this._isPaused = false;
		this._events = new EventHelper([ 'send' ]);
	}
	MUD.prototype.addPlayer = function(player) {
		//TODO
	};
	MUD.prototype.pause = function() {
		this._isPaused = true;
	};
	MUD.prototype.unpause = function() {
		this._isPaused = false;
	};
	MUD.prototype.isPaused = function() {
		return this._isPaused;
	};
	MUD.prototype.handleMessage = function(userId, text) {
		this.send(userId, text);
	};
	MUD.prototype.send = function(userId, text) {
		this._events.trigger('send', userId, text);
	};
	MUD.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return MUD;
});
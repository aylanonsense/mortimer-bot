define([
	'util/EventHelper'
], function(
	EventHelper
) {
	function Player(model) {
		this.model = model;
		this.needsToSave = false;
		this.entity = null;
		this._hasLeft = false;
		this._events = new EventHelper([ 'receive', 'send', 'leave' ]);
	}
	Player.prototype.receive = function(text) {
		if(!this._hasLeft) {
			this._events.trigger('receive', text);
		}
	};
	Player.prototype.send = function(text) {
		if(!this._hasLeft) {
			this._events.trigger('send', text);
		}
	};
	Player.prototype.leave = function() {
		if(!this._hasLeft) {
			this._hasLeft = true;
			this._events.trigger('leave');
		}
	};
	Player.prototype.hasLeft = function() {
		return this._hasLeft;
	};
	Player.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return Player;
});
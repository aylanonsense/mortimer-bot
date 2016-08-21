define([
	'util/EventHelper'
], function(
	EventHelper
) {
	function Entity(model) {
		this.model = model;
		this.player = null;
		this.needsToSave = false;
		this.addedToGame = false;
		this.timeLastRelevant = null;
		this.parent = null;
		this.children = [];
		this._events = new EventHelper([]);
	}
	Entity.prototype.performAction = function(text) {
		this.respondToEvent({ text: 'You said ' + text });
	};
	Entity.prototype.respondToEvent = function(evt) {
		if(this.player) {
			this.player.send(evt.text);
		}
		else {
			//TODO ai
		}
	};
	Entity.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return Entity;
});
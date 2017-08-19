define([
	'util/EventHelper'
], function(
	EventHelper
) {
	function Player(model) {
		this.model = model;
		this.entity = null;
		this.needsToSave = false;
		this.canBeUnloadedByORM = false;
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
	Player.prototype.toString = function() {
		return '[' + this.userId.substr(0, 4) + ']';
	};

	//add properties that just link to the model
	Object.defineProperties(Player.prototype, {
		id: createGetter('id'),
		userId: createGetter('userId'),
		dateCreated: createGetter('dateCreated'),
		dateLastLoggedIn: createGetterAndSetter('dateLastLoggedIn'),
		avatarEntityId: createGetterAndSetter('avatarEntityId'),
		controlledEntityId: createGetterAndSetter('controlledEntityId'),
	});
	function createGetter(key) {
		return {
			get: function() {
				return this.model[key];
			},
			set: function(val) {
				throw new Error('Cannot set property \'' + key + '\' of entity');
			}
		};
	}
	function createGetterAndSetter(key) {
		return {
			get: function() {
				return this.model[key];
			},
			set: function(val) {
				this.model[key] = val;
				this.model.needsToSave = true;
			}
		};
	}
	return Player;
});
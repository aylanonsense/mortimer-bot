define([
	'mongoose',
	'db/defineModels',
	'util/EventHelper'
], function(
	mongoose,
	defineModels,
	EventHelper
) {
	function Connection() {
		this.models = {};
		this._isConnected = false;
		this._events = new EventHelper([ 'connect', 'disconnect', 'error' ]);
	}
	Connection.prototype.connect = function(mongoUri) {
		var self = this;
		return new Promise(function(fulfill, reject) {
			//bind event handlers
			mongoose.connection.once('open', function() {
				self.models = defineModels();
			});
			mongoose.connection.on('open', function() {
				self._isConnected = true;
				self._events.trigger('connect');
				fulfill();
			});
			mongoose.connection.on('close', function() {
				self._isConnected = false;
				self._events.trigger('disconnect');
				reject();
			});
			mongoose.connection.on('error', function(err) {
				self._isConnected = false;
				self._events.trigger('error', err);
				reject(err);
			});

			//connect!
			mongoose.connect(mongoUri);
		});
	};
	Connection.prototype.disconnect = function() {
		mongoose.connection.close();
	};
	Connection.prototype.isConnected = function() {
		return this._isConnected;
	};
	Connection.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return new Connection();
});
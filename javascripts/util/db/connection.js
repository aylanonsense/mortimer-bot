define([
	'mongoose',
	'util/EventHelper'
], function(
	mongoose,
	EventHelper
) {
	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;

	function Connection() {
		this._isConnected = false;
		this._events = new EventHelper([ 'connect', 'error' ]);
	}
	Connection.prototype.connect = function(mongoUri) {
		var self = this;

		//bind event handlers
		mongoose.connection.once('open', function() {
			self.defineModels();
		});
		mongoose.connection.on('open', function() {
			self._isConnected = true;
			self._events.trigger('connect');
		});
		mongoose.connection.on('error', function() {
			self._isConnected = false;
			self._events.trigger('error');
		});

		//connect!
		mongoose.connect(mongoUri);
	};
	Connection.prototype.defineModels = function() {
		var PlayerSchema = new Schema({
			userId: { type: String, index: true }
		});
		var PlayerModel = mongoose.model('Player', PlayerSchema);
	};
	Connection.prototype.isConnected = function() {
		return this._isConnected;
	};
	Connection.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return new Connection();
});
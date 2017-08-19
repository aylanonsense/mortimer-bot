define([
	'util/EventHelper'
], function(
	EventHelper
) {
	function MUDRunner(mud) {
		this.mud = mud;
		this._interval = null;
		this._prevTime = null;
	}
	MUDRunner.prototype.start = function() {
		var self = this;
		if(!this._interval) {
			this._prevTime = Date.now();
			this._interval = setInterval(function() {
				var time = Date.now();
				self.mud.update((time - self._prevTime) / 1000, time / 1000);
				self._prevTime = time;
			}, 100);
		}
	};
	MUDRunner.prototype.stop = function() {
		if(this._interval) {
			clearInterval(this._interval);
			this._interval = null;
			this._prevTime = null;
		}
	};
	return MUDRunner;
});
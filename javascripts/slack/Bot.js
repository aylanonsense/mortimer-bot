define([
	'@slack/client',
	'util/EventHelper'
], function(
	SlackClient,
	EventHelper
) {
	var CLIENT_EVENTS = SlackClient.CLIENT_EVENTS;
	var RTM_EVENTS = SlackClient.RTM_EVENTS;
	var RtmClient = SlackClient.RtmClient;

	function Bot() {
		this._rtm = null;
		this._isConnected = false;
		this._events = new EventHelper([ 'connect', 'receive', 'disconnect', 'error' ]);
	}
	Bot.prototype.connect = function(slackToken) {
		var self = this;
		return new Promise(function(fulfill, reject) {
			self._rtm = new RtmClient(slackToken, { logLevel: 'error' });

			//bind event handlers
			self._rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
				self._isConnected = true;
				self._events.trigger('connect');
				fulfill(self);
			});
			self._rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, function() {
				self._isConnected = false;
				self._events.trigger('disconnect');
				reject();
			});
			self._rtm.on(CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, function(err) {
				self._events.trigger('error', err);
				reject(err);
			});
			self._rtm.on(RTM_EVENTS.MESSAGE, function(msg) {
				if(msg.type === 'message' && !msg.subtype && !msg.user_profile) {
					var text = msg.text;
					var userId = msg.user;
					var channelId = msg.channel;
					var user = self._rtm.dataStore.getUserById(userId);
					var directMessageChannel = self._rtm.dataStore.getDMByName(user.name);
					if(channelId === directMessageChannel.id) {
						self._events.trigger('receive', userId, text);
					}
				}
			});

			//connect!
			self._rtm.start();
		});
	};
	Bot.prototype.isConnected = function() {
		return this._isConnected;
	};
	Bot.prototype.send = function(userId, text) {
		if(this._rtm) {
			var user = this._rtm.dataStore.getUserById(userId);
			var directMessageChannel = this._rtm.dataStore.getDMByName(user.name);
			this._rtm.sendMessage(text, directMessageChannel.id);
		}
	};
	Bot.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return Bot;
});
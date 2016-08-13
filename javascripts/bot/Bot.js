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
		this._events = new EventHelper([ 'receive' ]);
	}
	Bot.prototype.connect = function(slackToken) {
		var self = this;
		this._rtm = new RtmClient(slackToken, { logLevel: 'error' });

		//bind event handlers
		this._rtm.on(CLIENT_EVENTS.RTM.CONNECTING, function() {
			console.log('Connecting...');
		});
		this._rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
			console.log('Connected!');
		});
		this._rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, function() {
			console.log('Disconnected!');
		});
		this._rtm.on(CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, function() {
			console.log('Could not connect!');
		});
		this._rtm.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, function() {
			console.log('Reconnecting...');
		});
		this._rtm.on(RTM_EVENTS.MESSAGE, function(msg) {
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
		this._rtm.start();
	};
	Bot.prototype.sendMessage = function(userId, text) {
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
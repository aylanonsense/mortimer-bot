//configure requirejs
var requirejs = require('requirejs');
requirejs.config({
	baseUrl: __dirname,
	nodeRequire: require
});
require = requirejs;

//run server application
require('main')(process.env.SLACK_API_TOKEN || '');



//get dependencies
var SlackClient = require('@slack/client');
var CLIENT_EVENTS = SlackClient.CLIENT_EVENTS;
var RTM_EVENTS = SlackClient.RTM_EVENTS;
var RtmClient = SlackClient.RtmClient;

//create a client for slack's real time messaging api
var token = process.env.SLACK_API_TOKEN || '';
var rtm = new RtmClient(token, { logLevel: 'error' });

//bind event handlers
rtm.on(CLIENT_EVENTS.RTM.CONNECTING, function() {
	console.log('Connecting...');
});
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
	console.log('Connected!');
});
rtm.on(CLIENT_EVENTS.RTM.DISCONNECT, function() {
	console.log('Disconnected!');
});
rtm.on(CLIENT_EVENTS.RTM.UNABLE_TO_RTM_START, function() {
	console.log('Could not connect!');
});
rtm.on(CLIENT_EVENTS.RTM.ATTEMPTING_RECONNECT, function() {
	console.log('Reconnecting...');
});
rtm.on(RTM_EVENTS.MESSAGE, function(msg) {
	if(msg.type === 'message' && !msg.subtype && !msg.user_profile) {
		var text = msg.text;
		var userId = msg.user;
		var channelId = msg.channel;
		var user = rtm.dataStore.getUserById(userId);
		var directMessageChannel = rtm.dataStore.getDMByName(user.name);
		if(channelId === directMessageChannel.id) {
			// rtm.sendMessage('I believe you said: ' + text, directMessageChannel.id);
		}
	}
});

//connect!
rtm.start();
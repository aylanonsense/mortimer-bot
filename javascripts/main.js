define([
	'bot/Bot',
	'mud/MUD',
	'util/db/connection'
], function(
	Bot,
	MUD,
	DB
) {
	return function main(slackToken, mongoUri) {
		var pauseReason = 'starting up...';

		//create the mud
		var mud = new MUD();
		mud.pause();

		//connect to slack
		var bot = new Bot();
		bot.on('connect', function() {
			console.log('Slack bot connected');
			if(DB.isConnected()) {
				mud.unpause();
			}
		});
		bot.on('disconnect', function() {
			console.log('Slack bot disconnected');
			mud.pause();
			pauseReason = 'slack bot disconnected';
		});
		bot.on('error', function() {
			console.log('Slack bot error!');
			mud.pause();
			pauseReason = 'slack bot encountered an error';
		});
		bot.connect(slackToken);

		//connect to the database
		DB.on('connect', function() {
			console.log('Database connected');
			if(bot.isConnected()) {
				mud.unpause();
			}
		});
		DB.on('error', function() {
			console.log('Database error!');
			pauseReason = 'database encountered an error';
			mud.pause();
		});
		DB.connect(mongoUri);

		//bind events between them
		bot.on('receive', function(userId, message) {
			if(mud.isPaused()) {
				bot.sendMessage(userId, 'Game is currently paused: ' + pauseReason);
			}
			else {
				mud.handleMessage(userId, message);
			}
		});
		mud.on('send', function(userId, message) {
			if(bot.isConnected()) {
				bot.sendMessage(userId, message);
			}
		});
	};
});
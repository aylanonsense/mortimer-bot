define([
	'bot/Bot',
	'mud/MUD'
], function(
	Bot,
	MUD
) {
	return function main(slackToken) {
		//connect to slack
		var bot = new Bot();
		bot.connect(slackToken);

		//create the mud
		var mud = new MUD();

		//bind events between them
		bot.on('receive', function(userId, message) {
			mud.handleMessage(userId, message);
		});
		mud.on('send', function(userId, message) {
			bot.sendMessage(userId, message);
		});
	};
});
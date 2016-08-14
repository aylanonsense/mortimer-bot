define([
	'slack/Bot',
	'shell/Shell',
	'mud/MUD',
	'util/db/connection'
], function(
	SlackBot,
	Shell,
	MUD,
	DB
) {
	return function main(slackToken, mongoUri) {
		var mud, shell, bot;

		connectDB(function() {
			startShell();
			connectToSlack();
		});

		function connectDB(callback) {
			var hasConnected = false;
			//connect to the database
			DB.on('connect', function() {
				console.log('Database connected');
				if(!hasConnected) {
					hasConnected = true;
					callback();
				}
			});
			DB.on('error', function() {
				console.log('Database error!');
				shell.kill('The database encountered an error');
			});
			DB.connect(mongoUri);
		}

		function startShell() {
			mud = new MUD();
			shell = new Shell(mud);
		}

		function connectToSlack() {
			//connect to slack
			bot = new SlackBot();
			bot.on('connect', function() {
				console.log('Slack bot connected');
			});
			bot.on('disconnect', function() {
				console.log('Slack bot disconnected');
				shell.kill('Disconnected from Slack');
			});
			bot.on('error', function() {
				console.log('Slack bot error!');
				shell.kill('Slack encountered an error');
			});
			bot.connect(slackToken);

			//bind events between them
			bot.on('receive', function(userId, message) {
				shell.receive(userId, message);
			});
			shell.on('send', function(userId, message) {
				if(bot.isConnected()) {
					bot.send(userId, message);
				}
			});
		}
	};
});
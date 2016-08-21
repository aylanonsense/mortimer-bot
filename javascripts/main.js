define([
	'slack/Bot',
	'shell/Shell',
	'mud/MUD',
	'mud/MUDRunner',
	'util/db/connection',
	'util/db/EntityORM',
	'util/db/PlayerORM',
	'mud/initializeWorld'
], function(
	SlackBot,
	Shell,
	MUD,
	MUDRunner,
	db,
	EntityORM,
	PlayerORM,
	initializeWorld
) {
	var COMMAND_LINE_USER_ID = 'cmdline';

	return function main(slackToken, mongoUri) {
		var mud, mudRunner, shell, bot;

		//the basic flow of setup
		connectToDatabase()
			.then(resetDatabase)
			.then(initializeTheWorld)
			.then(createMUD)
			.then(startMUD)
			.then(createShell)
			// .then(connectToSlack)
			// .then(hookShellUpToSlack)
			.then(hookShellUpToCommandLine)
			.then(saveDatabasePeriodically)
			.then(function() {
				console.log('Ready for connections!');
			})
			.catch(function(err) {
				console.log('Error during startup', err);
				stopMUD('Error during startup');
			});

		function connectToDatabase() {
			console.log('Connecting to database...');
			db.on('error', function(err) {
				console.log('Database error', err);
				stopMUD('Database error');
			});
			db.on('disconnect', function() {
				console.log('Disconnected from database');
				stopMUD('Disconnected from database');
			});
			return db.connect(mongoUri);
		}

		function resetDatabase() {
			console.log('Resetting database...');
			var deleteAllWorldParams = db.models.WorldParams.remove().exec();
			var deleteAllPlayers = db.models.Player.remove().exec();
			var deleteAllEntities = db.models.Entity.remove().exec();
			return Promise.all([ deleteAllWorldParams, deleteAllPlayers, deleteAllEntities ]);
		}

		function initializeTheWorld() {
			console.log('Initializing world...');
			return initializeWorld();
		}

		function createMUD() {
			console.log('Creating MUD...');
			mud = new MUD();
			return mud.setUp();
		}

		function startMUD() {
			console.log('Starting MUD...');
			mudRunner = new MUDRunner(mud);
			mudRunner.start();
		}

		function createShell() {
			console.log('Creating shell...');
			shell = new Shell(mud);
		}

		function connectToSlack() {
			console.log('Connecting to Slack...');
			bot = new SlackBot();
			bot.on('error', function(err) {
				console.log('Slack error', err);
			});
			bot.on('disconnect', function() {
				console.log('Disconnected from Slack');
			});
			return bot.connect(slackToken);
		}

		function hookShellUpToSlack() {
			console.log('Hooking the shell up to Slack...');
			bot.on('receive', function(userId, message) {
				shell.receive(userId, message);
			});
			shell.on('send', function(userId, message) {
				if(bot.isConnected() && userId !== COMMAND_LINE_USER_ID) {
					bot.send(userId, message);
				}
			});
		}

		function hookShellUpToCommandLine() {
			console.log('Hooking the shell up to the command line...');
			var stdin = process.openStdin();
			stdin.addListener("data", function(d) {
				shell.receive(COMMAND_LINE_USER_ID, d.toString().trim());
			});
			shell.on('send', function(userId, message) {
				if(userId === COMMAND_LINE_USER_ID) {
					console.log(message);
				}
			});
		}

		function saveDatabasePeriodically() {
			console.log('Periodically saving database...');
			saveDatabase();
		}

		function saveDatabase() {
			Promise.all([EntityORM.saveEntities(), PlayerORM.savePlayers() ])
				.then(function() {
					setTimeout(saveDatabase, 5 * 1000);
				})
				.catch(function(err) {
					console.log('Error saving database', err);
				});
		}

		function stopMUD(reason) {
			db.disconnect();
			if(mudRunner) {
				mudRunner.stop();
			}
			if(shell) {
				shell.kill(reason);
			}
		}
	};
});
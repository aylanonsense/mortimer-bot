define([
	'util/log',
	'util/promise/createPromise',
	'db/connection',
	'db/EntityORM',
	'db/PlayerORM',
	'mud/initializeWorld',
	'mud/MUD',
	'mud/MUDRunner',
	'shell/Shell',
	'slack/SlackBot'
], function(
	log,
	createPromise,
	db,
	EntityORM,
	PlayerORM,
	initializeWorld,
	MUD,
	MUDRunner,
	Shell,
	SlackBot
) {
	var MAX_SLACK_CONNECT_MS = 1000;
	var DATABASE_SAVE_FREQ_MS = 10000;
	var COMMAND_LINE_USER_ID = 'cmdline';

	return function main(params) {
		//set console log level
		log.transports.console.level = params.LOG_LEVEL;

		//do everything we need to set up our application!
		log.info('Setting up...');
		var isShutDown = false;
		var isSetUp = false;
		var asyncErr, mud, mudRunner, shell, slackBot, stdin;
		createPromise()
			.then(connectToDatabase)
			.then(resetDatabase)
			.then(initializeTheWorld)
			.then(createMUD)
			.then(startMUD)
			.then(createShell)
			.then(saveDataPeriodically)
			.then(connectToSlack)
			.then(hookShellUpToSlack)
			.then(hookShellUpToCommandLine)
			.then(completeSetup)
			.catch(handleError);

		function connectToDatabase() {
			log.verbose('Connecting to database...');
			db.on('error', function(err) {
				if(!isShutDown) {
					log.error('Database error', err);
					asyncErr = err;
					if(isSetUp) {
						handleError(asyncErr);
					}
				}
			});
			db.on('disconnect', function() {
				if(!isShutDown) {
					log.error('Disconnected from database');
					asyncErr = new Error('Disconnected from database');
					if(isSetUp) {
						handleError(asyncErr);
					}
				}
			});
			return db.connect(params.MONGO_URI)
				.then(function() {
					if(isShutDown) {
						db.disconnect();
					}
					else {
						log.verbose('Connected to database!');
					}
				})
				.then(checkForAsyncError);
		}

		function resetDatabase() {
			log.verbose('Resetting database...');
			var promises = [];
			for(var modelName in db.models) {
				promises.push(db.models[modelName].remove().exec());
			}
			return Promise.all(promises)
				.then(function() {
					log.verbose('Database reset!');
				})
				.then(checkForAsyncError);
		}

		function initializeTheWorld() {
			log.verbose('Initializing the world...');
			return initializeWorld()
				.then(function() {
					log.verbose('World initialized!');
				})
				.then(checkForAsyncError);
		}

		function createMUD() {
			log.verbose('Setting up MUD...');
			mud = new MUD();
			return mud.setUp()
				.then(function() {
					log.verbose('MUD set up!');
				})
				.then(checkForAsyncError);
		}

		function startMUD() {
			log.verbose('Starting MUD...');
			mudRunner = new MUDRunner(mud);
			mudRunner.start();
			log.verbose('MUD started!');
			checkForAsyncError();
		}

		function createShell() {
			log.verbose('Creating shell...');
			shell = new Shell(mud);
			log.verbose('Shell created!');
			checkForAsyncError();
		}

		function hookShellUpToCommandLine() {
			log.verbose('Hooking shell up to the command line...');
			stdin = process.openStdin();
			stdin.addListener('data', function(data) {
				var message = data.toString().trim();
				shell.receive(COMMAND_LINE_USER_ID, message);
			});
			shell.on('send', function(userId, message) {
				if(userId === COMMAND_LINE_USER_ID) {
					console.log(message); //intentionally not using logs
				}
			});
			log.verbose('Shell hooked up to the command line!');
			checkForAsyncError();
		}

		function connectToSlack() {
			log.verbose('Connecting to Slack...');
			var hasGivenUp = false;
			slackBot = new SlackBot();
			slackBot.on('error', function(err) {
				if(!isShutDown) {
					if(hasGivenUp) {
						log.warn('Silent Slack error after giving up', err);
					}
					else {
						log.error('Slack error', err);
						asyncErr = err;
						if(isSetUp) {
							handleError(asyncErr);
						}
					}
				}
			});
			slackBot.on('disconnect', function() {
				if(!isShutDown) {
					if(hasGivenUp) {
						log.debug('Disconnected from Slack after giving up');
					}
					else {
						log.error('Disconnected from Slack');
						asyncErr = new Error('Disconnected from Slack');
						if(isSetUp) {
							handleError(asyncErr);
						}
					}
				}
			});
			return new Promise(function(fulfill, reject) {
				var hasConnected = false;
				//set a maximum amount of time before giving up on Slack
				slackBot.connect(params.SLACK_TOKEN)
					.then(function() {
						if(isShutDown) {
							slackBot.disconnect();
						}
						else if(hasGivenUp) {
							log.debug('Eventually DID connect to Slack, oh well...');
							slackBot.disconnect();
						}
						else {
							hasConnected = true;
							log.verbose('Connected to Slack!');
							fulfill();
						}
					})
					.catch(function(err) {
						reject(err);
					});
				setTimeout(function() {
					if(!hasConnected) {
						hasGivenUp = true;
						log.warn('Failed to connect to Slack! Continuing...');
						fulfill();
					}
				}, MAX_SLACK_CONNECT_MS);
			})
				.then(checkForAsyncError);
		}

		function hookShellUpToSlack() {
			if(slackBot.isConnected()) {
				log.verbose('Hooking shell up to Slack...');
				slackBot.on('receive', function(userId, message) {
					shell.receive(userId, message);
				});
				shell.on('send', function(userId, message) {
					if(slackBot.isConnected() && userId !== COMMAND_LINE_USER_ID) {
						slackBot.send(userId, message);
					}
				});
				log.verbose('Shell hooked up to Slack!');
			}
			else {
				log.debug('Not hooking shell up to Slack since it isn\'t connected...');
			}
			checkForAsyncError();
		}

		function saveDataPeriodically() {
			scheduleSaveDatabase();
			log.verbose('Periodically saving data to database!');
			checkForAsyncError();
		}

		function completeSetup() {
			isSetUp = true;
			log.info('Setup complete! Ready for connections');
		}

		function checkForAsyncError() {
			if(asyncErr) {
				throw new Error(asyncErr);
			}
		}

		function handleError(err) {
			if(isSetUp) {
				log.error('Error while running', err);
			}
			else {
				log.error('Error during startup', err);
			}

			//shut everything down
			if(!isShutDown) {
				isShutDown = true;
				log.info('Shutting everything down...');
				createPromise()
					.then(function() {
						if(mudRunner) {
							mudRunner.stop();
						}
						if(stdin) {
							stdin.destroy();
						}
						if(slackBot && slackBot.isConnected()) {
							slackBot.disconnect();
						}
					})
					.then(function() {
						if(db.isConnected()) {
							log.info('Making final save to database...');
							return saveDatabase()
								.then(function() {
									log.info('Made final save to database!');
									db.disconnect();
								})
								.catch(function(err) {
									log.error('Error making final save to database', err);
								});
						}
						else {
							log.warn('Could not make final save to database: already disconnected');
						}
					})
					.then(function() {
						log.info('Shut down!');
					})
					.catch(function(err) {
						log.error('Error during shutdown', err);
						log.error('Executing hard shutdown...');
						process.exit(1);
					});
			}
		}

		//helper methods
		function scheduleSaveDatabase() {
			setTimeout(function() {
				if(!isShutDown) {
					log.debug('Saving database...');
					saveDatabase()
						.then(function() {
							log.debug('Database saved!');
							scheduleSaveDatabase();
						})
						.catch(function(err) {
							asyncErr = err;
							if(isSetUp) {
								handleError(asyncErr);
							}
						});
				}
			}, DATABASE_SAVE_FREQ_MS);
		}

		function saveDatabase() {
			//TODO WorldParams as well
			return Promise.all([ EntityORM.saveEntities(), PlayerORM.savePlayers() ]);
		}
	};
});
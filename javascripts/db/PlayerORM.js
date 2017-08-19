define([
	'util/log',
	'db/connection',
	'db/Player',
	'util/promise/createPromise'
], function(
	log,
	db,
	Player,
	createPromise
) {
	var players = {};
	var queries = {};

	//helper methods
	function savePlayer(player) {
		player.needsToSave = false;
		return player.model.save()
			.then(function() {
				if(player.canBeUnloadedByORM && !player.needsToSave) {
					delete players[player.userId];
				}
			})
			.catch(function(err) {
				player.needsToSave = true;
				log.error('Error saving player ' + player, err);
			});
	}

	return {
		getPlayerByUserId: function(userId, assertExistsMessage) {
			return createPromise()
				.then(function() {
					//if no user id is passed in, we fail
					if(!userId) {
						if(assertExistsMessage === true) {
							throw new Error('Player with falsey user id "' + userId + '" does not exist!');
						}
						else if(assertExistsMessage) {
							throw new Error(assertExistsMessage);
						}
						//we fail silently by default
						else {
							return null;
						}
					}
					//if we have the player, just return it!
					else if(players[userId]) {
						//well, if it's slated to be deleted, we pretend it was and recreate it
						if(players[userId].canBeUnloadedByORM) {
							players[userId] = new Player(players[userId].model);
							players[userId].needsToSave = true;
						}
						return players[userId];
					}
					//if we're already getting that player, just return the existing promise
					else if(queries[userId]) {
						return queries[userId];
					}
					//otherwise get the player from the database!
					else {
						queries[userId] = db.models.Player.findOne({ userId: userId })
							.then(function(model) {
								delete queries[userId];
								//if we already have the player somehow... woah! can happen from other methods
								if(players[userId]) {
									log.debug('Player ' + players[userId] + ' appeared while querying for it!');
									return players[userId];
								}
								//if the player doesn't exist, we fail
								else if(!model) {
									if(assertExistsMessage === true) {
										throw new Error('Player with user id "' + userId + '" does not exist!');
									}
									else if(assertExistsMessage) {
										throw new Error(assertExistsMessage);
									}
									else {
										return null;
									}
								}
								//otherwise create the player, we haven't fetched it before
								else {
									players[userId] = new Player(model);
									return players[userId];
								}
							});
						return queries[userId];
					}
				});
		},
		createPlayer: function(params) {
			var player = new Player(new db.models.Player(params));
			player.needsToSave = true;
			players[player.userId] = player;
			return player;
		},
		savePlayers: function() {
			//save each player that needs to be saved
			var saves = [];
			for(var userId in players) {
				if(players[userId].needsToSave) {
					saves.push(savePlayer(players[userId]));
				}
			}
			//fulfill the promise only when all players are saved
			return Promise.all(saves);
		},
		unloadPlayer: function(player) {
			player.canBeUnloadedByORM = true;
			//if the player doesn't need to save we can unload immediately
			if(!player.needsToSave) {
				delete players[player.userId];
			}
		}
	};
});
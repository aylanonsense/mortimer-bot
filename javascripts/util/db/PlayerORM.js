define([
	'shell/Player',
	'util/db/connection'
], function(
	Player,
	db
) {
	var playersByUserId = {};
	var queriesByUserId = {};

	//helper methods
	function savePlayer(player) {
		player.needsToSave = false;
		var save = player.model.save();
		save.catch(function(err) {
			player.needsToSave = true;
		});
		return save;
	}

	return {
		getPlayerByUserId: function(userId, assertExistsMessage) {
			return new Promise(function(fulfill, reject) {
				//if no user id is passed in, we fail silently
				if(!userId) {
					fulfill(null); //even if we have an assert
				}
				//if we have the player, just return it!
				else if(playersByUserId[userId]) {
					fulfill(playersByUserId[userId]);
				}
				//if we've already tried to find it and it doesn't exist, oh well
				else if(queriesByUserId[userId] === 'does not exist') {
					if(assertExistsMessage) {
						reject(assertExistsMessage);
					}
					else {
						fulfill(null);
					}
				}
				//if we're already getting that player, just return the existing promise
				else if(queriesByUserId[userId]) {
					fulfill(queriesByUserId[userId]);
				}
				//otherwise get the player from the database!
				else {
					queriesByUserId[userId] = db.models.Player.findOne({ userId: userId }).then(function(model) {
						if(!model) {
							queriesByUserId[userId] = 'does not exist';
							if(assertExistsMessage) {
								throw new Error(assertExistsMessage);
							}
							else {
								return null;
							}
						}
						else {
							var player = new Player(model);
							playersByUserId[userId] = player;
							delete queriesByUserId[userId];
							return player;
						}
					});
					fulfill(queriesByUserId[userId]);
				}
			});
		},
		createPlayer: function(params) {
			//creating an player is simple and synchronous
			var model = new db.models.Player(params);
			var player = new Player(model);
			player.needsToSave = true;
			playersByUserId[model.userId] = player;
			delete queriesByUserId[model.userId]; //TODO doesn't handle promises
			return player;
		},
		savePlayers: function() {
			//save each player that needs to be saved
			var saves = [];
			for(var userId in playersByUserId) {
				if(playersByUserId[userId].needsToSave) {
					saves.push(savePlayer(playersByUserId[userId]));
				}
			}
			//fulfill the promise only when all players are saved
			return Promise.all(saves);
		},
		unloadPlayerByUserId: function(userId) {
			delete playersByUserId[userId];
			delete queriesByUserId[userId];
		},
		forEachPlayer: function(callback) {
			//cache the list of userIds just in case the callback adds more
			var userIds = [];
			for(var userId in playersByUserId) {
				userIds.push(userId);
			}
			//run the callback on each user id
			for(var i = 0; i < ids.length; i++) {
				callback(playersByUserId[userIds[i]]);
			}
		}
	};
});
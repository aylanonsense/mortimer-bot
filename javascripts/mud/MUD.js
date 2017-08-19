define([
	'util/log',
	'db/connection',
	'util/EventHelper',
	'db/EntityORM',
	'util/promise/createPromise'
], function(
	log,
	db,
	EventHelper,
	EntityORM,
	createPromise
) {
	function MUD() {
		//constant-ish properties
		this.worldParams = null;

		//game vars
		this.entities = [];

		this._events = new EventHelper([]);
	}
	MUD.prototype.setUp = function() {
		var self = this;

		//get the params for this MUD
		return db.models.WorldParams.findOne().exec()
			.then(function(worldParams) {
				self.worldParams = worldParams;
			});
	};
	MUD.prototype.getEntityInGame = function(id) {
		for(var i = 0; i < this.entities.length; i++) {
			if(this.entities[i].id === id) {
				return this.entities[id];
			}
		}
		return null;
	};
	MUD.prototype.update = function(dt, time) {};
	MUD.prototype.addPlayer = function(player) {
		var self = this;
		var logPrefix = player + ' ';
		//get the entity the player is controlling
		return createPromise()
			//let's start by finding the player's controlled entity
			.then(function() {
				log.verbose(logPrefix + 'Getting player\'s controlled entity...');
				return EntityORM.getEntityById(player.controlledEntityId);
			})
			//if the player didn't have a controlled entity, we can try using their avatar instead
			.then(function(entity) {
				if(entity) {
					return entity;
				}
				else {
					log.verbose(logPrefix + 'Player does not have a (valid) controlled entity, trying avatar instead...');
					return EntityORM.getEntityById(player.avatarEntityId)
						.then(function(entity) {
							if(entity) {
								player.controlledEntityId = entity.id;
							}
							return entity;
						});
				}
			})
			//if the player doesn't have an avatar, try cloning the starting actor
			.then(function(entity) {
				if(entity) {
					return entity;
				}
				else {
					log.verbose(logPrefix + 'Player does not have a (valid) avatar entity, cloning new avatar entity...');
					return EntityORM.cloneEntityById(self.worldParams.startingActorBlueprintId, 'Starting actor blueprint with id "' + self.worldParams.startingActorBlueprintId + '" does not exist!!')
						.then(function(entity) {
							entity.isBlueprint = false;
							player.avatarEntityId = entity.id;
							player.controlledEntityId = entity.id;
							return entity;
						});
				}
			})
			//bind the entity and the player to each other
			.then(function(entity) {
				if(entity.player) {
					log.warn(logPrefix + 'Player\'s entity ' + entity + ' already controlled by a player ' + entity.player);
				}
				entity.player = player;
				player.entity = entity;
			})
			//load all of the entity's children
			.then(function(entity) {
				return self._recursivelyLoadChildren(entity);
			})
			//begin adding entity to the game
			.then(function(entity) {
				log.verbose(logPrefix + 'Ensuring player\'s entity ' + entity + ' has the proper context...');
				if(!entity.isAddedToGame) {
					self.entities.push(entity);
					entity.isAddedToGame = true;
				}
				entity.isLoadingContext = true;
				return self._ensureEntityContext(entity);
			})
			/*
			.then(function(entity) {
				//if the entity is already added to the game, we have nothing to do
				if(entity.isAddedToGame) {
					log.verbose(logPrefix + 'Player\'s entity ' + entity + ' already added to game');
					return entity;
				}
				else if(entity.isBeingAddedToGame) {
					log.verbose(logPrefix + 'Player\'s entity ' + entity + ' is already being added to the game');
					return entity;
				}
				else {
					log.verbose(logPrefix + 'Adding player\'s entity ' + entity + ' to the game...');
					return self._beginAddingEntityAndChildren(entity)
						.then(function(entitiesBeingAdded) {

						});
				}
					//the entity exists in the void--we can just add it to the game then
					/*if(!entity.heldById) {
						entity.parentEntityHasBeenLoaded = true;
						return self._beginAddingEntityAndChildren(entity);
					}
					else {
						var parentEntity = self.getEntityInGame(entity.heldById);
						//the parent entity is already added to the game, just add this entity to it
						if(parentEntity) {
							return self._beginAddingEntityAndChildren(entity)
								.then(function() {
									//TODO what if the parent is unloaded?
									parentEntity.childEntities.push(entity);
									entity.parentEntity = parentEntity;
									entity.parentEntityHasBeenLoaded = true;
								});
						}
						//the parent entity hasn't been added yet, we can add it and it'll add this entity too
						else {
							return EntityORM.getEntityById(entity.heldById, logPrefix + 'Player\'s entity ' + entity + ' has a parent that doesn\'t exist with id "' + entity.heldById + '"!')
								.then(function(parentEntity) {
									return self._beginAddingEntityAndChildren(parentEntity);
								});
						}
					}*/
			//})
			//add the entity to the game
			/*.then(function(entity) {
				//TODO if I log in as an entity that already exists but doesn't have a parent loaded
				//if the entity is already added to the game, we have nothing to do
				if(entity.isAddedToGame) {
					log.verbose(logPrefix + 'Player\'s entity ' + entity + ' already added to game');
					return entity;
				}
				else if(entity.isBeingAddedToGame) {
					log.verbose(logPrefix + 'Player\'s entity ' + entity + ' is already being added to the game');
					return entity;
				}
				else {
					log.verbose(logPrefix + 'Adding player\'s entity ' + entity + ' to the game...');
					//the entity exists in the void--we can just add it to the game then
					if(!entity.heldById) {
						entity.parentEntityHasBeenLoaded = true;
						return self._beginAddingEntityAndChildren(entity);
					}
					else {
						var parentEntity = self.getEntityInGame(entity.heldById);
						//the parent entity is already added to the game, just add this entity to it
						if(parentEntity) {
							return self._beginAddingEntityAndChildren(entity)
								.then(function() {
									//TODO what if the parent is unloaded?
									parentEntity.childEntities.push(entity);
									entity.parentEntity = parentEntity;
									entity.parentEntityHasBeenLoaded = true;
								});
						}
						//the parent entity hasn't been added yet, we can add it and it'll add this entity too
						else {
							return EntityORM.getEntityById(entity.heldById, logPrefix + 'Player\'s entity ' + entity + ' has a parent that doesn\'t exist with id "' + entity.heldById + '"!')
								.then(function(parentEntity) {
									return self._beginAddingEntityAndChildren(parentEntity);
								});
						}
					}
				}
			})*/
			.then(function(entity) {
				log.silly('TODO more steps!');
			});
	};
	MUD.prototype._recursivelyLoadChildren = function(entity) {

	};
	/*MUD.prototype._detachEntityFromContext = function(entity) {
		if(entity.parentEntity) {
			entity.parentEntity.removeChildById(entity.id);
			entity.parentEntity = null;
		}
	};
	MUD.prototype._ensureEntityContext = function(entity) {
		return createPromise()
			.then(function() {
				//we only need to load extra context if the entity is dynamic or controlled by a player
				if(entity.player || entity.isDynamic) {

				}
				else {

				}
			});
	};
	MUD.prototype._beginAddingEntityAndChildren = function(entity, entitiesBeingAdded) {
		var self = this;
		if(!entitiesBeingAdded) {
			entitiesBeingAdded = [];
		}
		//this will just recursively add the entity and everything under if to the game
		return createPromise()
			.then(function() {
				if(!entity.isAddedToGame && !entity.isBeingAddedToGame) {
					entity.isBeingAddedToGame = true;
					entitiesBeingAdded.push(entity);
					return EntityORM.getAllEntitiesHeldBy(entity.id)
						//let's start by adding everything under the entity to the game
						.then(function(childEntities) {
							var addPromises = [];
							for(var i = 0; i < childEntities.length; i++) {
								entity.childEntities.push(childEntities[i]);
								childEntities[i].parentEntity = entity;
								childEntities[i].parentEntityHasBeenLoaded = true;
								addPromises.push(self._beginAddingEntityAndChildren(childEntities[i]));
							}
							return Promise.all(addPromises);
						})
						.then(function() {
							return entitiesBeingAdded;
						});
				}
				else {
					return entitiesBeingAdded;
				}
			});
	};*/
		
		/*return EntityORM.getEntityById(entity.model.heldById, 'Parent for entity "' + entity.model.moniker + '" does not exist <id=' + entity.model.moniker + '>')
			//load everything under that parent entity (or the entity itself)
			.then(function(parentEntity) {
				if(parentEntity && !parentEntity.addedToGame) {
					log.debug(logPrefix + 'Loading context starting with parent entity "' + parentEntity.model.moniker + '" <id=' + parentEntity.model.id + '>');
					//TODO parent entity could be added twice!
					return self._recursivelyLoadEntities(parentEntity, [], logPrefix);
				}
				else {
					log.debug(logPrefix + 'Entity has no parent, loading context starting with entity "' + entity.model.moniker + '" <id=' + entity.model.id + '>');
					return self._recursivelyLoadEntities(entity, [], logPrefix);
				}
			});
	};*/
			//add the entity to the game
			/*.then(function(entity) {
				//bind the entity to the player so they can hear what happens
				entity.player = player;
				log.verbose(logPrefix + 'Successfully retrieved entity for player ' + entity);
				if(!entity.isAddedToGame) {
					return self._addEntityToGame(entity)
						.then(function() {
							return entity;
						});
				}
				else {
					return entity;
				}
			})
			//bind the player to the entity so they can send commands	
			.then(function(entity) {
				player.entity = entity;
			});*/


			//now we need to add the entity (and its context) to the game
			/*.then(function(entity) {
				log.verbose(logPrefix + 'Loading context for player entity "' + entity.model.moniker + '" <id=' + entity.model.id + '>');
				return self._loadEntityAndContext(entity)
					.then(function(newEntities) {
						log.verbose(logPrefix + 'Adding ' + newEntities.length + (newEntities.length === 1 ? ' entity' : ' entities') + ' to the game');
						for(var i = 0; i < newEntities.length; i++) {
							if(!newEntities[i].addedToGame) {
								newEntities[i].addedToGame = true;
								self.entities.push(newEntities[i]);
							}
						}
						return entity;
					});
			});
		*/
	/*MUD.prototype._loadEntityAndContext = function(entity) {
		var self = this;
		var logPrefix = '|----| ';
		//find the parent entity
		log.debug(logPrefix + 'Loading context for entity "' + entity.model.moniker + '" <id=' + entity.model.id + '>');
		return EntityORM.getEntityById(entity.model.heldById, 'Parent for entity "' + entity.model.moniker + '" does not exist <id=' + entity.model.moniker + '>')
			//load everything under that parent entity (or the entity itself)
			.then(function(parentEntity) {
				if(parentEntity && !parentEntity.addedToGame) {
					log.debug(logPrefix + 'Loading context starting with parent entity "' + parentEntity.model.moniker + '" <id=' + parentEntity.model.id + '>');
					//TODO parent entity could be added twice!
					return self._recursivelyLoadEntities(parentEntity, [], logPrefix);
				}
				else {
					log.debug(logPrefix + 'Entity has no parent, loading context starting with entity "' + entity.model.moniker + '" <id=' + entity.model.id + '>');
					return self._recursivelyLoadEntities(entity, [], logPrefix);
				}
			});
	};
	MUD.prototype._recursivelyLoadEntities = function(entity, entitiesNotAdded, logPrefix) {
		var self = this;
		log.debug(logPrefix + 'Loading entities held by "' + entity.model.moniker + '" <id=' + entity.model.id + '>');
		return EntityORM.getAllEntitiesHeldBy(entity.model.id)
			.then(function(children) {
				// console.log(entity.model.id + ' is holding ' + children.map(function(e) { return e.model.id + ' [' + e.model.heldById + ']'; }).join(' '));
				var promises = [];
				entity.children = children;
				for(var i = 0; i < children.length; i++) {
					log.debug(logPrefix + 'Entity "' + entity.model.moniker + '" <id=' + entity.model.id + '> is holding entity "' + children[i].model.moniker + '" <id="' + children[i].model.moniker + '>' + (children[i].addedToGame ? ' (already added)' : ''));
				}
				for(i = 0; i < children.length; i++) {
					children[i].parent = entity;
					if(!children[i].addedToGame) {
						promises.push(self._recursivelyLoadEntities(children[i], entitiesNotAdded));
					}
				}
				return Promise.all(promises);
			})
			.then(function() {
				entitiesNotAdded.push(entity);
				return entitiesNotAdded;
			});
	};*/
	MUD.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return MUD;
});
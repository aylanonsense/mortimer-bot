define([
	'util/db/connection',
	'util/EventHelper',
	'util/db/EntityORM'
], function(
	db,
	EventHelper,
	EntityORM
) {
	function MUD() {
		//constant-ish properties
		this.worldParams = null;
		this.nowhereRoom = null;
		this.startingRoom = null;
		this.startingActorBlueprint = null;

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
			})
			//then find the nowhere room
			.then(function(nowhereRoom) {
				return EntityORM.getEntityById(self.worldParams.nowhereRoom, 'Nowhere room does not exist')
					.then(function(nowhereRoom) {
						self.nowhereRoom = nowhereRoom;
					});
			})
			//then find the starting room
			.then(function(startingRoom) {
				return EntityORM.getEntityById(self.worldParams.startingRoom, 'Starting room does not exist')
					.then(function(startingRoom) {
						self.startingRoom = startingRoom;
					});
			})
			//then find the starting actor blueprint
			.then(function() {
				return EntityORM.getEntityById(self.worldParams.startingActorBlueprint, 'Starting actor blueprint does not exist')
					.then(function(startingActorBlueprint) {
						self.startingActorBlueprint = startingActorBlueprint;
					});
			});
	};
	MUD.prototype.update = function(dt, time) {};
	MUD.prototype.addPlayer = function(player) {
		console.log('Adding player');
		var self = this;

		//get the entity the player is controlling
		return EntityORM.getEntityById(player.model.controlledEntity, 'Controlled entity with id ' + player.model.controlledEntity + ' does not exist')
			//if it doesn't exist, create the default starting entity
			.then(function(entity) {
				console.log('Finding/creating controlled entity');
				if(!entity) {
					entity = EntityORM.cloneEntity(self.startingActorBlueprint);
					entity.model.isBlueprint = false;
					entity.model.heldBy = self.startingRoom.model.id;
					player.model.avatarEntity = entity.model.id;
					player.model.controlledEntity = entity.model.id;
					player.needsToSave = true;
				}
				return entity;
			})
			//now we need to add the entity (and its context) to the game
			.then(function(entity) {
				console.log('Loading entities and context');
				return self._loadEntityAndContext(entity)
					.then(function(newEntities) {
						for(var i = 0; i < newEntities.length; i++) {
							if(!newEntities[i].addedToGame) {
								newEntities[i].addedToGame = true;
								self.entities.push(newEntities[i]);
							}
						}
						return entity;
					});
			})
			//finally the player has an entity they can control
			.then(function(entity) {
				if(player.hasLeft()) {
					console.log('Player has already left! Putting entity back into stasis');
					if(!entity.model.canExistWithoutPlayer) {
						entity.model.isInStasis = true;
						entity.needsToSave = true;
					}
				}
				else {
					console.log('Binding event handlers for player');
					if(entity.model.isInStasis) {
						entity.model.isInStasis = false;
						entity.needsToSave = true;
					}
					player.entity = entity;
					entity.player = player;
					//bind input events
					player.on('receive', function(text) {
						player.entity.performAction(text);
					});
					player.on('leave', function() {
						if(!player.entity.model.canExistWithoutPlayer) {
							player.entity.model.isInStasis = true;
							player.entity.needsToSave = true;
						}
						player.entity.player = null;
						player.entity = null;
					});
				}
				return player;
			});
	};
	MUD.prototype._loadEntityAndContext = function(entity) {
		var self = this;
		//find the parent entity
		return EntityORM.getEntityById(entity.model.heldBy, 'Entity with id ' + entity.model.heldBy + ' does not exist')
			//load everything under that parent entity (or the entity itself)
			.then(function(parentEntity) {
				if(parentEntity && !parentEntity.addedToGame) {
					return self._recursivelyLoadEntities(parentEntity);
				}
				else {
					return self._recursivelyLoadEntities(entity);
				}
			});
	};
	MUD.prototype._recursivelyLoadEntities = function(entity, entitiesNotAdded) {
		var self = this;
		if(!entitiesNotAdded) {
			entitiesNotAdded = [];
		}
		return EntityORM.getAllEntitiesHeldBy(entity.model.id)
			.then(function(children) {
				console.log(entity.model.id + ' is holding ' + children.map(function(e) { return e.model.id + ' [' + e.model.heldBy + ']'; }).join(' '));
				var promises = [];
				entity.children = children;
				for(var i = 0; i < children.length; i++) {
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
	};
	MUD.prototype.on = function(eventName, callback, ctx) {
		return this._events.on.apply(this._events, arguments);
	};
	return MUD;
});
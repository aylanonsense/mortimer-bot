define([
	'mud/Entity',
	'util/db/connection'
], function(
	Entity,
	db
) {
	var entitiesById = {};
	var queriesById = {};

	//helper methods
	function saveEntity(entity) {
		entity.needsToSave = false;
		var save = entity.model.save();
		save.catch(function(err) {
			entity.needsToSave = true;
		});
		return save;
	}
	function createEntitiesFromModels(models) {
		var entities = [];
		for(var i = 0; i < models.length; i++) {
			var id = models[i].id;
			if(entitiesById[id]) {
				entities.push(entitiesById[id]);
			}
			else {
				var entity = new Entity(models[i]);
				entitiesById[id] = entity;
				delete queriesById[id];
				entities.push(entity);
			}
		}
		return entities;
	}

	return {
		getEntityById: function(id, assertExistsMessage) {
			return new Promise(function(fulfill, reject) {
				//if no id is passed in, we fail silently
				if(!id) {
					fulfill(null); //even if we have an assert
				}
				//if we have the entity, just return it!
				else if(entitiesById[id]) {
					fulfill(entitiesById[id]);
				}
				//if we've already tried to find it and it doesn't exist, oh well
				else if(queriesById[id] === 'does not exist') {
					if(assertExistsMessage) {
						reject(assertExistsMessage);
					}
					else {
						fulfill(null);
					}
				}
				//if we're already getting that entity, just return the existing promise
				else if(queriesById[id]) {
					fulfill(queriesById[id]);
				}
				//otherwise get the entity from the database!
				else {
					queriesById[id] = db.models.Entity.findById(id).then(function(model) {
						if(!model) {
							queriesById[id] = 'does not exist';
							if(assertExistsMessage) {
								throw new Error(assertExistsMessage);
							}
							else {
								return null;
							}
						}
						//if we already have the entity somehow... woah! can happen tho
						else if(entitiesById[id]) {
							delete queriesById[id];
							return entitiesById[id];
						}
						//create the entity, we haven't fetched it before
						else {
							var entity = new Entity(model);
							entitiesById[id] = entity;
							delete queriesById[id];
							return entity;
						}
					});
					fulfill(queriesById[id]);
				}
			});
		},
		getAllDynamicEntities: function() {
			return db.models.Entity.find({ isDynamic: true })
				.then(createEntitiesFromModels)
				//okay now we ignore those results and filter on the local entity list
				.then(function() {
					var entities = [];
					for(var id in entitiesById) {
						if(entitiesById[id].model.isDynamic) {
							entities.push(entitiesById[id]);
						}
					}
					return entities;
				});
		},
		getAllEntitiesHeldBy: function(id) {
			return new Promise(function(fulfill, reject) {
				if(!id) {
					fulfill([]);
				}
				else {
					fulfill(db.models.Entity.find({ heldBy: id })
						.then(createEntitiesFromModels)
						//okay now we ignore those results and filter on the local entity list
						.then(function() {
							var entities = [];
							for(var id2 in entitiesById) {
								if(entitiesById[id2].model.heldBy === id) {
									entities.push(entitiesById[id2]);
								}
							}
							return entities;
						}));
				}
			});
		},
		createEntity: function(params) {
			//creating an entity is simple and synchronous
			var model = new db.models.Entity(params);
			var entity = new Entity(model);
			entity.needsToSave = true;
			entitiesById[model.id] = entity;
			delete queriesById[model.id]; //TODO doesn't handle promises
			return entity;
		},
		cloneEntity: function(entity) {
			var params = entity.model.toJSON();
			delete params._id;
			delete params._v;
			return this.createEntity(params);
		},
		saveEntities: function() {
			//save each entity that needs to be saved
			var saves = [];
			for(var id in entitiesById) {
				if(entitiesById[id].needsToSave) {
					saves.push(saveEntity(entitiesById[id]));
				}
			}
			//fulfill the promise only when all entities are saved
			return Promise.all(saves);
		},
		unloadEntityById: function(id) {
			if(entitiesById[id].needsToSave) {
				//TODO not perfect, a load could load it before it is saved
				entitiesById[id].model.save();
			}
			delete entitiesById[id];
			delete queriesById[id];
		},
		forEachEntity: function(callback) {
			//cache the list of ids just in case the callback adds more
			var ids = [];
			for(var id in entitiesById) {
				ids.push(id);
			}
			//run the callback on each id
			for(var i = 0; i < ids.length; i++) {
				callback(entitiesById[ids[i]]);
			}
		}
	};
});
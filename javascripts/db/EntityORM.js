define([
	'util/log',
	'db/connection',
	'db/Entity',
	'util/promise/createPromise'
], function(
	log,
	db,
	Entity,
	createPromise
) {
	var entities = {};
	var queries = {};

	//TODO recreate unloaded entities

	//helper methods
	function saveEntity(entity) {
		entity.needsToSave = false;
		return entity.model.save()
			.then(function() {
				if(entity.canBeUnloadedByORM && !entity.needsToSave) {
					delete entities[entity.id];
				}
			})
			.catch(function(err) {
				entity.needsToSave = true;
				log.error('Error saving entity ' + entity, err);
			});
	}

	return {
		getEntityById: function(id, assertExistsMessage) {
			return createPromise()
				.then(function() {
					//if no id is passed in, we fail
					if(!id) {
						if(assertExistsMessage === true) {
							throw new Error('Entity with falsey id "' + id + '" does not exist!'); //id is falsey
						}
						else if(assertExistsMessage) {
							throw new Error(assertExistsMessage);
						}
						//we fail silently by default
						else {
							return null;
						}
					}
					//if we have the entity, just return it!
					else if(entities[id]) {
						//well, if it's slated to be deleted, we pretend it was and recreate it
						if(entities[id].canBeUnloadedByORM) {
							entities[id] = new Entity(entities[id].model);
							entities[id].needsToSave = true;
						}
						else {
							entities[id].timeLastUsedOrRequested = Date.now();
						}
						return entities[id];
					}
					//if we're already getting that entity, just return the existing promise
					else if(queries[id]) {
						return queries[id];
					}
					//otherwise get the entity from the database!
					else {
						queries[id] = db.models.Entity.findById(id)
							.then(function(model) {
								delete queries[id];
								//if we already have the entity somehow... woah! can happen from other methods
								if(entities[id]) {
									log.debug('Entity ' + entities[id] + ' appeared while querying for it!');
									return entities[id];
								}
								//if the entity doesn't exist, we fail
								else if(!model) {
									if(assertExistsMessage === true) {
										throw new Error('Entity with id "' + id + '" does not exist!');
									}
									else if(assertExistsMessage) {
										throw new Error(assertExistsMessage);
									}
									else {
										return null;
									}
								}
								//otherwise create the entity, we haven't fetched it before
								else {
									entities[id] = new Entity(model);
									return entities[id];
								}
							});
						return queries[id];
					}
				});
		},
		getAllDynamicEntities: function() {
			return db.models.Entity.find({ isDynamic: true, isBlueprint: false })
				.then(function(models) {
					var dynamicEntities = [];
					//first let's add all the entities we already have that are dynamic
					for(var id in entities) {
						if(entities[id].isDynamic) {
							entities[id].canBeUnloadedByORM = false;
							entities[id].timeLastUsedOrRequested = Date.now();
							dynamicEntities.push(entities[id]);
						}
					}
					//then add any entity we don't have locally
					for(var i = 0; i < models.length; i++) {
						if(!entities[models[i].id]) {
							var entity = new Entity(models[i]);
							entities[entity.id] = entity;
							dynamicEntities.push(entity);
						}
					}
					return dynamicEntities;
				});
		},
		getAllEntitiesHeldBy: function(parentId) {
			return db.models.Entity.find({ heldById: parentId, canExistWithoutPlayer: true, isBlueprint: false })
				.then(function(models) {
					var childEntities = [];
					//first let's add all the entities we already have that are held by that entity
					for(var id in entities) {
						if(entities[id].heldById && !entities[id].isBlueprint && (entities[id].canExistWithoutPlayer || entities[id].player)) {
							if(typeof entities[id].heldById !== typeof parentId) {
								log.warn('ID of type "' + (typeof parentId) + '"" is being compared against entity ' + entities[id] + ' with heldById of type "' + (typeof entities[id].heldById) + '"');
							}
							if(entities[id].heldById === parentId) {
								entities[id].canBeUnloadedByORM = false;
								entities[id].timeLastUsedOrRequested = Date.now();
								childEntities.push(entities[id]);
							}
						}
					}
					//then add any entity we don't have locally
					for(var i = 0; i < models.length; i++) {
						if(!entities[models[i].id]) {
							var entity = new Entity(models[i]);
							entities[entity.id] = entity;
							childEntities.push(entity);
						}
					}
					return childEntities;
				});
		},
		createEntity: function(params) {
			var entity = new Entity(new db.models.Entity(params));
			entity.needsToSave = true;
			entities[entity.id] = entity;
			return entity;
		},
		cloneEntityById: function(id, assertExistsMessage) {
			return createPromise()
				//let's start by seeing if we can just find the entity
				.then(function() {
					//if no id is passed in, we fail
					if(!id) {
						if(assertExistsMessage === true) {
							throw new Error('Cannot clone entity with falsey id "' + id + '"!');
						}
						else if(assertExistsMessage) {
							throw new Error(assertExistsMessage);
						}
						//we fail silently by default
						else {
							return null; //will still try to get the model from the db
						}
					}
					//if we have the entity... great!
					else if(entities[id]) {
						return entities[id];
					}
					//if we're already getting that entity, just return the existing promise
					else if(queries[id]) {
						return queries[id];
					}
					//otherwise we will wait to get the model from the db
					else {
						return id;
					}
				})
				//then let's extract the model from that entity
				.then(function(entity) {
					//if we have the entity, it's easy enough to get the model
					if(entity) {
						return entity.model;
					}
					//otherwise we need to get the model from the db
					else {
						return db.models.Entity.findById(id)
							.then(function(model) {
								//if we already have the entity somehow... woah! can happen from other methods
								if(entities[id]) {
									log.debug('Entity ' + entities[id] + ' appeared while cloning it!');
									return entities[id].model;
								}
								//just return the model, if it's null we'll fail later
								else {
									return model;
								}
							});
					}
				})
				//finally we create the clone
				.then(function(model) {
					//the original does not exist!
					if(!model) {
						if(assertExistsMessage === true) {
							throw new Error('Cannot clone entity with id "' + id + '"!'); //id is falsey
						}
						else if(assertExistsMessage) {
							throw new Error(assertExistsMessage);
						}
						//we fail silently by default
						else {
							return null;
						}
					}
					//we have the original's model and can create a clone of it
					else {
						//create a clone
						var params = model.toJSON();
						delete params._id;
						delete params._v;
						//from here on it's just like createEntity
						var entity = new Entity(new db.models.Entity(params));
						entity.needsToSave = true;
						entities[entity.id] = entity;
						return entity;
					}
				});
		},
		saveEntities: function() {
			//save each entity that needs to be saved
			var saves = [];
			for(var id in entities) {
				if(entities[id].needsToSave) {
					saves.push(saveEntity(entities[id]));
				}
			}
			//fulfill the promise only when all entities are saved
			return Promise.all(saves);
		},
		unloadEntity: function(entity) {
			entity.canBeUnloadedByORM = true;
			//if the entity doesn't need to save we can unload immediately
			if(!entity.needsToSave) {
				delete entities[entity.id];
			}
		}
	};
});
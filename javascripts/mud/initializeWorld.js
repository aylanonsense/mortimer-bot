define([
	'util/db/connection',
	'util/db/EntityORM'
], function(
	db,
	EntityORM
) {
	return function initializeWorld() {
		var nowhereRoom = EntityORM.createEntity({
			entityType: 'room',
			title: 'Nowhere',
			description: "You are nowhere."
		});
		var startingRoom = EntityORM.createEntity({
			entityType: 'room',
			title: 'Beginning Room',
			description: "A black void surrounds you."
		});
		var startingActorBlueprint = EntityORM.createEntity({
			entityType: 'actor',
			canExistWithoutPlayer: false,
			isBlueprint: true,
			isInStasis: true,
			title: 'empty shadow',
			description: "The shadow has no form, shape, or color. It's difficult to get a good look at it."
		});

		//save all of the entities we created
		return EntityORM.saveEntities().then(function() {
			//save a set of world params as well
			var worldParams = new db.models.WorldParams({
				nowhereRoom: nowhereRoom.model.id,
				startingRoom: startingRoom.model.id,
				startingActorBlueprint: startingActorBlueprint.model.id
			});
			return worldParams.save();
		});
	};
});
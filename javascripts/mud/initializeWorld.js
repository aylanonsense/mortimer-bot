define([
	'db/connection',
	'db/EntityORM'
], function(
	db,
	EntityORM
) {
	return function initializeWorld() {
		var startingRoom = EntityORM.createEntity({
			entityType: 'room',
			title: 'Beginning Room',
			description: 'A black void surrounds you.'
		});
		var startingActorBlueprint = EntityORM.createEntity({
			entityType: 'actor',
			canExistWithoutPlayer: false,
			isBlueprint: true,
			heldById: startingRoom.id,
			title: 'empty shadow',
			description: 'The shadow has no form, shape, or color. It\'s difficult to get a good look at it.'
		});

		//save all of the entities we created
		return EntityORM.saveEntities().then(function() {
			//save a set of world params as well
			var worldParams = new db.models.WorldParams({
				startingActorBlueprintId: startingActorBlueprint.model.id
			});
			return worldParams.save();
		});
	};
});
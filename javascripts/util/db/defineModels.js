define([
	'mongoose'
], function(
	mongoose
) {
	var Schema = mongoose.Schema;
	var ObjectId = Schema.ObjectId;

	return function defineModels() {
		var WorldParamsSchema = new Schema({
			dateCreated: { type: Date, default: Date.now },
			nowhereRoom: { type: ObjectId, ref: 'Entity', required: true },
			startingRoom: { type: ObjectId, ref: 'Entity', required: true },
			startingActorBlueprint: { type: ObjectId, ref: 'Entity', required: true }
		});

		var PlayerSchema = new Schema({
			dateCreated: { type: Date, default: Date.now },
			dateLastLoggedIn: { type: Date, default: Date.now },
			userId: { type: String, required: true, unique: true },
			avatarEntity: { type: ObjectId, ref: 'Entity' },
			controlledEntity: { type: ObjectId, ref: 'Entity' }
		});

		var EntitySchema = new Schema({
			createPlayer: { type: ObjectId, ref: 'Player' },
			dateCreated: { type: Date, default: Date.now },
			editPlayer: { type: ObjectId, ref: 'Player' },
			dateEdited: { type: Date },
			entityType: { type: String, required: true, enum: [ 'actor', 'room', 'item', 'lore' ] },
			name: { type: String },
			title: { type: String, minlength: 1, maxlength: 50 },
			description: { type: String, maxlength: 5000 },
			pronoun: {
				subject: { type: String, required: true, default: 'it' }, //I/you/we/she/he/they/it did something
				object: { type: String, required: true, default: 'it' }, //something happened to me/you/us/her/him/them/it
				possessiveDeterminer: { type: String, required: true, default: 'its' }, //that is my/your/our/her/his/their/its thing
				possessive: { type: String, required: true, default: 'its' }, //that thing is mine/yours/ours/hers/his/theirs/its
				reflexive: { type: String, required: true, default: 'itself' } //to myself/yourself/ourselves/herself/himself/themselves/itself
			},
			article: { type: String, required: true, default: 'the', enum: [ 'the', 'a' ] },
			heldBy: { type: ObjectId, ref: 'Entity' },
			canExistWithoutPlayer: { type: Boolean, default: true },
			isBlueprint: { type: Boolean, default: false },
			isInStasis: { type: Boolean, default: false },
			isDynamic: { type: Boolean, default: false },
			isQuantity: { type: Boolean, default: false },
			quantity: { type: Number, default: 1 },
			referencedEntity: { type: ObjectId, ref: 'Entity' }
		});

		return {
			WorldParams: mongoose.model('WorldParams', WorldParamsSchema),
			Player: mongoose.model('Player', PlayerSchema),
			Entity: mongoose.model('Entity', EntitySchema)
		};
	};
});
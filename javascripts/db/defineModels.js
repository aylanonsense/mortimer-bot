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
			startingActorBlueprintId: { type: ObjectId, ref: 'Entity', required: true }
		});

		var PlayerSchema = new Schema({
			userId: { type: String, required: true, unique: true },
			dateCreated: { type: Date, default: Date.now },
			dateLastLoggedIn: { type: Date },
			avatarEntityId: { type: ObjectId, ref: 'Entity' },
			controlledEntityId: { type: ObjectId, ref: 'Entity' }
		});

		var EntitySchema = new Schema({
			createPlayerId: { type: ObjectId, ref: 'Player' },
			dateCreated: { type: Date, default: Date.now },
			editPlayerId: { type: ObjectId, ref: 'Player' },
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
			heldById: { type: ObjectId, ref: 'Entity' },
			canExistWithoutPlayer: { type: Boolean, default: true },
			isBlueprint: { type: Boolean, default: false },
			isDynamic: { type: Boolean, default: false },
			isQuantity: { type: Boolean, default: false },
			quantity: { type: Number, default: 1 },
			referencedEntityId: { type: ObjectId, ref: 'Entity' }
		});
		EntitySchema.virtual('moniker')
			.get(function () {
				if(this.name) {
					return this.name;
				}
				else if(this.title) {
					return this.article + ' ' + this.title;
				}
				else {
					return 'unnamed';
				}
			});

		return {
			WorldParams: mongoose.model('WorldParams', WorldParamsSchema),
			Player: mongoose.model('Player', PlayerSchema),
			Entity: mongoose.model('Entity', EntitySchema)
		};
	};
});
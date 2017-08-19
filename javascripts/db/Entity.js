define([
], function(
) {
	function Entity(model) {
		this.model = model;
		this.player = null;
		this.parentEntity = null;
		this.parentEntityHasBeenLoaded = false;
		this.childEntities = [];
		this.needsToSave = false;
		this.canBeUnloadedByORM = false;
		this.isLoadingContext = false;
		this.isBeingAddedToGame = false;
		this.isAddedToGame = false;
		this.timeLastUsedOrRequested = Date.now();
	}
	Entity.prototype.performAction = function(text) {
		this.respondToEvent({ text: 'You said ' + text });
	};
	Entity.prototype.respondToEvent = function(evt) {
		if(this.player) {
			this.player.send(evt.text);
		}
		else {
			//TODO ai
		}
	};
	Entity.prototype.toString = function() {
		return '"' + this.moniker + '" <id=' + this.id + '>';
	};

	//add properties that just link to the model
	Object.defineProperties(Entity.prototype, {
		id: createGetter('id'),
		name: createGetterAndSetter('name'),
		title: createGetterAndSetter('title'),
		heldById: createGetter('heldById'),
		isDynamic: createGetterAndSetter('isDynamic'),
		isBlueprint: createGetterAndSetter('isBlueprint'),
		moniker: createGetter('moniker')
	});
	function createGetter(key) {
		return {
			get: function() {
				return this.model[key];
			},
			set: function(val) {
				throw new Error('Cannot set property \'' + key + '\' of entity');
			}
		};
	}
	function createGetterAndSetter(key) {
		return {
			get: function() {
				return this.model[key];
			},
			set: function(val) {
				if(this.model[key] !== val) {
					this.model[key] = val;
					this.model.needsToSave = true;
				}
			}
		};
	}
	return Entity;
});
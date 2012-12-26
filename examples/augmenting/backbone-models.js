
//
// This example shows how to augment the {app.Model} constructor
// to add more Backbone-esque attribute management.
//

Class.mixin('BackboneModel', {

	// 
	// Model attributes will be stored on an {attributes} object instead
	// of directly on the model, which is Cloak's default behavior.
	// 
	attributes: null,

	// 
	// The {construct} method is used as an internal (by Cloak's core)
	// constructor method for initializing the inner-working of models.
	// We added the {attributes} definition here to avoid getting in the
	// way of your own {initialize} methods.
	// 
	construct: function() {
		this.attributes = { };
		this._xhr = new app.XhrQueue();
		this.construct.parentApply(this, arguments);
	},
	
	// 
	// Override the default {fromXhr} storage method to store properties
	// in the {attributes} object instead of directly on the model.
	// 
	fromXhr: function(data) {
		_.extend(this.attributes, data);
	},

	// 
	// Override the default {toXhr} serializer to read properties from
	// the {attributes} object and not directly off of the model.
	// 
	toXhr: function() {
		return this.toObject.call(this.attributes, { });
	},

	// 
	// Add a {get} method for reading attributes from the {attributes}
	// object.
	// 
	get: function(attr) {
		return this.attributes[attr];
	},

	// 
	// Add a {set} method for reading attributes from the {attributes}
	// object that also emits change events, eg.
	// 
	//   model.on('change.foo', function(oldFoo, newFoo) {
	//       console.log('foo changed from ' + oldFoo + ' => ' + newFoo);
	//   });
	//   
	//   model.set('foo', 'bar');
	// 
	set: function(attr, value) {
		var oldValue = this.attributes[attr];

		this.attributes[attr] = value;
		
		this.emit('change.' + attr, old, value);
	}

});

// 
// Mixins support late-application using the {Mixin::mixinTo} method.
// 
// Merge our augmentation mixin into the {Model} class.
// 
app.BackboneModel.mixinTo(app.Model);

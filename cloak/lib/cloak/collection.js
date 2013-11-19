
var cloak      = require('cloak');
var Model      = require('cloak/model');
var AppObject  = require('cloak/app-object');
var _          = require(cloak.config.underscoreLib);

// 
// Collection class
// 
var Collection = module.exports = AppObject.extend({

	init: function() {
		this._super();

		// We store the collection's contents here
		this.models = [ ];
	},

	// 
	// The default initialize method, just adds all given arguments to the collection
	// 
	initialize: function(arr) {
		if (_(arr).isArray()) {
			this.add.apply(this, arr);
		} else {
			this.add.apply(this, arguments);
		}
	},

	// 
	// Filters incoming data to check if what we're given is valid as a model. Returns
	// a valid model or false.
	// 
	toModel: function(model) {
		// If the given arg is already a model instance, just make sure it is of the right type
		if (model instanceof Model) {
			return (model instanceof this.model);
		}

		// If we are given just an ID, create a new model
		if (typeof model === 'string') {
			return this.model.create(cloak.idObj(model));
		}

		// If we are given a data object, just pass it to create
		if (typeof model === 'object' && model) {
			return this.model.create(model);
		}

		return false;
	},

// --------------------------------------------------------
	
	// 
	// Returns the length of the collection
	// 
	len: function() {
		return this.models.length;
	},

	// 
	// Checks if a model exists already in the collection
	// 
	contains: function(what) {
		return !! _(this.models).find(function(model) {
			return model.is(what);
		});
	},
	
	// 
	// Add models to the collection at the given index (or at the end, if no
	// index is given)
	// 
	add: function(index) {
		var models = 1;
		
		// If no index was given, default to the end of the collection
		if (typeof index !== 'number') {
			index = -1;
			models = 0;
		}

		// Get a list of viable models to add
		models = Array.prototype.slice.call(arguments, models);
		models = _.map(models, this.toModel.bind(this));

		// Anything we were given that is invalid will be false after running toModel
		// above, so {_.identity} is enough to filter them out
		models = _.filter(models, _.identity);

		// Check for duplicates if this collection must be unique
		if (this.unique) {
			models = _.unique(models, function(model) {
				return model.id();
			});
			models = _.reject(models, this.contains.bind(this));
		}

		// This the end of the filters, so at this point, make sure we actually
		// still have models to add
		if (models.length) {
			// Add the models to the collection at the correct index
			if (index < 0) {
				this.models.push.apply(this.models, models);
			} else {
				this.models.splice(index, 0, models);
			}

			this.emit('add', models);
		}

		return this;
	}

});

// --------------------------------------------------------

// 
// Deal with definition rules. This allows defining rules for collections
// (such as "unique") in the attribute listings where they show up.
// 
Collection.$ = function(rules) {
	return new Definition(this, rules);
};

// 
// Create a shortcut for unique definitions
// 
Collection.$unique = Collection.$({ unique: true });

// 
// Make sure all collection definitions get the $ method
// 
Collection.onExtend(function() {
	this.$ = Collection.$;
	this.$unique = this.$({ unique: true });
});

// 
// The actual definition class
// 
var Definition = exports.Definition = Class.extend({

	init: function(collection, rules) {
		this.rules = rules;
		this.collection = collection;
	},

	// 
	// This allows calling Definition::create as if it were just a collection class
	// and getting the expected result
	// 
	create: function() {
		var collection = this.collection.create.apply(this.collection, arguments);
		_.each(_.keys(this.rules), function(rule) {
			collection[rule] = true;
		});
		return collection;
	}

});

// --------------------------------------------------------

// 
// Check if a variable is a Collection (not a collection instance)
// 
Collection.isCollection = function(value) {
	return (typeof value === 'function' && value.inherits && value.inherits(Collection));
};

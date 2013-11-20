
var cloak      = require('cloak');
var Model      = require('cloak/model');
var AppObject  = require('cloak/app-object');
var _          = require('cloak/underscore');

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
	// Find the model represented by the given arg in the collection
	// 
	find: function(what) {
		return _.find(this.models, function(model) {
			return model.is(what);
		});
	},

	// 
	// Checks if a model exists already in the collection
	// 
	contains: function(what) {
		return !! this.find(what);
	},

	// 
	// Get the location of a given model in the collection
	// 
	indexOf: function(what) {
		return _.indexOf(this.models, this.find(what));
	},

// --------------------------------------------------------
	
	// 
	// Add models to the collection at the given index (or at the end, if no
	// index is given)
	// 
	add: function(index, models) {
		// If no index was given, default to the end of the collection
		if (typeof index !== 'number') {
			models = index, index = -1;
		}

		// If given a single item, wrap it in an array
		if (! _.isArray(models)) {
			models = [ models ];
		}

		// Get a list of viable models to add
		models = _.map(models, this.toModel.bind(this));

		// Anything we were given that is invalid will be false after running toModel
		// above, so {_.identity} is enough to filter them out
		models = _.compact(models);

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
	},

	// 
	// Remove the given models from the collection
	// 
	remove: function(models) {
		// If given a single item, wrap it in an array
		if (! _.isArray(models)) {
			models = [ models ];
		}

		// Store the removed models here so we can give them to the remove event
		var removed = [ ];

		// Filter out the models in the collection that match those given
		this.models = _.rejectInPlace(this.models, function(model) {
			return !! _.find(models, function(matchAgainst) {
				return model.is(matchAgainst) && removed.push(model);
			});
		});

		// Was anything actually removed?
		if (removed.length) {
			this.emit('remove', removed);
		}

		return this;
	},

// --------------------------------------------------------

	// 
	// Serialize the collection into a data object
	// 
	serialize: function(deep) {
		return this.map(deep
			? function(model) {
				return model.serialize();
			}
			: function(model) {
				return model.id();
			});
	},
	
	// 
	// Take a data object and import the contained models into the collection
	// 
	unserialize: function(data) {
		// Make sure we have an array
		if (! _.isArray(data)) {
			return this.emit('error', 'Collection::unserialize expects an array');
		}

		// Get a copy of the old model array so we can keep repeats
		var old = this.models.slice();

		// Empty out the models array (while keeping the same array object)
		this.models.length = 0;

		// Iterate through the contained data
		for (var i = 0, c = data.length; i < c; i++) {
			// Make sure we have a standardized object and then fetch the ID from it
			var value = cloak.idObj(data[i]);
			var id = value[cloak.config.idKey];

			// Check if we already have a model matching these results
			var model = _.find(old, function(model) {
				return (model.id() === id);
			});

			// Put the model we found (or the new model) into the model array
			this.models.push(model || this.model.create(value));
		}
	}

});

// --------------------------------------------------------

// 
// Underscore function mappings
// 

var underscoreMethods = [
	'forEach', 'each', 'map', 'collect', 'reduce', 'foldl', 'inject',
	'reduceRight', 'foldr', 'detect', 'filter', 'select', 'reject',
	'every', 'all', 'some', 'any', 'invoke', 'max', 'min',
	'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
	'tail', 'drop', 'last', 'without', 'difference', 'shuffle',
	'isEmpty', 'chain'
];

_.each(underscoreMethods, function(method) {
	Collection.prototype[method] = function() {
		var args = _.toArray(arguments);
		args.unshift(this.models);
		return _[method].apply(_, args);
	};
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
	if (value instanceof Definition) {
		return true;
	}
	return (typeof value === 'function' && value.inherits && value.inherits(Collection));
};

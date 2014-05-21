
var cloak            = require('cloak');
var xhr              = require('cloak/xhr');
var Model            = require('cloak/model');
var AppObject        = require('cloak/app-object');
var _                = require('cloak/underscore');
var CollectionAsync  = require('cloak/collection-async');
var async            = require('async');
var $                = require('jquery');
var EventEmitter     = require('eventemitter2').EventEmitter2;

// 
// Collection class
// 
var Collection = module.exports = AppObject.extend({

	init: function() {
		this._super();

		// We store the collection's contents here
		this.models = [ ];

		// Create the async function object
		this.async = new CollectionAsync(this);

		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// The default initialize method, just adds all given arguments to the collection
	// 
	initialize: function(arr) {
		if (arr) {
			arr = _.isArray(arr) ? arr : arguments;
			this.add.apply(this, arr);
		}
	},

	// 
	// Returns the URL that should be used for bulk operations on the collection's models.
	// By default, this just returns the model's list endpoint URL, but it could be overriden,
	// for example, to use a subresource URL like /model/123/subresources
	// 
	// @return string
	// 
	url: function() {
		return this.model.url();
	},

	// 
	// Filters incoming data to check if what we're given is valid as a model. Returns
	// a valid model or false.
	// 
	// @param {model} the data/id/model to convert
	// @return Model
	// 
	toModel: function(model) {
		// If the given arg is already a model instance, just make sure it is of the right type
		if (model instanceof Model) {
			return (model instanceof this.model) ? model : null;
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
	// Clones the collection into a new one
	// 
	// @return Collection
	// 
	clone: function() {
		var result = new this.constructor();
		result.unserialize(this.serialize());
		return result;
	},

	// 
	// Empties out the collection (this in no way destroys the models manually)
	// 
	// @return this
	// 
	empty: function() {
		this.models.length = 0;
		return this;
	},

// --------------------------------------------------------
	
	// 
	// Returns the length of the collection
	// 
	// @return number
	// 
	len: function() {
		return this.models.length;
	},

	// 
	// Filters the models down to those which match the given attributes
	// 
	// @param {attrs} the attributes to match
	// @return array
	// 
	where: function(attrs) {
		return this.filter(function(model) {
			for (var i in attrs) {
				if (attrs.hasOwnProperty(i)) {
					if (model.get(i) !== attrs[i]) {
						return false;
					}
				}
			}

			return true;
		});
	},

	// 
	// Finds the first model which matches the given attributes
	// 
	// @param {attrs} the attributes to match
	// @return Model
	// 
	findWhere: function(attrs) {
		return this.detect(function(model) {
			for (var i in attrs) {
				if (attrs.hasOwnProperty(i)) {
					if (model.get(i) !== attrs[i]) {
						return false;
					}
				}
			}
			
			return true;
		});
	},

	// 
	// Find the model represented by the given arg in the collection
	// 
	// @param {what} what to look for
	// @return Model
	// 
	find: function(what) {
		return _.find(this.models, function(model) {
			return model.is(what);
		});
	},

	// 
	// Checks if a model exists already in the collection
	// 
	// @param {what} what to look for
	// @return boolean
	// 
	contains: function(what) {
		return !! this.find(what);
	},

	// 
	// Get the location of a given model in the collection
	// 
	// @param {what} what to look for
	// @return the index of the model found, or -1 if not found
	// 
	indexOf: function(what) {
		return _.indexOf(this.models, this.find(what));
	},

// --------------------------------------------------------
	
	// 
	// Add models to the collection at the given index (or at the end, if no
	// index is given)
	// 
	// @param {index} the index in the collection to insert the models at
	// @param {models} the model(s) to add to the collection
	// @return this
	// 
	add: function(index, models) {
		// If no index was given, default to the end of the collection
		if (typeof index !== 'number') {
			models = index;
			index = -1;
		}

		// If given a single item, wrap it in an array
		if (! _.isArray(models)) {
			models = [ models ];
		}

		// Get a list of viable models to add
		models = _.map(models, _.bind(this.toModel, this));

		// Anything we were given that is invalid will be false after running toModel
		// above, so {_.identity} is enough to filter them out
		models = _.compact(models);

		// Check for duplicates if this collection must be unique
		if (this.unique) {
			models = _.unique(models, function(model) {
				return model.id();
			});
			models = _.reject(models, _.bind(this.contains, this));
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
	// @param {models} the model(s) to remove
	// @return this
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

	// 
	// Filter the models contained in the collection, updating this collection
	// instance while running
	// 
	// @param {func} the iterator function
	// @return this
	// 
	filterInPlace: function(func) {
		_.filterInPlace(this.models, func);
		return this;
	},

	// 
	// Reject the models contained in the collection, updating this collection
	// instance while running
	// 
	// @param {func} the iterator function
	// @return this
	// 
	rejectInPlace: function(func) {
		_.rejectInPlace(this.models, func);
		return this;
	},

// --------------------------------------------------------

	// 
	// Serialize the collection into a data object
	// 
	// @param {opts} allows setting the {deep} option
	// @return array
	// 
	serialize: function(opts) {
		var serialize;
		if (opts && opts.deep) {
			serialize = function(model) {
				return model.serialize();
			};
		} else {
			serialize = function(model) {
				return model.id();
			};
		}

		return this.map(serialize);
	},
	
	// 
	// Take a data object and import the contained models into the collection
	// 
	// @param {data} the data to load into the collection
	// @return this
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

		return this;
	},

// --------------------------------------------------------
	
	// 
	// Loads the content of all of the models in the collection
	// 
	// @return promise
	// 
	load: function(query) {
		this.emit('load');

		var promises = this.map(function(model) {
			return model.load(query);
		});

		return $.when.apply($, promises).then(this.emits('loaded'));
	},

// --------------------------------------------------------
	
	// 
	// Saves all of the models in the collection
	// 
	// @return promise
	// 
	save: function() {
		this.emit('save');

		var promises = this.map(function(model) {
			return model.save();
		});

		return $.when.apply($, promises).then(this.emits('saved'));
	},

// --------------------------------------------------------
	
	// 
	// Saves a given set of attributes for all of the models in the
	// collection using a PATCH request. If the keys parameter is not
	// given, each model will be checked for locally changed attributes
	// 
	// @param {keys...} which keys should be sent to the server
	// @return promise
	// 
	patch: function() {
		this.emit('patch');

		var promises = this.map(function(model) {
			return model.patch.apply(model, arguments);
		});

		return $.when.apply($, promises).then(this.emits('patched'));
	},

// --------------------------------------------------------
	
	// 
	// Delete all of the models in the collection (this does NOT destroy the collection itself, but
	// it does remove the models from the collection's list)
	// 
	// @return promise
	// 
	del: function() {
		this.emit('delete');

		var promises = this.map(function(model) {
			return model.del();
		});

		return $.when.apply($, promises)
			.then(this.emits('deleted'))
			.then(_.bind(this.empty, this));
	},

// --------------------------------------------------------
	
	// 
	// Destroy the collection and all of the models contained in it
	// 
	// @return void
	// 
	destroy: function() {
		this.emit('destroy');

		// Call the teardown method if one is given
		if (this.teardown) {
			this.teardown();
		}

		// Destroy all of the models
		this.mapTo('destroy');

		// Null out all properties
		for (var i in this) {
			if (this.hasOwnProperty(i)) {
				this[i] = null;
			}
		}
	}

});

// --------------------------------------------------------

// 
// Underscore function mappings
// 

var underscoreMethods = [
	'forEach', 'each', 'map', 'mapTo', 'collect', 'reduce', 'foldl', 'inject',
	'reduceRight', 'foldr', 'detect', 'filter', 'select', 'reject',
	'every', 'all', 'some', 'any', 'invoke', 'max', 'min',
	'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
	'tail', 'drop', 'last', 'without', 'difference', 'shuffle',
	'isEmpty', 'chain', 'extract'
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
// @param {rules} a rules hash
// @return Collection.$
// 
Collection.$ = function(rules) {
	return createDefinition(this, rules);
};

// 
// This function creates collection definitions
// 
var createDefinition = exports.createDefinition = function(collection, rules) {
	rules = rules || { };

	var def = function() {
		return def.create.apply(def, arguments);
	};
	
	def.create = function() {
		var inst = collection.create.apply(collection, arguments);
		_.each(_.keys(rules), function(rule) {
			inst[rule] = true;
		});
		return inst;
	};

	def.inherits = function(value) {
		return (value === collection || collection.inherits(value));
	};

	return def;
};

// 
// Create a shortcut for unique definitions
// 
Collection.$unique = Collection.$({ unique: true });

// 
// Make sure all collection definitions get the $ method
// 
Collection.onExtend = function() {
	this.$ = Collection.$;
	this.$unique = this.$({ unique: true });
	this.onExtend = Collection.onExtend;
};

// --------------------------------------------------------

// 
// Check if a variable is a Collection (not a collection instance)
// 
// @param {value} the variable to test
// @return boolean
// 
Collection.isCollection = function(value) {
	return (typeof value === 'function' && value.inherits && value.inherits(Collection));
};

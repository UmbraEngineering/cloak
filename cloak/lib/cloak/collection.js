
var cloak         = require('cloak');
var xhr           = require('cloak/xhr');
var Model         = require('cloak/model');
var Async         = require('cloak/async');
var AppObject     = require('cloak/app-object');
var _             = require('cloak/underscore');
var async         = require('async');
var $             = require('jquery');
var EventEmitter  = require('eventemitter2').EventEmitter2;

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
	// @param {model} the data/id/model to convert
	// @return Model
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

	// 
	// Return an async collection handler (see ./async.js)
	// 
	// @return Async
	// 
	async: function() {
		if (! this._async) {
			this._async = new Async(this.models, this);
		}

		if (this._async.arr !== this.models) {
			this._async.arr = this.models;
		}

		return this._async;
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

// --------------------------------------------------------

	// 
	// Serialize the collection into a data object
	// 
	// @param {opts} allows setting the {deep} option
	// @return array
	// 
	serialize: function(opts) {
		return this.map((opts && opts.deep)
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
	// @return AppObject
	// 
	load: function() {
		var self = this;

		this.emit('load');

		switch (cloak.config.bulkOperations) {
			// Makes requests using dagger.js format list endpoints
			case 'dagger':
				return this.loadDagger();
			break;
			
			// Makes an individual request for each model
			case 'standard':
				return this.loadStandard();
			break;
			
			// Makes requests using the loadCustom method
			case 'custom':
				return this.loadCustom();
			break;
		}
	},

	// 
	// Dagger load implementation
	// 
	// @return AppObject
	// 
	loadDagger: function() {
		var self = this;
		var ids = this.mapTo('id');
		var filter = JSON.stringify({ _id: {$id: ids} });

		return xhr.get(this.model.url(), {filter: filter})
			.on('ready', this.emits('loaded'))
			.on('success', function(req) {
				_.each(req.json, function(data) {
					self.find(data._id).unserialize(data);
				});
				req.emit('ready');
			});
	},

	// 
	// Individual load implementation
	// 
	// @return AppObject
	// 
	loadStandard: function() {
		var ee = new AppObject();

		this.async()
			.map(function(model, next) {
				model.load()
					.on('error', next)
					.on('success', ee.reemit())
					.on('ready', function(req) {
						next(null, req);
					});
			})
			.then(
				function(reqs) {
					ee.emit('ready', reqs);
				},
				function(req) {
					ee.emit('error', req);
				}
			);

		return ee;
	},

	// 
	// This method can be overriden to add custom load functionality
	// 
	loadCustom: function() {
		throw new Error('Collection::loadCustom must be overriden to be used');
	},

// --------------------------------------------------------
	
	// 
	// Saves all of the models in the collection
	// 
	save: function() {
		var self = this;

		this.emit('save');

		switch (cloak.config.bulkOperations) {
			// Makes requests using dagger.js format list endpoints
			case 'dagger':
				
			break;
			
			// Makes an individual request for each model
			case 'standard':
				var ee = new AppObject();

				var reqs = [ ];
				var waitingFor = this.len();
				this.each(function(model) {
					model.load()
						.on('error', ee.reemit())
						.on('success', ee.reemit())
						.on('ready', function(req) {
							reqs.push(req);
							if (! --waitingFor) {
								ee.emit('ready', reqs);
							}
						});
				});

				return ee;
			break;
			
			// Makes requests using the loadCustom method
			case 'custom':
				return this.loadCustom.apply(this, arguments);
			break;
		}
	},

	saveDagger: function() {
		var models = this.serialize({ deep: true });

		// Find any models that don't yet exist on the server
		var newModels = _.extract(models, function(model) {
			return ! model[cloak.config.idKey];
		});

		async.series([
			// First, we create any new models with POST requests...
			function(next) {
				if (! newModels.length) {
					return next();
				}

				// Iterate through the new models, creating them as we go
				async.each(newModels,
					function(model, done) {
						model.save()
							.on('error', done)
							.on('ready', function() {
								done();
							});
					},
					function(errReq) {
						if (errReq) {
							return next(errReq);
						}

						next();
					});
			},

			// Next, we update any models that already exist
			function(next) {
				if (! models.length) {
					return next();
				}

				// Make a bulk update call
				xhr.put(this.model.url(), models)
					.on('ready', this.emits('loaded'))
					.on('success', function(req) {
						_.each(req.json, function(data) {
							self.find(data._id).unserialize(data);
						});
						req.emit('ready');
					});
			}
		],
		function() {
			// 
		});
	},

	saveStandard: function() {
		// 
	},

	// 
	// This method can be overriden to add custom save functionality
	// 
	saveCustom: function() {
		// 
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
// @param {rules} a rules hash
// @return Collection.$
// 
Collection.$ = function(rules) {
	return createDefinition(this, rules);
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


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
		if (_(arr).isArray()) {
			this.add.apply(this, arr);
		} else {
			this.add.apply(this, arguments);
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
	// @return promise
	// 
	load: function(query) {
		var self = this;

		this.emit('load');

		// Get the correct method to call (eg. "standard" -> "loadStandard")
		var method = cloak.config.bulkOperations;
		method = 'load' + method.charAt(0).toUpperCase() + method.slice(1);

		return this[method](query).then(this.emits('loaded'));
	},

	// 
	// Dagger load implementation
	// 
	// @param {query} an object containing querystring data (NOTE: be careful
	//                with defining custom filters here; you can change what
	//                models are in the collection without any other notice)
	// @return promise
	// 
	loadDagger: function(query) {
		var self = this;
		var ids = this.mapTo('id');

		query = query || { };
		if (! query.hasOwnProperty('filter')) {
			query.filter = JSON.stringify({
				_id: { $in: ids }
			});
		}

		return xhr.get(this.model.url(), {filter: filter})
			.then(function(req) {
				self.unserialize(req.json);
				self.each(function(model) {
					model.emit('loaded');
				});
				return $.Deferred.resolveWith(self, req).promise();
			});
	},

	// 
	// Individual load implementation
	// 
	// @return promise
	// 
	loadStandard: function(query) {
		return this.async.map(function(model, done) {
			model.load(query).then(_.bind(done, null, null), done);
		});
	},

	// 
	// This method can be overriden to add custom load functionality
	// 
	// @return promise
	// 
	loadCustom: function(query) {
		throw new Error('Collection::loadCustom must be overriden to be used');
	},

// --------------------------------------------------------
	
	// 
	// Saves all of the models in the collection
	// 
	// @return promise
	// 
	save: function() {
		var self = this;

		this.emit('save');

		// Get the correct method to call (eg. "standard" -> "saveStandard")
		var method = cloak.config.bulkOperations;
		method = 'save' + method.charAt(0).toUpperCase() + method.slice(1);

		return this[method]().then(this.emits('saved'));
	},

	// 
	// Save using the dagger implementation
	// 
	// @return promise
	// 
	saveDagger: function() {
		var self = this;
		var deferred = $.Deferred();
		var models = this.clone();
		var newModels = models.extract(function(model) {
			return ! model.id();
		});

		async.series([
			// First, we create any new models with POST requests...
			function(next) {
				if (! newModels.len()) {
					return next();
				}

				// Iterate through the new models, creating them as we go
				newModels.async
					.each(function(model, done) {
						model.save().then(_.bind(done, null, null), done);
					})
					.then(_.bind(next, null, null), next);
			},

			// Next, we update any models that already exist
			function(next) {
				if (! models.len()) {
					return next();
				}

				// Make a bulk update call
				xhr.put(this.model.url(), models.serialize())
					.then(
						function() {
							_.each(req.json, function(data) {
								var model = self.find(data._id);
								model.unserialize(data);
								model.emit('saved', 'put');
							});
							next();
						},
						next
					);
			}
		],
		function(err) {
			if (err) {
				deferred.rejectWith(self, err);
			}

			deferred.resolveWith(self);
		});

		return deferred.promise();
	},

	// 
	// Save using the standard method
	// 
	// @return promise
	// 
	saveStandard: function() {
		return this.async.map(function(model, done) {
			model.save().then(_.bind(done, null, null), done);
		});
	},

	// 
	// This method can be overriden to add custom save functionality
	// 
	// @return promise
	// 
	saveCustom: function() {
		throw new Error('Collection::saveCustom must be overriden to be used');
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
	patch: function(arg1) {
		var self = this;
		var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);

		// Get the attributes list for each model
		keys = keys.length
			? this.map(function() { return keys; })
			: this.mapTo('localChanges');

		this.emit('patch');

		// Get the correct method to call (eg. "standard" -> "patchStandard")
		var method = cloak.config.bulkOperations;
		method = 'patch' + method.charAt(0).toUpperCase() + method.slice(1);

		return this[method](keys).then(this.emits('patched'));
	},

	// 
	// Patch using the dagger.js implementation
	// 
	// @param {keys} the attributes to patch
	// @return promise
	// 
	patchDagger: function(keys) {
		// Iterate through the models and get the info we need
		var data = this.map(function(model, index) {
			return model.serialize({ attrs: keys[index] });
		});

		// Any object containing only an ID is useless..
		data = _.filter(data, function(model) {
			return (_.keys(model).length >= 2);
		});

		// Send the request
		return xhr.patch(this.model.url(), data)
			.then(function(req) {
				self.unserialize(req.json);
				_.each(data, function(obj) {
					self.find(obj).emit('loaded');
				});
				return $.Deferred().resolve(req).promise();
			});
	},

	// 
	// Patch using the standard implementation
	// 
	// @param {keys} the attributes to patch
	// @return promise
	// 
	patchStandard: function(keys) {
		return this.async.eachSeries(function(model, done) {
			var data = model.serialize({ attrs: keys.shift() });

			model.patch(keys).then(
				function(req) {
					model.unserialize(req.json);
					done();
				},
				done);
		});
	},

	// 
	// Patch using a custom implementation
	// 
	// @param {keys} the attributes to patch
	// @return promise
	// 
	patchCustom: function(keys) {
		throw new Error('Collection::patchCustom must be overriden to be used');
	},

// --------------------------------------------------------
	
	// 
	// Delete all of the models in the collection (this does NOT destroy the collection itself)
	// 
	// @return promise
	// 
	del: function() {
		this.emit('delete');

		// Get the correct method to call (eg. "standard" -> "delStandard")
		var method = cloak.config.bulkOperations;
		method = 'del' + method.charAt(0).toUpperCase() + method.slice(1);
		
		return this[method]().then(this.emits('deleted'));
	},

	// 
	// Delete using the dagger.js implementation
	// 
	// @return promise
	// 
	delDagger: function() {
		return xhr.del(this.model.url(), this.mapTo('id'))
			.then(_.bind(this.empty, this));
	},

	// 
	// Delete using the standard implementation
	// 
	// @return promise
	// 
	delStandard: function() {
		return this.async
			.each(function(model, done) {
				model.del().then(_.bind(done, null, null), done);
			})
			.then(_.bind(this.empty, this));
	},

	// 
	// Delete using a custom implementation
	// 
	// @return promise
	// 
	delCustom: function() {
		throw new Error('Collection::delCustom must be overriden to be used');
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

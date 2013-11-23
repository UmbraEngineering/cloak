
var cloak       = require('cloak');
var xhr         = require('cloak/xhr');
var AppObject   = require('cloak/app-object');
var Collection  = require('cloak/collection');
var _           = require('cloak/underscore');
var $           = require('jquery');

// 
// Model class
// 
var Model = module.exports = AppObject.extend({

	init: function() {
		this._super();

		// Build the new attributes object
		this.attributes = this._buildAttributes();

		// Initialize getters
		this._getters = _.extend({ }, this.getters || { });

		// Initialize setters
		this._setters = _.extend({ }, this.setters || { });

		// Keep track of local changes
		this._changedLocally = [ ];
		this.on(cloak.event('change.*'), function(value, old, attr) {
			if (! _.find(this._changedLocally, attr)) {
				this._changedLocally.push(attr);
			}
		});

		// Call any defined initialize method
		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// Default initialize method, just imports attributes into the model
	// 
	initialize: function(data) {
		if (typeof data === 'object' && data) {
			_.extend(this.attribute, data);
		}
	},

// --------------------------------------------------------

	// 
	// Takes the values from this.attributes and builds a new attributes object
	// for this instance.
	// 
	_buildAttributes: function() {
		var attrs = { };
		var scope = this.constructor;
		var scopeAttrs;

		do {
			scopeAttrs = scope.prototype.attributes;
			if (scopeAttrs) {
				// Allow for functions that return attributes objects
				if (typeof scopeAttrs === 'function') {
					scopeAttrs = scopeAttrs.call(this);
				}
				// Extend the building attributes object with the new attributes
				attrs = _.extend(scopeAttrs, attrs);
			}
		}
		// Work our way up the prototype chain..
		while (scope = scope.prototype.constructor && scope !== Model);

		// Process the constructed attributes object for Models and Collections
		_.each(_.keys(attrs), _.bind(this._initializeModelsAndCollections, this, attrs));

		return attrs;
	},

	// 
	// If the given {key} in the given {attrs} hash is a Model or Collection,
	// replace it with a new instance of itself
	// 
	_initializeModelsAndCollections: function(attrs, key) {
		var value = attrs[key];
		if (Model.isModel(value)) {
			attrs[key] = null;
		} else if (Collection.isCollection(value)) {
			attrs[key] = new value();
			attrs[key].parent = this;
			// Re-emit change events from the child model/collection
			attrs[key].on(cloak.event('change.*'),
				this.reemit(cloak.event('change.' + key))
			);
		}
	},

// --------------------------------------------------------
	
	// 
	// Does this model match the given ID/model
	// 
	is: function(id) {
		if (id instanceof Model) {
			return (id instanceof this.constructor && this.id() === id.id());
		}

		if (typeof id === 'object' && id) {
			id = id.id || id._id || id[cloak.config.idKey];
		}

		if (typeof id === 'string') {
			return (this.id() === id);
		}

		return false;
	},

	// 
	// Clones the model into a new one
	// 
	// @return Model
	// 
	clone: function() {
		var result = new this.constructor();
		result.unserialize(this.serialize());
		return result;
	},

	// 
	// Get a list of all attributes changed locally
	// 
	// @return array
	// 
	localChanges: function() {
		return this._changedLocally.slice();
	},

	// 
	// Does this model contain local changes?
	// 
	// @return boolean
	// 
	hasLocalChanges: function() {
		return !! this._changedLocally.length;
	},

// --------------------------------------------------------

	// 
	// Returns the ID of the model
	// 
	id: function() {
		return this.attributes[cloak.config.idKey];
	},
	
	// 
	// Gets an attribute from the {attributes} hash
	// 
	get: function(key) {
		var value = this.attributes[key];
		if (this._getters[key]) {
			value = this._getters[key].call(this, value, key);
		}
		return value;
	},

	// 
	// Sets an attribute to the {attributes} hash and emits a "change" event
	// 
	set: function(key, value) {
		var old = this.attributes[key];
		if (this._setters[key]) {
			value = this._setters[key].call(this, value, old, key);
		}
		this.attributes[key] = value;
		if (old !== value) {
			this.emit(cloak.event('change.' + key), value, old, key);
		}
		return this;
	},

	// 
	// Define a new getter for the attribute {key}
	// 
	defineGetter: function(key, func) {
		this._getters[key] = func;
	},

	// 
	// Define a new setter for the attribute {key}
	// 
	defineSetter: function(key, func) {
		this._setters[key] = func;
	},

	// 
	// Remove any defined getter for the attribute {key}
	// 
	removeGetter: function(key) {
		delete this._getters[key];
	},

	// 
	// Remove any defined setter for the attribute {key}
	// 
	removeSetter: function(key) {
		delete this._setters[key];
	},

// --------------------------------------------------------
	
	// 
	// Returns a simple Object structure representing the model and it's children
	// 
	serialize: function(opts) {
		var self = this;
		var result = { };

		opts = opts || { };

		_.each(_.keys(self.attributes), function(key) {
			if (! opts.attrs || key === cloak.config.idKey || _.indexOf(opts.attrs, key) >= 0) {
				var value = self.attributes[key];
				if (value instanceof Model || value instanceof Collection) {
					value = self.serializeChild(value, opts.deep);
				}
				result[key] = value;
			}
		});

		return result;
	},

	// 
	// Defines how children (Models and Collections) should be serialized when
	// Model::serialize comes across them. The default behavior is to return the
	// ID key, but this might be overridden to, for example, return a fully
	// serialized child object.
	// 
	serializeChild: function(child, deep) {
		if (value instanceof Collection) {
			return child.serialize(deep);
		}
		return deep ? child.serialize : child.id();
	},

	// 
	// Take a data object (most likely retrieved from the server) and incorporate
	// it into the model
	// 
	unserialize: function(data) {
		var attrs = this.attributes;
		var origAttrs = this.constructor.prototype.attributes;
		_.each(_.keys(data), function(key) {
			var value = data[key];

			// Is this field a model?
			if (Model.isModel(origAttrs[key])) {
				// These are the same model, just update the data
				if (attrs[key] instanceof Model && attrs[key].is(value)) {
					if (typeof value !== 'string') {
						return attrs[key].unserialize(value);
					}
				}
				// These are different, we need to replace the old one
				else {
					var Child = origAttrs[key];
					if (typeof value === 'string') {
						value = cloak.idObj(value);
					}
					value = Child.create(value);
				}
			}
			
			// Is this field a collection?
			else if (Collection.isCollection(origAttrs[key])) {
				return attrs[key].unserialize(data[key]);
			}

			attrs[key] = value;
		});

		// Empty out the changes list
		this._changedLocally.length = 0;
	},

// --------------------------------------------------------

	// 
	// Get the URL for this model instance
	// 
	urlAttr: /\{([^}]+)\}/,
	reqUrl: function() {
		var self = this;
		// Replace any attribute placeholders in the URL
		return this.url.replace(this.urlAttr, function(match, $1) {
			var value = '';
			// If the first character is a slash, this is an optional segment. That means that
			// if the value in the placeholder block is falsey, nothing will be put in its place,
			// but if not, then a slash will be prepended to the replacement
			if (slash = ($1.charAt(0) === '/')) {
				value = '/';
				$1 = $1.slice(1);
			}

			// If the @ notation is used, circumvent the accessors and read directly from attributes
			if ($1.charAt(0) === '@') {
				value += self.attributes[$1.slice(1)];
			}

			// If the # notation is used, load the model ID with the .id() method
			else if ($1 === '#') {
				value += self.id();
			}

			// Otherwise, replace it with the attribute from .get(attr)
			else {
				value += self.get($1);
			}

			// If this is optional and empty, clear it out
			if (slash && value === '/') {
				value = '';
			}

			return value;
		});
	},

// --------------------------------------------------------

	// 
	// Perform a GET request and update the loaded data
	// 
	load: function(query) {
		var self = this;
		var deferred = $.Deferred();

		this.emit('load');
		
		xhr.get(this.reqUrl(), query)
			.on('error', _.bind(deferred.rejectWith, deferred, this))
			.on('success', function(req) {
				self.importReqBody(req, deferred);
			});

		return deferred.promise();
	},

	// 
	// Import the response body from a load request
	// 
	// @param {req} the req object
	// @param {deferred} the $.Deferred object to respond to
	// @return void
	// 
	importReqBody: function(req, deferred) {
		try {
			this.unserialize(req.json);
		} catch (err) {
			return deferred.rejectWith(self, req);
		}

		this.emit('loaded');

		deferred.resolveWith(this, req);
	},

// --------------------------------------------------------
	
	// 
	// Saves the model to the server. Selects the request method based on whether
	// or not the ID property is defined
	// 
	save: function() {
		var self = this;
		var deferred = $.Deferred();
		var method = this.id() ? 'put' : 'post';

		this.emit('save', method);

		xhr[method](this.reqUrl(), this.serialize())
			.on('error', _.bind(deferred.rejectWith, deferred, this))
			.on('success', function(req) {
				self.emit('saved', method);

				if (cloak.config.loadSaveResponses) {
					return self.importReqBody(req, deferred);
				} else {
					// Empty out the changes list
					self._changedLocally.length = 0;
				}

				deferred.resolveWith(self, req);
			});

		return deferred.promise();
	},

	//
	// Selectively saves specific properties back to the server using
	// a PATCH request
	//
	patch: function(arg1) {
		var self = this;
		var deferred = $.Deferred();
		var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);
		var data = _.pick.apply(_, [this.serialize()].concat(keys));

		this.emit('patch', keys);

		xhr.patch(this.reqUrl(), data)
			.on('error', _.bind(deferred.rejectWith, deferred, this))
			.on('success', function(req) {
				self.emit('patched', keys);

				if (cloak.config.loadPatchResponses) {
					return self.importReqBody(req, deferred);
				} else {
					// Remove patched items from the changes list
					_.each(keys, function(key) {
						var index = _.indexOf(self._changedLocally, key);
						if (index >= 0) {
							self._changedLocally.splice(index, 1);
						}
					})
				}

				deferred.resolveWith(self, req);
			});

		return deferred.promise();
	},

// --------------------------------------------------------
	
	// 
	// Delete the model from the server using a DELETE request
	// 
	del: function() {
		var deferred = $.Deferred();

		// Don't allow deleting without an ID to avoid accidental deletion
		// of entire list routes
		if (! this.id()) {
			deferred.rejectWith(this, new Error('Cannot make a DELETE request on a model with no ID'));
		}

		// Otherwise, go ahead with the delete, then teardown the model
		else {
			this.emit('delete');
			xhr.del(this.reqUrl())
				.on('error', _.bind(deferred.rejectWith, deferred, this))
				.on('success', this.emits('deleted'))
				.on('success', _.bind(this.destroy, this))
				.on('success', _.bind(deferred.resolveWith, deferred, this));
		}

		return deferred.promise();
	},

// --------------------------------------------------------
	
	// 
	// Prepare a no longer needed model instance for garbage collection
	// 
	destroy: function() {
		this.emit('destroy');

		// Call the teardown method if one is given
		if (this.teardown) {
			this.teardown();
		}

		// Null out all properties
		for (var i in this) {
			if (this.hasOwnProperty(this)) {
				this[i] = null;
			}
		}
	}

});

// --------------------------------------------------------

// 
// This function fetches the list endpoint URL for the model
// 
Model.url = function() {
	return this.prototype.reqUrl.call({
		attributes: { },
		url: this.prototype.url,
		id: function() { return null; },
		get: function() { return null; }
	});
};

// 
// Make sure that new Model classes have the default static methods/properties
// 
Model.onExtend = function() {
	this.url = Model.url;
	this.onExtend = Model.onExtend;
	this.Collection = Collection.extend({
		model: this
	});
};

// 
// Check if a variable is a Model (not a model instance)
// 
Model.isModel = function(value) {
	return (typeof value === 'function' && value.inherits && value.inherits(Model));
};

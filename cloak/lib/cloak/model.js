
var cloak       = require('cloak');
var AppObject   = require('cloak/app-object');
var Collection  = require('cloak/collection');
var _           = require(cloak.config.underscoreLib);

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
		if (Model.isModel(value) || Collection.isCollection(value)) {
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
			this.emit(cloak.event('change.' + key), value, old);
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
	serialize: function() {
		var self = this;
		var result = { };

		_.each(_.keys(self.attributes), function(key) {
			var value = self.attributes[key];
			if (value instanceof Model || value instanceof Collection) {
				value = self.serializeChild(value);
			}
			result[key] = value;
		});

		return result;
	},

	// 
	// Defines how children (Models and Collections) should be serialized when
	// Model::serialize comes across them. The default behavior is to return the
	// ID key, but this might be overridden to, for example, return a fully
	// serialized child object.
	// 
	serializeChild: function(child) {
		if (value instanceof Collection) {
			return Collection.map(this.serializeChild);
		}
		return child.get(cloak.config.idKey);
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
				if (attrs[key].is(value)) {
					if (typeof value !== 'string') {
						attrs[key].unserialize(value);
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
				// 
			}

			attrs[key] = value;
		});
	}

});

// --------------------------------------------------------

// 
// Make sure that new Model classes have a .Collection property
// 
Model.onExtend = function() {
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

// --------------------------------------------------------

// 
// Load the XHR queue class
// 
var RequestQueue = require('cloak/xhr').Queue;

// 
// The main request queue used for all internally controlled tasks
// 
Model.xhr = new RequestQueue();

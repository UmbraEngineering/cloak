;require._modules["/lib/cloak/legacy.js"] = (function() { var __filename = "/lib/cloak/legacy.js"; var __dirname = "/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/cloak/legacy.js  == */ var __module__ = function() { 
 /**
 * Cloak Framework Core - v0.2.6-dev
 *
 * Author: James Brumond
 * Copyright 2013 Umbra Engineering
 * Dual licensed under MIT and GPL
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true, boss: true,
  unused: false */

/*global Class: true, EventEmitter2: true, _: true, Handlebars: true, console: true */

(function() {

	//
	// This is the regex used for parsing placeholders in model URLs
	//
	var urlPlaceholderRegex = /\{([^}]+)\}/g;

	// 
	// Avoid errors in older browsers and IE
	// 
	if (! window.console) {window.console = { };}
	if (! window.console.log) {window.console.log = function () { };}

// -------------------------------------------------------------
//  Clean up inconsistencies between lodash and underscore
	
	var isLodash = (typeof _.forIn === 'function');
	var deepClone, forIn;

	// If we are using lodash..
	if (isLodash) {
		deepClone = function(obj) {
			return _.clone(obj, true);
		};

		forIn = function(obj, func) {
			return _.forIn(obj, func);
		};
	}

	// If we are using underscore..
	else {
		deepClone = function(obj) {
			if (obj === null) {return obj;}

			var type = typeof obj;
			if (type === 'object') {
				type = varType(obj).toLowerCase();
			}

			var result;

			switch (type) {
				case 'string':
				case 'number':
				case 'boolean':
				case 'undefined':
				case 'function':
					return obj;

				case 'array':
					return obj.slice();

				case 'date':
					result = new Date(obj.getTime());
				break;

				// If I end up needing more specificity, I can write it in later
				default:
					result = { };
				break;
			}

			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					result[i] = deepClone(obj[i]);
				}
			}

			return result;
		};

		forIn = function(obj, func) {
			return _.forEach(obj, func);
		};
	}

// -------------------------------------------------------------
//  AppObject Class
	
	var nextId = 1;

	Class('AppObject').Extends(EventEmitter2, {

		//
		// Base constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			this._uuid = nextId++;
			log('Initializing <' + this.__class__ + '#' + this._uuid + '> instance');

			EventEmitter2.call(this, {
				wildcard: true,
				delimiter: '.'
			});

			// DEBUG This is here so that build errors actually log something useful
			this.on('error.build', function(err) { throw err; });
		},

		//
		// Override EventEmitter2::emit so that it logs all emitted events. This could
		// (and probably should) be removed from production builds, but I don't really
		// care that much..
		//
		emit: function(event) {
			var ctorName = (this === app) ? 'app' : this.__class__;
			log(ctorName + ':' + event);
			EventEmitter2.prototype.emit.apply(this, arguments);
		},

		//
		// Adds an extra method to all eventemitter2 objects called emits() that
		// returns an emitter function
		//
		// eg.
		//   var foo = new EventEmitter2({ ... });
		//   var emit = foo.emits('event', 'arg1');
		//   emit('arg2', 'arg3');
		//
		emits: function() {
			var args = _.toArray(arguments);
			args.unshift(this);
			args.unshift(this.emit);
			return _.bind.apply(_, args);
		},

		//
		// Adds an extra method to all eventemitter2 objects called reemit()
		// that causes all emitted events by one ee2 to be re-emitted by another.
		//
		// eg.
		//   var eeA = new EventEmitter2({ ... });
		//   var eeB = new EventEmitter2({ ... });
		//   
		//   eeA.on('foo', eeB.reemit());
		//   eeA.onAny(eeB.reemit());
		//   eeA.onAny(eeB.reemit('.fromA'));
		//   eeA.onAny(eeB.reemit(null, 'arg1', 'arg2'));
		//
		reemit: function(eventModifier) {
			var self = this;
			var boundArgs = _.toArray(arguments).slice(1);

			return function() {
				var event = this.event;
				var args = boundArgs.concat(_.toArray(arguments));

				// Allow events to be remapped to other event names
				//
				// eg.
				//   a.on('foo', b.reemit('.bar')) => 'foo.bar'
				//   a.on('foo', b.reemit('bar.')) => 'bar.foo'
				//   a.on('foo', b.reemit('bar')) => 'bar'
				//
				if (eventModifier) {
					if (eventModifier[0] === '.') {
						event += eventModifier;
					} else if (eventModifier[eventModifier.length - 1] === '.') {
						event = eventModifier + event;
					} else {
						event = eventModifier;
					}
				}

				args.unshift(event);
				self.emit.apply(self, args);
			};
		},

		// 
		// Emits multiple events at the same time, optionally with a set prefix
		// 
		// eg.
		//   foo.emitMany('bar.', ['a', 'b', 'c']);
		// 
		// is the same as
		//   foo.emit('bar.a');
		//   foo.emit('bar.b');
		//   foo.emit('bar.c');
		// 
		emitMany: function(prefix, events) {
			if (arguments.length === 1) {
				events = prefix; prefix = '';
			}

			for (var i = 0, c = events.length; i < c; i++) {
				this.emit(prefix + events[i]);
			}
		},

		// 
		// {emitsMany} is to {emitMany} as {emits} is to {emit}
		// 
		emitsMany: function() {
			var args = _.toArray(arguments);
			args.unshift(this);
			args.unshift(this.emitMany);
			return _.bind.apply(_, args);
		}

	});

// -------------------------------------------------------------
//  Create the core namespace

	// Create the core application object
	var app = new window.AppObject();

	// Export the app object how ever it needs to be done
	if (typeof module === 'object' && module.exports) {
		module.exports = app;
	} else {
		window.app = app;
	}

	// Set the app object as the default class namespace
	Class.namespace(app);

	// Bind AppObject onto app
	app.AppObject = window.AppObject; window.AppObject = void(0);

	// This is where application config will be defined. These settings
	// should not be changed in place. To configure your app, create a
	// separate config file and include it after the app core.
	app.config = {

		// Should HTTP Basic auth be used, and if so, with what
		// credentials {user: String, pass: String}
		httpAuth: false,

		// What HTTP methods, if any, should be faked using the
		// x-http-method-override header
		httpMethodOverride: [ 'PUT', 'DELETE', 'PATCH' ],

		// URL to your API server
		apiUrl: location.protocol + '//' + location.host,

		// The property name used for passing model ids to and from
		// the server
		idKey: 'id',

		// Should id values be automatically copied over to models after
		// a GET request?
		autoAssignId: true,

		// Should the traditional config value be set on $.ajax calls?
		ajaxQueryParamsTraditional: true,

		// Should the ID of a newly created object be found from the Location header?
		getIdFromCreate: false,

		// Should repsonse data be loaded into the model after a save call?
		loadSaveResponses: true,

		// Should delegate events be used by default?
		delegateEvents: true,

		// Should absolute URLs (not relative to apiUrl) be allowed?
		allowAbsoluteUrls: false
	};

	// Expose a logging utility
	app.log = log;

	// Expose easy access to window/document jQuery objects
	app.$win = $(window);
	app.$doc = $(document);

	// Runs when the DOM is ready
	app.$doc.ready(app.emits('ready'));

// -------------------------------------------------------------
//  Model Class

	Class('Model').Extends('AppObject', {

		//
		// Base model constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			var self = this;

			self.construct.parentApply(self, arguments);

			// All model instances have their own XHR queue. self may not seem
			// very efficient in some ways, but there is actually very little
			// memory waste and it makes sure that everything is quick and
			// correct.
			self._xhr = new app.XhrQueue();

			// We use _parseUrlPlaceholders for every xhr, so bind it now to save processing
			_.bindAll(self, '_parseUrlPlaceholders');
			
			// Store the new attributes object
			self.attributes = self._buildDefaultAttributes({ buildCollections: true });

			// Build the URL parsing regex
			var url = self.url.replace('{@.id}', '([a-zA-Z0-9]+)');
			url = url.replace(urlPlaceholderRegex, '[a-zA-Z0-9]+');
			self._urlRegex = new RegExp('^' + app.config.apiUrl + url, 'i');

			// Initialize accessor stores
			var getters = self._getters = _.extend({ }, self.getters || { });
			var setters = self._setters = _.extend({ }, self.setters || { });

			// Partially apply the accessors so that they are bound to the correct
			// scope and attribute name
			forIn(getters, function(value, index) {
				getters[index] = _.bind(value, self, index);
			});
			forIn(setters, function(value, index) {
				setters[index] = _.bind(value, self, index);
			});

			// Call the initializer if one exists
			if (typeof self.initialize === 'function') {
				self.initialize.apply(self, arguments);
			}
		},

		_buildDefaultAttributes: function(opts) {
			var self = this;
			var attributes = { };
			var scope = self.constructor;
			var scopeAttributes;

			// Work our way up the inheritence chain, building an initial attributes
			// object. Each level can be either an object, a function which returns
			// an object, or undefined/null.
			do {
				scopeAttributes = scope.prototype.attributes;
				if (scopeAttributes) {
					if (typeof scopeAttributes === 'function') {
						scopeAttributes = scopeAttributes.call(self);
					} else {
						scopeAttributes = deepClone(scopeAttributes);
					}
					attributes = _.extend(scopeAttributes, attributes);
				}
			} while (scope = scope.parent);

			// Look for Collections and create instances
			if (opts && opts.buildCollections) {
				forIn(attributes, function(value, key) {
					if (typeof value === 'function' && value.toString() === '[object Class]') {
						attributes[key] = new value({ parent: self });
						attributes[key].on('change', self.reemit('.' + key));
					}
				});
			}

			return attributes;
		},

	// -------------------------------------------------------------

		_getters: null,
		_setters: null,

		// 
		// Allows getting/setting/modifying attributes with depth, eg.
		// 
		//    this.set('foo.bar', 1);
		//    this.mod('foo.bar', function(fooBar) {
		//      return ++fooBar;
		//    });
		// 
		_findAttribute: function(attr) {
			var self = this;
			var current = self.attributes;
			var levels = attr.split('.');
			var last = levels.length - 1;
			
			for (var next, i = 0; i < last; i++) {
				if (! isMutable(current)) {break;}

				next = levels[i];
				current = current[next];
			}

			current = current || { };

			var lastLevel = levels[last];

			var setter = self._setters[attr] || null;
			var getter = self._getters[attr] || null;

			return {
				obj: current,
				attr: lastLevel,
				attrLevels: levels,
				get: function() {
					var value = current[lastLevel];
					return getter ? getter(value) : value;
				},
				set: function(value) {
					if (setter) {
						setter.call(self, value, set, current, self);
					} else {
						set(value);
					}
				}
			};

			function set(value) {
				current[lastLevel] = value;
			}
		},

		// 
		// Get the value of an attribute
		// 
		get: function(attr) {
			return this._findAttribute(attr).get();
		},

		// 
		// Set the value of an attribute and emit change event if the value
		// actually changed.
		// 
		set: function(attr, value) {
			attr = this._findAttribute(attr);

			var current = attr.get();
			var isObject =!! (current && typeof current === 'object');
			var oldValue = isObject ? JSON.stringify(current) : current;

			attr.set(value);

			var newValue = isObject ? JSON.stringify(attr.get()) : attr.get();

			if (oldValue !== newValue) {
				var topLevel = attr.attrLevels[0];
				this.emit('change.' + topLevel, this.attributes[topLevel]);

				return true;
			}

			return false;
		},

		// 
		// Modify an attribute with a given function. Basically the same thing
		// as {set} above, except instead of taking a new value, it takes a callback
		// that builds the new value.
		// 
		mod: function(attr, func) {
			attr = this._findAttribute(attr);

			var current = attr.get();
			var isObject =!! (current && typeof current === 'object');
			var oldValue = isObject ? JSON.stringify(current) : current;

			func(current);

			// NOTE: We don't really need to go through the setter because the
			// value has already been changed in place, but there may be some
			// kind of other logic in the setter that is supposed to run, so
			// I don't really know how to handle that...
			
			// attr.set(attr.value);

			var newValue = isObject ? JSON.stringify(attr.get()) : attr.get();

			if (oldValue !== newValue) {
				var topLevel = attr.attrLevels[0];
				this.emit('change.' + topLevel, this.attributes[topLevel]);

				return true;
			}

			return false;
		},

		// 
		// Allows the defining of attribute getters, eg.
		// 
		//   this.set("foo", "bar");
		// 
		//   this.defineGetter("foo", function(attr, value) {
		//     console.log(attr);  // "foo"
		//     console.log(value);  // "bar"
		//     return "baz";
		//   });
		// 
		//   this.get("foo");  // "baz"
		// 
		// There can only be one getter per attribute per instance. Attempting to define
		// more than one will override the original.
		// 
		defineGetter: function(attr, func) {
			this._getters[attr] = _.bind(func, this, attr);
		},
		
		// 
		// Allows the defining of attribute setters, eg.
		// 
		//   this.set("foo", "baz");
		// 
		//   this.defineSetter("foo", function(attr, value, oldValue) {
		//     console.log(attr);  // "foo"
		//     console.log(value);  // "bar"
		//     console.log(oldValue);  // "baz"
		//     return "foo";
		//   });
		// 
		//   this.set("foo", "bar");
		//   this.get("foo");  // "foo"
		// 
		// There can only be one setter per attribute per instance. Attempting to define
		// more than one will override the original.
		// 
		defineSetter: function(attr, func) {
			this._setters[attr] = _.bind(func, this, attr);
		},

	// -------------------------------------------------------------

		//
		// Used to convert the model to JSON for POST/PUT/PATCH XHR calls
		//
		toXhr: function() {
			var result = { };

			forIn(this.attributes, function(value, key) {
				if (value instanceof app.Collection || value instanceof app.Model) {
					value = value.toXhr();
				}

				result[key] = value;
			});

			return result;
		},

		//
		// Used to convert XHR GET JSON back into model format
		//
		fromXhr: function(data) {
			var attrs = this.attributes;

			forIn(data, function(value, attr) {
				if (attrs[attr] instanceof app.Collection) {
					attrs[attr].fromXhr(value);
					return;
				}

				attrs[attr] = value;
			});
		},

		//
		// Queue an XHR on the model's XhrQueue object
		//
		xhr: function(method, url, body, options) {
			url = url.replace(urlPlaceholderRegex, this._parseUrlPlaceholders);
			return this._xhr.request(method, url, body, options);
		},

		//
		// Parses {value} placeholders in URLs
		//
		_parseUrlPlaceholders: function(match, $1) {
			var levels = $1.split('.');
			var value;

			if (levels[0] === 'this') {
				levels.shift();
				value = this;
			} else if (levels[0] === '@') {
				levels.shift();
				value = this.attributes;
			} else {
				value = window;
			}
			
			for (var i = 0, c = levels.length; i < c; i++) {
				if (levels[i] === '@') {
					levels[i] = 'attributes';
				} else if (levels[i].charAt(0) === '@') {
					value = value.attributes;
					levels[i] = levels[i].slice(1);
				}
				value = value[levels[i]] || '';
			}
			
			// If the placeholder value was found and is a function,
			// call the function and return its result.
			if (typeof value === 'function') {
				value = value.call(this);
			}
			
			return value;
		},

	// -------------------------------------------------------------

		//
		// Perform a GET request and update the model instance with the
		// retrieved data
		//
		load: function(properties) {
			if (arguments.length && ! _.isArray(properties)) {
				properties = _.toArray(arguments);
			}

			this.emit('load', properties);

			return this.xhr('GET', this.url, null, {properties: properties})
				.on('error', _.bind(this.onLoadError, this))
				.on('success', _.bind(this.onLoadSuccess, this))
				.on('ready', this.emits('loaded', properties));
		},

		//
		// Exactly the same as {Model::load} above, except that multiple
		// of these can be called at a time and only the minimum needed
		// XHRs will actually be made. For example, if the following code
		// was run:
		//
		//   var foo = new FooModel();
		//
		//   foo.loadLazy().on('ready', callback1);
		//   foo.loadLazy().on('ready', callback2);
		//   foo.loadLazy().on('ready', callback3);
		//
		// Only the first call would fire an XHR. The others would recognize
		// that a GET is already running and just wait for that first one
		// to finish before firing their callback.
		//
		loadLazy: function() {
			if (this._loadLazyRequest) {
				return this._loadLazyRequest;
			}
			return this._loadLazyRequest = this.xhr('GET', this.url, null)
				.on('error', _.bind(this.onLoadError, this))
				.on('success', _.bind(this.onLoadSuccess, this))
				.on('done', _.bind(this.onLoadLazyDone, this));
		},

		//
		// Runs when an error occurs on a GET request
		//
		onLoadError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a GET request comes back successfully
		//
		onLoadSuccess: function(req) {
			// Automatically assign the correct ID to requested objects
			if (app.config.autoAssignId && req.json && req.json[app.config.idKey]) {
				this.attributes[app.config.idKey] = req.json[app.config.idKey];
			}
			// Call the model's xhr data loader
			try {
				this.fromXhr(req.json, callback);
			} catch (err) {
				return callback(err);
			}
			if (this.fromXhr.length < 2) {
				callback();	
			}
			function callback(err) {
				if (err) {
					return req.emit('error.build', err);
				}
				req.emit.apply(req, _.extend(_.toArray(arguments), ['ready']));
			}
		},

		//
		// Runs when a {Model::getLazy} request finishes in any way; Just
		// does clean up
		//
		onLoadLazyDone: function() {
			this._loadLazyRequest = null;
		},

	// -------------------------------------------------------------

		//
		// Saves the model to the server. Selects the request method automatically
		// based on whether or not an ID property already exists.
		//
		save: function() {
			var method = (this.attributes[app.config.idKey] ? 'PUT' : 'POST');

			this.emit('save', method);

			return this.xhr(method, this.url, this.toXhr())
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this))
				.on('ready', this.emits('saved', method));
		},

		//
		// Selectively saves specific properties back to the server using
		// a PATCH request.
		//
		// eg.
		//   foo.patch('propertyName');
		//   foo.patch('property1', 'property2');
		//   foo.patch([ 'property1', 'property2' ]);
		//
		patch: function(arg1) {
			var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);
			var data = _.pick.apply(_, [this.toXhr()].concat(keys));

			this.emitMany('patch.', keys);

			return this.xhr('PATCH', this.url, data)
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this))
				.on('ready', this.emitsMany('patched.', keys));
		},

		//
		// Runs when an error occurs on a POST/PUT/PATCH request
		//
		onSaveError: function(req) {
			throw new app.XhrError(req);
		},

		// 
		// Parse the ID from the response of a create request
		// 
		_getIdFromCreateResponse: function(req) {
			// Fetch the Location header for the new object
			var url = req.xhr.getResponseHeader('Location');

			// If there is no Location header, throw an error
			if (url === null) {
				throw new Error('No Location header sent from server; This is most likely ' +
					'a CORS error (http://bugs.jquery.com/ticket/11455#comment:1)');
			}

			// Parse the header to get the object ID
			var match = this._urlRegex.exec(url);

			// If there is no match, throw an error
			if (! match) {
				throw new Error('The server returned an invalid Location header');
			}

			return match[1];
		},

		//
		// Runs when a POST/PUT/PATCH request comes back successfully
		//
		onSaveSuccess: function(req) {
			// If we just did a POST and recieved a 201 CREATED response,
			// fetch the Location header and parse it for our new id and
			// resource URI. 
			if (req.xhr.status === 201 && app.config.getIdFromCreate) {
				this.attributes[app.config.idKey] = this._getIdFromCreateResponse(req);
			}

			// Check for a loadResponse meta flag
			if (app.config.loadSaveResponses || req._meta.loadResponse) {
				return this.onLoadSuccess(req);
			}

			req.emit('ready', req);
		},

	// -------------------------------------------------------------

		//
		// Remove the resource from the server with a DELETE request
		//
		del: function() {
			// Don't allow deleting without an ID to avoid accidental deletion
			// of entire list routes
			if (this.attributes[app.config.idKey]) {
				this.emit('delete');

				return this.xhr('DELETE', this.url)
					.on('error', _.bind(this.onDelError, this))
					.on('success', this.emits('deleted'))
					.on('success', _.bind(this.onDelSuccess, this));
			}
			throw new Error('Cannot make a DELETE request on a model with no ID');
		},

		//
		// Runs when an error occurs on a DELETE request
		//
		onDelError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a DELETE request comes back successfully
		//
		onDelSuccess: function(req) {
			if (this.destroy) {
				this.destroy();
			}
		},

	// -------------------------------------------------------------

		//
		// Prepare the object for garbage collection by nulling out
		// all property values
		//
		destroy: function() {
			if (typeof this.teardown === 'function') {
				this.teardown();
			}
			for (var i in this) {
				if (this.hasOwnProperty(this)) {
					this[i] = null;
				}
			}
		}

	});

// -------------------------------------------------------------
//  Collection Class
	
	Class('Collection').Extends('AppObject', {

		//
		// Base collection constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function(opts) {
			// Set the default model type to the base model class, allowing
			// any models as content
			this.Model = this.Model || app.Model;

			this.construct.parentApply(this, arguments);

			this._xhr = new app.XhrQueue();

			// We use this for every xhr, so bind it now to save processing
			_.bindAll(this, '_parseUrlPlaceholders');

			// We store objects in the collection in this array
			this.objects = [ ];

			// If a parent object is given, store it
			if (opts && opts.parent) {
				this.parent = opts.parent;
			}

			// Build a working copy of the model's default attribute structure.
			this.attributes = this.Model.prototype._buildDefaultAttributes();

			// Call the initializer if one exists
			if (typeof this.initialize === 'function') {
				this.initialize.apply(this, arguments);
			}
		},

	// -------------------------------------------------------------

		_create: function(object) {
			var obj = this.Model.create({ });
			obj.fromXhr(object);
			return obj;
		},

	// -------------------------------------------------------------

		// 
		// Adds an object to the collection
		// 
		add: function(object) {
			var isModel = (object instanceof this.Model);
			var id = isModel ? object.get(app.config.idKey) : object[app.config.idKey];
			if (id) {
				var existing = this.findById(id);
				if (existing) {
					return existing;
				}
			}
			if (! isModel) {
				object = this._create(object);
			}
			this.push(object);

			this.emit('change');
			this.emit('add');

			return object;
		},

		// 
		// Remove objects from the collection
		// 
		remove: function(objects) {
			if (! _.isArray(objects)) {
				objects = [objects];
			}

			objects = _.map(objects, function(obj) {
				if (typeof obj === 'object') {
					if (obj.attributes) {
						return obj.attributes[app.config.idKey];
					} else {
						return obj[app.config.idKey];
					}
				}
				return obj;
			});

			this.objects = this.filter(function(obj) {
				return _.indexOf(objects, obj.attributes[app.config.idKey]) < 0;
			});
		},

	// -------------------------------------------------------------

		// 
		// Builds an array of objects simplified with obj.toXhr
		// 
		toXhr: function(arg1) {
			var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);

			return this.map(function(obj) {
				obj = obj.toXhr();

				if (keys.length) {
					obj = _.pick.apply(_, [obj].concat(keys));
				}
				
				return obj;
			});
		},

		// 
		// Parse an array of objects into model instances
		// 
		fromXhr: function(objects) {
			var self = this;
			var idKey = app.config.idKey;
			var origs = this.objects.splice(0, this.objects.length);

			_.forEach(objects, function(obj) {
				var orig = _.find(origs, function(orig) {
					return orig.get(idKey) === obj[idKey];
				});

				if (orig) {
					orig.fromXhr(obj);
					obj = orig;
				}

				self.add(obj);
			});
		},

	// -------------------------------------------------------------

		// 
		// Get's the URL to use in XHRs
		// 
		url: function() {
			if (! this._url) {
				this._url = this.Model.prototype.url.replace(urlPlaceholderRegex, this._parseUrlPlaceholders);
			}

			return this._url;
		},

		//
		// Parses {value} placeholders in URLs
		//
		_parseUrlPlaceholders: function(match, $1) {
			var levels = $1.split('.');
			var value;

			if (levels[0] === 'this') {
				levels.shift();
				value = this;
			} else if (levels[0] === '@') {
				levels.shift();
				value = this.attributes;
			} else {
				value = window;
			}
			
			for (var i = 0, c = levels.length; i < c; i++) {
				if (levels[i] === '@') {
					levels[i] = 'attributes';
				} else if (levels[i].charAt(0) === '@') {
					value = value.attributes;
					levels[i] = levels[i].slice(1);
				}
				value = value[levels[i]] || '';
			}
			
			// If the placeholder value was found and is a function,
			// call the function and return its result.
			if (typeof value === 'function') {
				value = value.call(this);
			}
			
			return value;
		},

	// -------------------------------------------------------------

		// 
		// Makes an XHR
		// 
		xhr: function(method, body) {
			return this._xhr.request(method, this.url(), body);
		},

		// 
		// Save all objects in the collection completely
		// 
		save: function() {
			var body = {objects: [ ]};
			var idKey = app.config.idKey;

			this.forEach(function(object) {
				body.objects.push(object.toXhr());
			});

			return this.xhr('PATCH', body);
		},

		// 
		// Update a set of properties for each object in the collection
		// 
		patch: function(args) {
			args = _.isArray(args) ? args : _.toArray(arguments);

			var body = {objects: [ ]};
			var idKey = app.config.idKey;

			this.forEach(function(object) {
				var obj = { };

				object = object.toXhr();
				obj[idKey] = object[idKey];
				
				for (var i = 0, c = args.length; i < c; i++) {
					obj[args[i]] = object[args[i]];
				}

				body.objects.push(obj);
			});

			return this.xhr('PATCH', body);
		},

	// -------------------------------------------------------------
	//  Accessor methods

		at: function(index) {
			return this.objects[index];
		},

		len: function() {
			return this.objects.length;
		},

		find: function(callback) {
			return _.find(this.objects, callback);
		},

		findByAttr: function(attr, value) {
			return this.find(function(obj) {
				return obj.attributes[attr] === value;
			});
		},

		findById: function(id) {
			return this.findByAttr(app.config.idKey, id);
		},

		filter: function(callback) {
			return _.filter(this.objects, callback);
		},

		map: function(callback) {
			return _.map(this.objects, callback);
		},

		forEach: function(callback, scope) {
			var arr = this.objects;
			for (var i = 0, c = arr.length; i < c; i++) {
				callback.call(scope, arr[i], i, arr);
			}
		},

		slice: function() {
			return this.objects.slice.apply(this.objects, arguments);
		},

		indexOf: function() {
			return _.indexOf.apply(_, [this.objects].concat(_.toArray(arguments)));
		},

	// -------------------------------------------------------------
	//  Modifier methods

		push: function() {
			var result = this.objects.push.apply(this.objects, arguments);
			this.emit('change');
			return result;
		},

		pop: function() {
			var result = this.objects.pop();
			this.emit('change');
			return result;
		},

		unshift: function() {
			var result = this.objects.unshift.apply(this.objects, arguments);
			this.emit('change');
			return result;
		},

		shift: function() {
			var result = this.objects.shift();
			this.emit('change');
			return result;
		},

		sort: function(callback) {
			var result = this.objects.sort(callback);
			this.emit('change');
			return result;
		},

		splice: function() {
			var result = this.objects.splice.apply(this.objects, arguments);
			this.emit('change');
			return result;
		}

	});

// -------------------------------------------------------------
//  View Class

	Class('View').Extends('AppObject', {

		$elem: null,
		template: null,

		//
		// Base view constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			this.construct.parentApply(this, arguments);

			// Call the initializer if one exists
			if (typeof this.initialize === 'function') {
				this.initialize.apply(this, arguments);
			}
		},

		//
		// Query for elements under the view's main $elem node
		//
		$: function(query) {
			return this.$elem.find(query);
		},

		//
		// Render the view's associated template with the given data
		//
		render: function(data, templateProperty) {
			data = _.extend({ _uuid: this._uuid }, data || { });

			this.emit('render', data);

			templateProperty = templateProperty || 'template';

			// If the template has not been used yet, compile it
			if (typeof this[templateProperty] === 'string') {
				this[templateProperty] = Handlebars.compile(this[templateProperty]);
			}
			
			// Render the compiled template
			if (typeof this[templateProperty] === 'function') {
				// This is a precompiled template which must be run through the
				// method Handlebars.template() first
				if (this[templateProperty].length === 5) {
					this[templateProperty] = Handlebars.template(this[templateProperty]);
				}
				return this[templateProperty](data);
			}
			
			throw new TypeError('Cannot render view without a valid template');
		},

		//
		// Bind DOM events listed in the events object.
		//
		// If the events object has an `_extends: true` property, then the events
		// object will be merged with the inherited one.
		//
		// If the events object has a `_delegate: true` property, then the events
		// will be delegated so that new elements added to the DOM will automatically
		// be bound to the new events.
		//
		// The `events` argument is used internally and should not be used by
		// application developers.
		//
		bindEvents: function(events) {
			events = _.extend({ }, events || this.events);

			if (events) {
				if (events._extends) {
					this.bindEvents(this._super.events);
				}

				var delegate = events._delegate;
				if (typeof delegate !== 'boolean') {
					delegate = app.config.delegateEvents;
				}

				delete events._extends;
				delete events._delegate;

				_.forEach(events, _.bind(this._bindEvent, this, delegate));
			}
		},

		//
		// Used internally by View::_bindEvent below
		//
		// Parses an event string for event data, eg.
		//
		//   keystroke{combo:ctrl+s}
		//
		// Becomes:
		//
		//   .on("keystroke", {"combo":"ctrl+s"}, ...)
		//
		_eventDataRegex: /\{([^}]+)\}$/,

		//
		// Used internally by View::bindEvents above
		//
		// Binds a single event from the events object.
		//
		_bindEvent: function(delegate, func, query) {
			var event, args;

			query = query.split(' ');
			event = query.shift();
			query = query.join(' ');

			args = func.split(' ');
			args.splice(0, 1, this[args[0]], this);
			if (typeof args[0] !== 'function') {
				throw new Error('Cannot bind a undefined function to a DOM event.');
			}
			func = _.bind.apply(_, args);

			// Parse event data out of the event name
			var data = this._eventDataRegex.exec(event);
			if (data) {
				event = event.replace(data[0], '');
				data = data[1].split(',');
				
				var temp = { };
				_.forEach(data, function(item) {
					item = item.split(':');
					temp[item[0]] = item[1];
				});
				data = temp;
			}

			// Namespace the event so we can easily unbind later
			event += '._viewEvents.' + this._uuid;

			// Bind directly to this.$elem
			if (query === '@') {
				this.$elem.off(event);
				this.$elem.on(event, data, func);
			}

			// Bind to the document
			else if (query === '') {
				app.$doc.off(event);
				app.$doc.on(event, data, func);
			}

			// Bind using a delegate
			else if (delegate) {
				this.$elem.off(event, query);
				this.$elem.on(event, query, data, func);
			}

			// Bind directly with a query
			else {
				this.$(query).off(event);
				this.$(query).on(event, data, func);
			}
		},

		//
		// Removes event functions bound above
		//
		unbindEvents: function(events) {
			//
			// TODO doesn't handle the _extends case
			//
			_.forEach(events || _.keys(this.events),
				_.bind(this._unbindEvent, this, this.events._delegate));
		},

		//
		// Used internally by View::unbindEvents above
		//
		// Unbinds a single event from the events object
		//
		_unbindEvent: function(delegate, query) {
			var event;

			query = query.split(' ');
			event = query.shift();
			query = query.join(' ');

			// Parse event data out of the event name
			var data = this._eventDataRegex.exec(event);
			if (data) {
				event = event.replace(data[0], '');
			}

			// Namespace the event so we can easily unbind later
			event += '._viewEvents.' + this._uuid;

			// Bound directly to this.$elem
			if (query === '@') {
				this.$elem.off(event);
			}

			// Bound to the document
			else if (query === '') {
				app.$doc.off(event);
			}

			// Bound using a delegate
			else if (delegate) {
				this.$elem.off(event, query);
			}

			// Bound directly with a query
			else {
				this.$(query).off(event);
			}
		},

		//
		// Cleans up the view for garbage collection by pulling the base element
		// from the DOM, destroying all sub-elements, and nulling all properties
		// of the view instance
		//
		destroy: function() {
			if (typeof this.teardown === 'function') {
				this.teardown();
			}
			if (this.events) {
				this.unbindEvents();
			}
			if (this.$elem) {
				this.$elem.html('');
				this.$elem.remove();
			}
			for (var i in this) {
				if (this.hasOwnProperty(i)) {
					this[i] = null;
				}
			}
		}

	});

// -------------------------------------------------------------
//  XhrQueue Class
	
	Class('XhrQueue').Extends('AppObject', {

		queue: null,
		running: false,

		construct: function() {
			this.construct.parent(this);

			_.bindAll(this);

			this.queue = [ ];

			// This is a hack to avoid thrown duplicate errors because of
			// the below re-emitting of events
			this.on('error', $.noop);
		},

		//
		// Queues up a new XHR
		//
		request: function(method, url, body, options) {
			var req = new app.XhrRequest(method, url, body, options);

			// Also emit events at the XhrQueue level to allow more general listening
			var self = this;
			req.onAny(this.reemit());

			this.queue.push(req);
			this._run();
			return req;
		},

		//
		// Starts running the queue if it is not already running
		//
		_run: function() {
			if (! this.running) {
				this.running = true;

				var req = this.queue.shift();
				req.on('done', this._next);
				req.run();
			}
		},

		//
		// Runs the next request in the queue
		//
		_next: function() {
			this.running = false;
			if (this.queue.length) {
				this._run();
			}
		}

	});

// -------------------------------------------------------------
//  XhrRequest Class
	
	var doubleSlashStart = /^\/\//;
	var schemeStart = /^([a-zA-Z]+):\/\//;
	
	Class('XhrRequest').Extends('AppObject', {

		xhr: null,

		//
		// Prepares to make the request; Does every step except actually sending
		// the request to the server.
		//
		construct: function(method, url, body, options) {
			this.construct.parent(this);

			_.bindAll(this);

			this.method  = method;
			this.url     = url;
			this.body    = body;
			this._meta   = { };

			// Only prepend the apiUrl if needed
			if (! (app.config.allowAbsoluteUrls &&
				(schemeStart.test(url) || doubleSlashStart.test(url))
			)) {
				url = app.config.apiUrl + url;
			}

			// This is the object that we will pass to jQuery.ajax
			this.config = {
				url:          url,
				type:         method,
				async:        true,
				cache:        false,
				dataType:     'json',
				contentType:  'application/json',
				complete:     this.oncomplete,
				headers:      { },
				traditional:  !! app.config.ajaxQueryParamsTraditional
			};

			// If needed, use an x-http-method-override header to fake the method
			if (_.indexOf(app.config.httpMethodOverride, method) >= 0) {
				this.config.type = 'POST';
				this.config.headers['X-Http-Method-Override'] = method;
			}

			// If needed, add HTTP Basic auth header
			if (app.config.httpAuth) {
				var auth = app.config.httpAuth;
				if (! auth._compiled) {
					auth._compiled = btoa(auth.user + ':' + auth.pass);
				}
				this.config.headers.Authorization = 'Basic ' + auth._compiled;
			}

			// Add the request body
			if (method === 'GET') {
				this.config.data = body;
			} else {
				this.config.data = JSON.stringify(body);
				this.config.processData = false;
			}

			if (options) {
				if (options.properties) {
					this.properties = options.properties;
					delete options.properties;
				}
				_.extend(this.config, options);
			}
		},

		// 
		// Sets meta data on the this._meta store
		// 
		meta: function(data) {
			_.extend(this._meta, data);

			return this;
		},

		//
		// Runs the request.
		//
		run: function() {
			console.log('[' + time() + ']', 'XHR:', this.method, this.url, this.config.data);
			this.xhr = $.ajax(this.config);
		},

		//
		// Runs when the request finishes to parse the response and emit
		// events.
		//
		oncomplete: function(xhr, status) {
			try {
				this.json = JSON.parse(xhr.responseText);
			} catch (e) {
				this.json = { };
			}
			if (this.properties) {
				var pickArgs = this.properties.slice(0);
				pickArgs.unshift(this.json);
				_.pick.apply(_, pickArgs);
			}
			this.emit('done');
			this.emit(status, this);
			if (status === 'error' || status === 'success') {
				this.emit(status + '.' + xhr.status, this);
			}
		},

		//
		// Abort the request early
		//
		abort: function() {
			if (this.xhr.abort) {
				this.xhr.abort();
			}
		}

	});

// -------------------------------------------------------------
//  XhrError Class

	Class('XhrError').Extends(Error, {

		construct: function(req) {
			Error.call(this);

			this.req = req;
			this.message = 'XHR Error ' + req.xhr.status + ': ' + req.xhr.statusText +
				' - ' + req.xhr.responseText;
		}

	});

// -------------------------------------------------------------
//  Helpers
	
	//
	// Gets a formatted time string of HH:MM:SS.mmmm
	//
	function time() {
		var now = new Date();
		return (
			('00' + now.getHours()).slice(-2) + ':' +
			('00' + now.getMinutes()).slice(-2) + ':' +
			('00' + now.getSeconds()).slice(-2) + '.' +
			('000' + now.getMilliseconds()).slice(-4)
		);
	}

	// 
	// Log to the console
	// 
	function log(value) {
		if (console && console.log) {
			console.log('[' + time() + ']', value);
		}
	}

	// 
	// Get the [[class]] of a variable
	// 
	function varType(value) {
		return Object.prototype.toString.call(value).slice(8, -1);
	}

	// 
	// Tests if a variable is mutable (object/function)
	// 
	function isMutable(value) {
		return !! (value && (typeof value === 'object' || typeof value === 'function'));
	}

}()); 
 }; /* ==  End source for module /lib/cloak/legacy.js  == */ module.require = require._bind(module); return module; }());;
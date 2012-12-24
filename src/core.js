/**
 * REST Client Framework Core
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true */

/*global Class: true, EventEmitter2: true, _: true, Handlebars: true */

(function() {

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
			console.log('[' + time() + '] Intializing', this.__class__, 'instance');
			EventEmitter2.call(this, {
				wildcard: true,
				delimiter: '.'
			});
			this._uuid = nextId++;
			if (typeof this.initialize === 'function') {
				this.initialize.apply(this, arguments);
			}
		},

		//
		// Override EventEmitter2::emit so that it logs all emitted events. This could
		// (and probably should) be removed from production builds.
		//
		emit: function(event) {
			var ctorName = (this === app) ? 'app' : this.__class__;
			console.log('[' + time() + '] ' + ctorName + ':' + event);
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
				//   a.on('foo', b.reemit('bar')) => 'bar'
				//
				if (eventModifier) {
					if (eventModifier[0] === '.') {
						event += eventModifier;
					} else {
						event = eventModifier;
					}
				}

				args.unshift(event);
				self.emit.apply(self, args);
			};
		}

	});

// -------------------------------------------------------------
//  Create the core namespace

	// Create the core application object
	var app = window.app = new AppObject();

	// Set the app object as the default class namespace
	Class.namespace(app);

	// Bind AppObject onto app
	app.AppObject = AppObject; delete window.AppObject;

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

		// Should the URL placeholders feature be enabled, allowing
		// complex URLs
		urlPlaceholders: false,

		// Should the traditional config value be set on $.ajax calls?
		ajaxQueryParamsTraditional: true,
	};

	// Expose a logging utility
	app.log = function(value) {
		console.log('[' + time() + ']', value);
	};

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
			// All model instances have their own XHR queue. This may not seem
			// very efficient in some ways, but there is actually very little
			// memory waste and it makes sure that everything is quick and
			// correct.
			this._xhr = new app.XhrQueue();

			this.construct.parentApply(this, arguments);
		},

		//
		// Converts the model instance into a simple object, removing unwanted
		// properties and serializing sub-objects
		//
		toObject: function(opts) {
			opts = opts || { };

			// Create a simple recursive clone of the model and walk the structure
			var obj = _.merge({ }, this);
			app.Model._walk(obj, function(value, property, scope) {

				// If a whitelist is given, make sure the property is on the list
				if (opts.whitelist && ! _.indexOf(opts.whitelist, property)) {
					delete scope[property];
					return;
				}

				// Remove blacklisted properties
				if (_.indexOf(this._toObjectBlacklist, property) >= 0) {
					delete scope[property];
					return;
				}

				// Remove/serialize view objects
				if (value instanceof app.View) {
					if (opts.serializeViews) {
						scope[property] = opts.serializeViews(value);
					}
					return;
				}

				// Replace sub-models with ID numbers/serialized format
				if (value instanceof app.Model) {
					if (opts.serializeModels) {
						scope[property] = opts.serializeModels(value);
					} else {
						scope[property] = value[app.config.idKey];
					}
				}
			});

			// Add meta data about the instance if needed
			if (opts.meta) {
				obj.__class__ = this.__class__;
				obj.__parent__ = this.__parent__;
				obj.__mixins__ = this.__mixins__;
			}

			return obj;
		},

		//
		// Internal instance properties that should not be copied by toObject
		//
		_toObjectBlacklist: [ '_events', 'delimiter', '_xhr' ],

		//
		// Used to convert the model to JSON for POST/PUT/PATCH XHR calls
		//
		toXhr: function() {
			return this.toObject();
		},

		//
		// Used to convert XHR GET JSON back into model format
		//
		fromXhr: function(data) {
			_.extend(this, data);
		},

		//
		// Converts the object into a JSON string
		//
		toJson: function(opts) {
			return JSON.stringify(this.toObject(opts));
		},

		//
		// Serializes the model with app.Model.serialize (defined below)
		//
		serialize: function() {
			return app.Model.serialize(this);
		},

		//
		// Clone the model into another instance
		//
		clone: function() {
			var obj = new this.constructor();
			_.merge(obj, this.toObject());
		},

		//
		// Queue an XHR on the model's XhrQueue object
		//
		xhr: function(method, url, body, options) {
			if (app.config.urlPlaceholders) {
				url = url.replace(app.Model._placeholderRegex,
					_.bind(this._parseUrlPlaceholders, this)
				);
			}
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
			} else {
				value = window;
			}
			for (var i = 0, c = levels.length; i < c; i++) {
				value = value[levels[i]];
			}
			return value;
		},

		//
		// Perform a GET request and update the model instance with the
		// retrieved data
		//
		get: function(properties) {
			if (arguments.length && ! _.isArray(properties)) {
				properties = _.toArray(arguments);
			}
			return this.xhr('GET', this.url, null, {properties: properties})
				.on('error', _.bind(this.onGetError, this))
				.on('success', _.bind(this.onGetSuccess, this));
		},

		//
		// Exactly the same as {Model::get} above, except that multiple
		// of these can be called at a time and only the minimum needed
		// XHRs will actually be made. For example, if the following code
		// was run:
		//
		//   var foo = new FooModel();
		//
		//   foo.getLazy().on('ready', callback1);
		//   foo.getLazy().on('ready', callback2);
		//   foo.getLazy().on('ready', callback3);
		//
		// Only the first call would fire an XHR. The others would recognize
		// that a GET is already running and just wait for that first one
		// to finish before firing their callback.
		//
		getLazy: function() {
			if (this._getLazyRequest) {
				return this._getLazyRequest;
			}
			return this._getLazyRequest = this.xhr('GET', this.url, null)
				.on('error', _.bind(this.onGetError, this))
				.on('success', _.bind(this.onGetSuccess, this))
				.on('done', _.bind(this.onGetLazyDone, this));
		},

		//
		// Runs when an error occurs on a GET request
		//
		onGetError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a GET request comes back successfully
		//
		onGetSuccess: function(req) {
			// Automatically assign the correct ID to requested objects
			if (app.config.autoAssignId && req.json && req.json[app.config.idKey]) {
				this[app.config.idKey] = req.json[app.config.idKey];
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
		onGetLazyDone: function() {
			this._getLazyRequest = null;
		},

		//
		// Saves to the server using a POST/PUT request
		//
		save: function() {
			// If there is no id value, this is assumed to be a new object
			// and is saved with a POST. Otherwise, we assume this is already
			// on the server and save with a PUT
			var method = this[app.config.idKey] ? 'PUT' : 'POST';
			return this.xhr(method, this.url, this.toXhr())
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this));
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
			return this.xhr('PATCH', this.url, data)
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this));
		},

		//
		// Runs when an error occurs on a POST/PUT/PATCH request
		//
		onSaveError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a POST/PUT/PATCH request comes back successfully
		//
		onSaveSuccess: function(req) {
			// If we just did a POST and recieved a 201 CREATED response,
			// fetch the Location header and parse it for our new id and
			// resource URI. 
			if (req.xhr.status === 201) {
				// Fetch the Location header and strip off the parts that
				// we don't care about
				this.url = req.xhr.getResponseHeader('Location');
				// If there is no Location header, throw an error
				if (this.url === null) {
					throw new Error('No Location header sent from server; This is most likely ' +
						'a CORS error (http://bugs.jquery.com/ticket/11455#comment:1)');
				}
				this.url = this.url.replace(new RegExp('^' + app.config.apiUrl), '');

				// Take the last segment of the URI as the new id
				this[app.config.idKey] = this.url.split('/');
				if (! this[app.config.idKey][this[app.config.idKey].length - 1]) {
					this[app.config.idKey].pop();
				}
				this[app.config.idKey] = this[app.config.idKey].pop();
			}
			req.emit('ready', req);
		},

		//
		// Remove the resource from the server with a DELETE request
		//
		del: function() {
			// Don't allow deleting without an ID to avoid accidental deletion
			// of entire list routes
			if (this[app.config.idKey]) {
				return this.xhr('DELETE', this.url)
					.on('error', _.bind(this.onDelError, this))
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
	
	//
	// This is the regex used for parsing placeholders in model URLs
	//
	app.Model._placeholderRegex = /\{([^}]+)\}/;

// -------------------------------------------------------------
//  Model Serializing

	//
	// A recursive walker function used for serializing models
	//
	app.Model._walk = function(obj, callback) {
		// Figure out what object we are walking
		obj = obj || this;

		// Start iterating...
		var shouldRecurse;
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				shouldRecurse = (obj[i] && typeof obj[i] === 'object');
				if (callback.call(obj, obj[i], i, obj) === false) {
					shouldRecurse = false;
				}
				if (shouldRecurse) {
					this._walk(callback, obj[i]);
				}
			}
		}
	};
	
	//
	// This creates serialized string of the given model which can then
	// be unserialized back into a model object.
	//
	app.Model.serialize = function(model) {
		// If there is a pre-serialize method, clone the model to avoid
		// modifying the original and run the method.
		if (model.beforeSerialize) {
			model = model.clone();
			model.beforeSerialize();
		}
		// Convert the model to the correct json format
		return model.toJson({
			meta: true,
			serializeModels: function(model) {
				return {
					id: model[app.config.idKey],
					__class__: model.__class__,
					__parent__: model.__parent__,
					__mixins__: model.__mixins__
				};
			}
		});
	};

	//
	// This takes a string generated by serialize above and turns it back
	// into a model object. If the correct class structure has not been
	// created, unserialize will throw a type error.
	//
	app.Model.unserialize = function(json) {
		if (typeof json === 'string') {
			json = JSON.parse(json);
		}
		if (! json || typeof json !== 'object') {
			throw new TypeError('Invalid input value given; Must a JSON string or object');
		}
		
		// First, check the meta data/class structure
		var ctor = app[json.__class__];
		if (! ctor) {
			throw new TypeError('The class "' + json.__class__ + '" has not been defined.');
		}
		if (ctor.prototype.__parent__ !== json.__parent__) {
			throw new TypeError('The class defined as "' + json.__class__ + '" does not match the ' +
				'inheritence chain of the seriailized model.');
		}
		if (_.difference(json.__mixins__, ctor.prototype.__mixins__).length ||
			_.difference(ctor.prototype.__mixins__, json.__mixins__).length) {
			throw new TypeError('The mixins defined for "' + json.__class__ + '" do not match ' +
				'those defined for the serialized model');
		}

		// Create a new model object
		var model = new ctor();
		if (model.beforeUnserialize) {
			model.beforeUnserialize();
		}

		// Copy over properties
		_.merge(model, json);
		app.Model._walk(model, function(value, property, scope) {
			// Check for models and rebuild them
			if (typeof value === 'object' && value.__class__ && value.__parent__ && value.__mixins__) {
				scope[property] = new app[value.__class__]();
				return false;
			}
		});

		return model;
	};

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

				delete events._extends;
				delete events._delegate;

				_.forOwn(events, _.bind(this._bindEvent, this, delegate));
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
			var event;

			query = query.split(' ');
			event = query.shift();
			query = query.join(' ');
			func = _.bind(this[func], this);

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

			// This is the object that we will pass to jQuery.ajax
			this.config = {
				url:          app.config.apiUrl + url,
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
		return now.toLocaleTimeString() + '.' + ('000' + now.getMilliseconds()).slice(-4);
	}

}());
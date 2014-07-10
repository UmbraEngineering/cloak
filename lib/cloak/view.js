
var cloak       = require('cloak');
var AppObject   = require('cloak/app-object');
var $           = require('jquery');
var _           = require('cloak/underscore');
var handlebars  = require('handlebars');

// 
// View class
// 
var View = module.exports = AppObject.extend({

	init: function() {
		this._super();

		if (this.elem) {
			this.$elem = $(this.elem);
		} else if (this.tagName) {
			this.$elem = $('<' + this.tagName + '>');
		} else {
			this.$elem = $('<' + cloak.config.viewTag + '>');
		}

		if (this.className) {
			this.$elem.addClass(this.className);
		}

		if (this.id) {
			this.$elem.attr('id', this.id);
		}

		if (this.attributes) {
			this.$elem.attr(this.attributes);
		}

		// We store all currently bound events here so we can unbind them later
		this._boundEvents = [ ];

		// Call any defined initialize method
		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// A default initialize method that just extends the instance with a given object
	// 
	initialize: function(obj) {
		_.extend(this, obj);
	},

	// 
	// Run a query lookup inside the View's root element
	// 
	$: function(selector) {
		return this.$elem.find(selector);
	},

	//
	// Render the view's associated template with the given data
	//
	render: function(data, templateProperty) {
		data = _.extend({ _uuid: this._uuid }, data || { });
		templateProperty = templateProperty || 'template';

		this.emit('render', data, templateProperty);

		// If the template has not been used yet, compile it
		if (typeof this[templateProperty] === 'string') {
			this[templateProperty] = require('handlebars/compiler').compile(this[templateProperty]);
		}
		
		// Render the compiled template
		if (typeof this[templateProperty] === 'function') {
			// This is a precompiled template which must be run through the
			// method Handlebars.template() first
			if (this[templateProperty].length === 5) {
				this[templateProperty] = handlebars.template(this[templateProperty]);
			}
			return this[templateProperty](data);
		}
		
		throw new TypeError('Cannot render view without a valid template');
	},

	//
	// Bind DOM events listed in the events object.
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
			// Determine if we should bind by delegate
			var delegate = events._delegate;
			if (typeof delegate !== 'boolean') {
				delegate = cloak.config.delegateEvents;
			}

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
	//   keystroke{ctrl+s}
	//
	// Becomes:
	//
	//   .on("keystroke", {"combo":"ctrl+s"}, ...)
	//   .on("keystroke", "ctrl+s", ...)
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
		func = this[args[0]];
		args = args.slice(1);

		if (typeof func !== 'function') {
			throw new Error('Cannot bind a undefined function to a DOM event.');
		}

		var scope = this;
		var bound = function(evt) {
			return func.apply(scope, [evt].concat(args));
		};

		// Parse event data out of the event name
		var data = this._eventDataRegex.exec(event);
		if (data) {
			event = event.replace(data[0], '');
			data = data[1].split(',');

			if (! data[0] || data[0].indexOf(':') >= 0) {
				var temp = { };
				_.forEach(data, function(item) {
					item = item.split(':');
					temp[item[0]] = item[1];
				});
				data = temp;
			}
		}

		// Namespace the event so we can easily unbind later
		event += '._viewEvents.' + this._uuid;

		// Store a reference to this event for later unbinding
		this._boundEvents.push({
			query: query,
			event: event,
			delegate: delegate
		});

		// Bind directly to this.$elem
		if (query === '@') {
			this.$elem.off(event);
			this.$elem.on(event, data, bound);
		}

		// Bind to the document
		else if (query === '') {
			cloak.$doc.off(event);
			cloak.$doc.on(event, data, bound);
		}

		// Bind using a delegate
		else if (delegate) {
			this.$elem.off(event, query);
			this.$elem.on(event, query, data, bound);
		}

		// Bind directly with a query
		else {
			var $elem = this.$(query);
			$elem.off(event);
			$elem.on(event, data, bound);
		}
	},

	//
	// Removes event functions bound above
	//
	unbindEvents: function(events) {
		if (! events) {
			events = this._boundEvents;
			this._boundEvents = [ ];
		}

		_.forEach(events, _.bind(this._unbindEvent, this));
	},

	//
	// Used internally by View::unbindEvents above
	//
	// Unbinds a single event from the events object
	//
	_unbindEvent: function(event) {
		// Bound directly to this.$elem
		if (event.query === '@') {
			this.$elem.off(event.event);
		}

		// Bound to the document
		else if (event.query === '') {
			cloak.$doc.off(event.event);
		}

		// Bound using a delegate
		else if (event.delegate) {
			this.$elem.off(event.event, event.query);
		}

		// Bound directly with a query
		else {
			this.$(event.query).off(event.event);
		}
	},

	// 
	// Removes the view instance, pulling the content from the DOM and unbinding
	// all event listeners
	// 
	remove: function() {
		this.emit('remove');
		this.$elem.remove();
		if (this.events) {
			this.unbindEvents();
		}
	}

});

// 
// We handle event inheritence here in the extension stage
// 
View.onExtend = function() {
	this.onExtend = View.onExtend;

	// Inherit events from parent classes
	if (cloak.config.inheritEvents) {
		var Scope = this;
		var events = { };

		while (Scope !== View) {
			events = _.extend({ }, Scope.prototype.events || { }, events);
			Scope = Scope._parent;
		}

		this.prototype.events = events;
	}
};


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
			this.$elem = $('<div>');
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

		this.emit('render', data);

		templateProperty = templateProperty || 'template';

		// If the template has not been used yet, compile it
		if (typeof this[templateProperty] === 'string') {
			this[templateProperty] = handlebars.compile(this[templateProperty]);
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
			var delegate = events._delegate;
			if (typeof delegate !== 'boolean') {
				delegate = cloak.config.delegateEvents;
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
	}

});

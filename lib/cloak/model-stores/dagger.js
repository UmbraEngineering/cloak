
// 
// Dagger.js style socket.io communication
// 

var methods = exports.methods = { };
var statics = exports.statics = { };

var cloak      = require('cloak');
var AppObject  = require('cloak/app-object');

var io = cloak.config.socket;
var id = cloak.config.idKey;

// 
// Load data from the dagger server using socket.io
// 
// @return promise
// 
methods.load = function() {
	// 
};

// 
// 
// 
methods.save = function() {
	// 
};

// 
// 
// 
methods.patch = function() {
	// 
};

// 
// 
// 
methods.del = function() {
	// 
};

// 
// Create a new subscription for this instance
// 
// @param {event} the event to listen to ("update","remove")
// @param {opts} options for the listener ("volatile")
// @return Subscription
// 
methods.subscribe = function(event, opts) {
	opts = opts || { };

	var filter = { };
	filter[id] = { $eq: this.id() };

	return new Subscription({
		model: this.name,
		event: event,
		'volatile': opts['volatile'] || false,
		filter: filter
	});
};

// --------------------------------------------------------

// 
// Create a new subscription for this model
// 
// @param {event} the event to listen to ("create","update","remove")
// @param {opts} options for the listener ("volatile","filter")
// @return Subscription
// 
statics.subscribe = function(event, opts) {
	opts = opts || { };

	return new Subscription({
		model: this.name,
		event: event,
		'volatile': opts['volatile'] || false,
		filter: opts.filter || null
	});
};

// --------------------------------------------------------

var Subscription = exports.Subscription = AppObject.extend({

	model: null,

	listening: false,

	init: function(opts) {
		_.extend(this, opts);

		// Add this instance to the list so it can be found
		Subscription._subscriptions.push(this);

		// Bind the onEvent method to the instance
		this.bind('onEvent', '_onStarted');
	},

	// 
	// Start listening for events
	// 
	// @return void
	// 
	start: function() {
		if (! this.listening) {
			this.listening = true;
			this.emit('starting');
			io.emit('listen', this.opts(), this._onStarted);
		}
	},

	// 
	// Runs when the server responds to the listen request
	// 
	// @param {res} the server response to the listen request
	// @return void
	// 
	_onStarted: function(res) {
		if (res.status !== 200) {
			return this.emit('error', res);
		}

		this.emit('started');
		io.on(this.meta.emits, this.onEvent);
	}

	// 
	// Stop listening for events
	// 
	// @return void
	// 
	stop: function() {
		if (this.listening) {
			this.listening = false;
			this.emit('stopping');
			io.removeListener(this.meta.emits, this.onEvent);
			this.emit('stopped');
		}
	},

	// 
	// Runs when we receive an event from the server
	// 
	// @param {model} the model instance data from the server
	// @return void
	// 
	onEvent: function(model) {
		this.emit('event', model);
	},

	// 
	// Add a listener to the subscription
	// 
	// @param {func} the function called when an event occurs
	// @return void
	// 
	listen: function(func) {
		this.start();
		this.on('event', func);
	},

	// 
	// Remove a listener from the subscription
	// 
	// @param {func} the function to remove
	// @return void
	// 
	unlisten: function(func) {
		this.removeListener('event', func);
		if (! this.listeners('event').length) {
			this.stop();
		}
	}

});


var cloak  = require('cloak');
var Class  = require('class');

var nextId = 1;

// 
// AppObject class
// 
var AppObject = module.exports = Class.extend({
	
	init: function() {
		// We use this as an easy event bus
		this._events = $({ });

		// Every AppObject should have its own unique identifier
		this._uuid = nextId++;
	},

	on: function() {
		this._events.on.apply(this._events, arguments);
	},

	off: function() {
		this._events.off.apply(this._events, arguments);
	},

	trigger: function() {
		this._events.trigger.apply(this._events, arguments);
	},

	bind: function() {
		for (var i = 0, c = arguments.length; i < c; i++) {
			_.bind(this[arguments[i]], this);
		}
	}

});

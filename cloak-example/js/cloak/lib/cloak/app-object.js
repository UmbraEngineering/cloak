;require._modules["/cloak/lib/cloak/app-object.js"] = (function() { var __filename = "/cloak/lib/cloak/app-object.js"; var __dirname = "/cloak/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /cloak/lib/cloak/app-object.js  == */ var __module__ = function() { 
 
var cloak  = require('cloak');
var Class  = require('cloak/class');
var $      = require('jquery');

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
 
 }; /* ==  End source for module /cloak/lib/cloak/app-object.js  == */ module.require = require._bind(module); return module; }());;
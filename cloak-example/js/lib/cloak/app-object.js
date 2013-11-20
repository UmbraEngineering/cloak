;require._modules["/lib/cloak/app-object.js"] = (function() { var __filename = "/lib/cloak/app-object.js"; var __dirname = "/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/cloak/app-object.js  == */ var __module__ = function() { 
 
var cloak         = require('cloak');
var Class         = require('cloak/class');
var _             = require(cloak.config.underscoreLib);
var EventEmitter  = require('eventemitter2').EventEmitter2;

var nextId = 1;

// 
// AppObject class
// 
var AppObject = module.exports = Class.extend({
	
	init: function() {
		// Inherit from EventEmitter
		EventEmitter.call(this, cloak.config.eventEmitter);

		// Every AppObject should have its own unique identifier
		this._uuid = nextId++;
	},

	// 
	// Bind a method(s) to the scope of this object
	// 
	//   this.bind('foo')  <===>  this.foo = this.foo.bind(this);
	// 
	bind: function() {
		for (var i = 0, c = arguments.length; i < c; i++) {
			this[arguments[i]] = _.bind(this[arguments[i]], this);
		}
	}

});

// Inherit the EventEmitter prototype
_.extend(AppObject.prototype, EventEmitter.prototype);
 
 }; /* ==  End source for module /lib/cloak/app-object.js  == */ module.require = require._bind(module); return module; }());;
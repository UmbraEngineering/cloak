;require._modules["/cloak/class.js"] = (function() { var __filename = "/cloak/class.js"; var __dirname = "/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /cloak/class.js  == */ var __module__ = function() { 
 
// 
// Simple JavaScript Inheritance
// By John Resig http://ejohn.org/
// MIT Licensed.
// 
// Inspired by base2 and Prototype
// 
// Modified for use in Cloak.js by James Brumond
// 

var initializing = false;

/*jshint ignore:start */
var fnTest = /xyz/.test(function() { xyz; }) ? /\b_super\b/ : /.*/;
/*jshint ignore:end */

// The base Class implementation (does nothing)
var Class = module.exports = function(){};

// Here we allow setting of a callback to run whenever this model is extended
Class.onExtend = null;

// This function just passes the first param to the constructor. This is limited
// in the sense that the default only allows one param, but anything needing more
// than one is likely custom and will be written accordingly
Class.create = function(param) {
	return new this(param);
};

// Create a new Class that inherits from this class
Class.extend = function(prop) {
	var _super = this.prototype;
 
	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = true;
	var prototype = new this();
	initializing = false;
 
	// Copy the properties over onto the new prototype
	for (var name in prop) {
		// Check if we're overwriting an existing function
		prototype[name] = typeof prop[name] == "function" &&
			typeof _super[name] == "function" && fnTest.test(prop[name]) ?
			(function(name, fn){
				return function() {
					var tmp = this._super;
				 
					// Add a new ._super() method that is the same method
					// but on the super-class
					this._super = _super[name];
				 
					// The method only need to be bound temporarily, so we
					// remove it when we're done executing
					var ret = fn.apply(this, arguments);        
					this._super = tmp;
				 
					return ret;
				};
			})(name, prop[name]) :
			prop[name];
	}
 
	// The dummy class constructor
	function Class() {
		// All construction is actually done in the init method
		if ( !initializing && this.init )
			this.init.apply(this, arguments);
	}
 
	// Populate our constructed prototype object
	Class.prototype = prototype;
 
	// Enforce the constructor to be what we expect
	Class.prototype.constructor = this;

	// And make this class extendable
	Class.extend = arguments.callee;

	// Add the create method to this class
	Class.create = this.create;

	// If this class has an onExtend method, call it now with the completed class
	if (typeof this.onExtend === 'function') {
		this.onExtend.call(Class);
	}
 
	return Class;
};
 
 }; /* ==  End source for module /cloak/class.js  == */ return module; }());;
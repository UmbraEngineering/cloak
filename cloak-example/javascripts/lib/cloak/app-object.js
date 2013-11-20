
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

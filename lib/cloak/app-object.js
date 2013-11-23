
var cloak         = require('cloak');
var Class         = require('cloak/class');
var _             = require('cloak/underscore');
var EventEmitter  = require('eventemitter2').EventEmitter2;

var nextId = 1;

// 
// AppObject class
// 
var AppObject = module.exports = Class.extend({
	
	init: function() {
		// Inherit from EventEmitter
		EventEmitter.call(this, cloak.config.ee2);

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
	},

	// 
	// Check if this object inherits from a given parent class
	// 
	inherits: function(Parent) {
		var Scope = this.constructor;
		do {
			if (Scope === Parent) {return true;}
			if (Scope === Object) {return false;}
		}
		// Work our way up the prototype chain...
		while (Scope = Scope.prototype.constructor);
	},

	// 
	// An addition to EventEmitter2, this is basically just a partial application
	// method for emit
	// 
	emits: function() {
		var args = _.toArray(arguments);
		args.unshift(this);
		args.unshift(this.emit);
		return _.bind.apply(_, args);
	},

	// 
	// An addition to EventEmitter2, this method allows reemitting an event from
	// a different source
	// 
	reemit: function(event) {
		var self = this;
		return function() {
			event = event || this.event;
			if (event.charAt(0) === '.') {
				event = this.event + event;
			} else if (event.charAt(event.length - 1) === '.') {
				event += this.event;
			}
			
			var args = [ event ];
			args.push.apply(args, arguments);
			self.emit.apply(self, args);
		};
	}

});

// Inherit the EventEmitter prototype
_.extend(AppObject.prototype, EventEmitter.prototype);


var Class         = require('cloak/class');
var AppObject     = require('cloak/app-object');
var EventEmitter  = require('eventemitter2').EventEmitter2;

describe('AppObject', function() {
	it('should extend the base class, and inherit EventEmitter\'s prototype', function() {
		expect(AppObject.prototype.constructor.prototype.constructor).toBe(Class);
		expect(AppObject.prototype.on).toBe(EventEmitter.prototype.on);
	});

	it('should assign a unique ID to every new instance', function() {
		var obj1 = new AppObject();
		var obj2 = new AppObject();
		var obj3 = new AppObject();

		expect(typeof obj1._uuid).toBe('number');
		expect(typeof obj2._uuid).toBe('number');
		expect(typeof obj3._uuid).toBe('number');
	});

	describe('AppObject::init', function() {
		// 
	});
});


var Class         = require('cloak/class');
var AppObject     = require('cloak/app-object');
var EventEmitter  = require('eventemitter2').EventEmitter2;

describe('AppObject', function() {
	it('should extend the base class, and inherit EventEmitter\'s prototype', function() {
		expect(AppObject.prototype.constructor).toBe(Class);
		expect(AppObject.prototype.on).toBe(EventEmitter.prototype.on);
	});

	describe('AppObject::init', function() {
		// 
	});
});

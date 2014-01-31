
var Class         = require('cloak/class');
var AppObject     = require('cloak/app-object');
var EventEmitter  = require('eventemitter2').EventEmitter2;

describe('AppObject', function() {

	it('should extend the base class, and inherit EventEmitter\'s prototype', function() {
		expect(AppObject.inherits(Class)).toBeTruthy();
		expect(AppObject.prototype.on).toBe(EventEmitter.prototype.on);
	});

	it('should assign a unique ID to every new instance', function() {
		var obj1 = new AppObject();
		var obj2 = new AppObject();
		var obj3 = new AppObject();

		expect(typeof obj1._uuid).toBe('number');
		expect(typeof obj2._uuid).toBe('number');
		expect(typeof obj3._uuid).toBe('number');

		expect(obj1._uuid).not.toBe(obj2._uuid);
		expect(obj2._uuid).not.toBe(obj3._uuid);
		expect(obj3._uuid).not.toBe(obj1._uuid);
	});

// -------------------------------------------------------------

	describe('AppObject::bind', function() {
		var obj, func, scope;

		beforeEach(function() {
			obj = new AppObject();
			func = function() { scope = this; };
		});

		it('should replace the given functions with new functions', function() {
			obj.testMethod = func;
			
			obj.bind('testMethod');

			expect(obj.testMethod).not.toBe(func);
			expect(typeof obj.testMethod).toBe('function');
		});

		it('should be able to bind multiple functions at a time', function() {
			obj.method1 = func;
			obj.method2 = func;
			obj.method3 = func;

			obj.bind('method1', 'method2', 'method3');

			expect(obj.method1).not.toBe(func);
			expect(typeof obj.method1).toBe('function');
			
			expect(obj.method2).not.toBe(func);
			expect(typeof obj.method2).toBe('function');
			
			expect(obj.method3).not.toBe(func);
			expect(typeof obj.method3).toBe('function');

			expect(obj.method1).not.toBe(obj.method2);
			expect(obj.method2).not.toBe(obj.method3);
			expect(obj.method3).not.toBe(obj.method1);
		});

		it('should always call the bound method in the scope of the binding object', function() {
			obj.method = func;
			obj.bind('method');

			obj.method();
			expect(scope).toBe(obj);

			var pulled = obj.method;
			pulled();
			expect(scope).toBe(obj);

			obj.method.call({});
			expect(scope).toBe(obj);
		});
	});

// -------------------------------------------------------------

	describe('AppObject::emits', function() {
		var obj;

		beforeEach(function() {
			obj = new AppObject();
		});

		it('should return a function', function() {
			expect(typeof obj.emits('foo')).toBe('function');
		});

		it('should emit an event on the object when the returned function is called', function() {
			var emitter = obj.emits('foo');
			var eventCalled = false;
			
			obj.on('foo', function() {
				eventCalled = true;
			});

			runs(function() {
				emitter();
			});

			waitsFor(function() {
				return eventCalled;
			});

			runs(function() {
				expect(eventCalled).toBeTruthy();
			});
		});
	});

// -------------------------------------------------------------

	describe('AppObject::reemit', function() {
		var obj1, obj2;

		beforeEach(function() {
			obj1 = new AppObject();
			obj2 = new AppObject();
		});

		it('should return a function', function() {
			expect(typeof obj1.reemit()).toBe('function');
		});

		it('should reemit the calling event on the object', function() {
			var eventCalled = false;

			obj1.on('foo', obj2.reemit());
			obj2.on('foo', function() {
				eventCalled = true;
			});

			runs(function() {
				obj1.emit('foo');
			});

			waitsFor(function() {
				return eventCalled;
			});

			runs(function() {
				expect(eventCalled).toBeTruthy();
			});
		});
	});

});

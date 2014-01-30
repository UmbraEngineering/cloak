
var Class = require('cloak/class');

describe('Class', function() {
	describe('Class.create', function() {
		it('should return an instance of itself', function() {
			expect(Class.create() instanceof Class).toBe(true);
		});
	});
	
	describe('Class.extend', function() {
		var Sub, SubSub, sub, subSub;

		beforeEach(function() {
			Sub = Class.extend({
				prop: 'foo',
				method: function() {
					return 'foo';
				}
			});

			SubSub = Sub.extend({
				foo: 'bar',
				prop: 'baz'
			});

			sub = new Sub();
			subSub = new SubSub();
		});

		it('should create a new subclass', function() {
			expect(typeof Sub).toBe('function');
			expect(sub instanceof Sub).toBeTruthy();
		});

		it('should set the methods and properties to the new subclass', function() {
			expect(Sub.prototype.prop).toBe('foo');
			expect(Sub.prototype.method()).toBe('foo');
			expect(sub.prop).toBe('foo');
			expect(sub.method()).toBe('foo');
		});

		it('should create extendable subclasses', function() {
			expect(Sub.extend).toBe(Class.extend);
			expect(SubSub.prototype.foo).toBe('bar');
			expect(SubSub.prototype.prop).toBe('baz');
			expect(subSub.method()).toBe('foo');
		});

		it('should set up correct inheritence for the subclass', function() {
			expect(Sub.prototype.constructor).toBe(Class);
			expect(SubSub.prototype.constructor).toBe(Sub);
			expect(subSub instanceof Sub).toBeTruthy();
			expect(subSub instanceof Class).toBeTruthy();
		});
	});
});

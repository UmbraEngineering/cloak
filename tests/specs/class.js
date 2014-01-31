
var Class = require('cloak/class');

describe('Class', function() {

	describe('Class.create', function() {
		it('should return an instance of itself', function() {
			expect(Class.create() instanceof Class).toBe(true);
		});
	});

// -------------------------------------------------------------
	
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
			expect(sub.constructor).toBe(Sub);
			expect(subSub.constructor).toBe(SubSub);
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
			expect(sub.constructor).toBe(Sub);
			expect(subSub.constructor).toBe(SubSub);
			expect(subSub instanceof Sub).toBeTruthy();
			expect(subSub instanceof Class).toBeTruthy();
		});

		it('should expose the parent class on each class', function() {
			expect(SubSub._parent).toBe(Sub);
			expect(Sub._parent).toBe(Class);
			expect(Class._parent).toBe(Object);
		})
	});

// -------------------------------------------------------------
	
	describe('Class.inherits', function() {
		var Sub, SubSub, SubSubSub, Other;

		beforeEach(function() {
			Sub = Class.extend({ });
			SubSub = Sub.extend({ });
			SubSubSub = SubSub.extend({ });
			Other = Class.extend({ });
		});

		it('should always match Class', function() {
			expect(Sub.inherits(Class)).toBeTruthy();
			expect(SubSub.inherits(Class)).toBeTruthy();
			expect(SubSubSub.inherits(Class)).toBeTruthy();
		});

		it('should always match Object', function() {
			expect(Sub.inherits(Object)).toBeTruthy();
			expect(SubSub.inherits(Object)).toBeTruthy();
			expect(SubSubSub.inherits(Object)).toBeTruthy();
		});

		it('should match different levels of inheritence (not just immediate parents)', function() {
			expect(SubSub.inherits(Sub)).toBeTruthy();
			expect(SubSubSub.inherits(Sub)).toBeTruthy();
		});

		it('should not match non-ancesstor classes', function() {
			expect(Sub.inherits(Other)).not.toBeTruthy();
			expect(Other.inherits(Sub)).not.toBeTruthy();
		});

		it('should not match backward (matching child classes)', function() {
			expect(Sub.inherits(SubSub)).not.toBeTruthy();
		});
	});

});

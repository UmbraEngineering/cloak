
var Class = require('cloak/class');

describe('Class', function() {
	describe('Class.create', function() {
		it('should return an instance of itself', function() {
			expect(Class.create() instanceof Class).toBe(true);
		});
	});
	
	describe('Class.extend', function() {
		// 
	});
});

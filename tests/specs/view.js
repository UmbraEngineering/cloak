
var View       = require('cloak/view');
var AppObject  = require('cloak/app-object');

describe('View', function() {

	it('should extend the AppObject class', function() {
		expect(AppObject.inherits(AppObject)).toBeTruthy();
	});

// -------------------------------------------------------------

	describe('View::init', function() {
		it('should select an existing element if an {elem} property is given', function() {
			var TestView = View.extend({
				elem: 'body'
			});

			var view = new TestView();

			expect(view.$elem.length).toBe(1);
			expect(view.$elem[0]).toBe(document.body);
		});

		it('should create a new view element with the given tag name if a {tagName} property is given', function() {
			var TestView = View.extend({
				tagName: 'p'
			});

			var view = new TestView();

			expect(view.$elem.length).toBe(1);
			expect(view.$elem.prop('tagName')).toBe('P');
		});

		it('should create a new div element if no other element is specified', function() {
			var TestView = View.extend({ });

			var view = new TestView();

			expect(view.$elem.length).toBe(1);
			expect(view.$elem.prop('tagName')).toBe('DIV');
		});

		it('should set the class name of the element if a {className} property is given', function() {
			var TestView = View.extend({
				className: 'test-class'
			});

			var view = new TestView();

			expect(view.$elem.hasClass('test-class')).toBeTruthy();
		});

		it('should set the id of the element if an {id} property is given', function() {
			var TestView = View.extend({
				id: 'test-id'
			});

			var view = new TestView();

			expect(view.$elem.attr('id')).toBeTruthy();
		});

		it('should set any attributes given to the element if an {attributes} hash property is given', function() {
			var TestView = View.extend({
				attributes: {
					role: 'presentation',
					'data-foo': 'bar'
				}
			});

			var view = new TestView();

			expect(view.$elem.attr('role')).toBe('presentation');
			expect(view.$elem.attr('data-foo')).toBe('bar');
		});

		it('should call the {initialize} method if one is given', function() {
			var TestView = View.extend({
				initialize: function() { /* noop */ }
			});

			spyOn(TestView.prototype, 'initialize');

			var view = new TestView();

			expect(view.initialize).toHaveBeenCalled();
		});
	});

// -------------------------------------------------------------

	describe('View::initialize', function() {
		it('should extend the view object with the given hash', function() {
			var TestView = View.extend({ });
			var view = new TestView({
				foo: 'fooValue',
				bar: 'barValue'
			});

			expect(view.foo).toBe('fooValue');
			expect(view.bar).toBe('barValue');
		});
	});

});

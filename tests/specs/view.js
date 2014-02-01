
var $           = require('jquery');
var View        = require('cloak/view');
var AppObject   = require('cloak/app-object');
var handlebars  = require('handlebars');

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

// -------------------------------------------------------------

	describe('View::$', function() {
		it('should query for elements inside of the view element', function() {
			var TestView = View.extend({ });
			var view = new TestView();

			view.$elem.html('<div></div><div class="foo"><div></div></div><p></p>');

			expect(view.$('div').length).toBe(3);
			expect(view.$('.foo').length).toBe(1);
			expect(view.$('p').length).toBe(1);
			expect(view.$('div div').length).toBe(1);
		});
	});

// -------------------------------------------------------------

	describe('View::render', function() {
		var TestView, view;

		beforeEach(function() {
			TestView = View.extend({
				template: '<h1>{{ text }}</h1>',
				otherTemplate: '<h2>{{ text }}</h2>'
			});
			
			view = new TestView();

			if (handlebars.compile) {
				spyOn(handlebars, 'compile').andCallThrough();
			}
			if (handlebars.template) {
				spyOn(handlebars, 'template').andCallThrough();
			}
		});

		describe('the render event emitted by the method', function() {
			var onrender, callRender;

			beforeEach(function() {
				view.on('render', onrender = jasmine.createSpy());
				callRender = function(template, callback) {
					runs(function() {
						view.render({ foo: 'bar' }, template);
					});
					waitsFor(function() {
						return onrender.calls.length;
					});
					runs(callback);
				};
			});

			it('should emit a render event on the view', function() {
				callRender('otherTemplate', function() {
					expect(onrender).toHaveBeenCalled();
				});
			});

			it('should call the event function with the view scope', function() {
				callRender('otherTemplate', function() {
					expect(onrender.calls[onrender.calls.length - 1].object).toBe(view);
				});
			});

			it('should pass in the data object with the view uuid', function() {
				callRender('otherTemplate', function() {
					var call = onrender.calls[onrender.calls.length - 1];

					expect(call.args[0].foo).toBe('bar');
					expect(call.args[0]._uuid).toBe(view._uuid);
				});
			});

			it('should pass in the template property', function() {
				callRender('otherTemplate', function() {
					expect(onrender.calls[onrender.calls.length - 1].args[1]).toBe('otherTemplate');
				});
			});
		});

		it('should render the given template', function() {
			var elem = $(view.render({ text: 'foo' }, 'otherTemplate'));
			expect(elem.prop('tagName')).toBe('H2');
			expect(elem.html()).toBe('foo');
		});

		it('should default to the "template" property', function() {
			var elem = $(view.render({ text: 'bar' }));
			expect(elem.prop('tagName')).toBe('H1');
			expect(elem.html()).toBe('bar');
		});

		it('should throw an error if there is no template', function() {
			var caught;
			try {
				view.render({ }, 'noSuchTemplate');
			} catch (err) {
				caught = err;
			}
			expect(caught instanceof TypeError).toBeTruthy();
		});
	});

});

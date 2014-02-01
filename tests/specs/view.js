
var $           = require('jquery');
var cloak       = require('cloak');
var View        = require('cloak/view');
var AppObject   = require('cloak/app-object');
var handlebars  = require('handlebars');

describe('View', function() {

	it('should extend the AppObject class', function() {
		expect(AppObject.inherits(AppObject)).toBeTruthy();
	});

// -------------------------------------------------------------

	describe('View.onExtend', function() {
		var SubView, SubSubView;

		function defineViews() {
			SubView = View.extend({
				name: 'SubView',
				events: {
					'click a': 'foo'
				},
				foo: function() { /* noop */ }
			});

			SubSubView = SubView.extend({
				name: 'SubSubView',
				events: {
					'mouseover @': 'bar'
				},
				bar: function() { /* noop */ }
			});
		}

		it('should not inherit parent events if {cloak.config.inheritEvents} is false', function() {
			cloak.config.inheritEvents = false;
			defineViews();

			var events = SubSubView.prototype.events;
			expect(events['click a']).not.toBeDefined();
			expect(events['mouseover @']).toBe('bar');
		});

		it('should inherit parent events if {cloak.config.inheritEvents} is true', function() {
			cloak.config.inheritEvents = true;
			defineViews();
			
			var events = SubSubView.prototype.events;
			expect(events['click a']).toBe('foo');
			expect(events['mouseover @']).toBe('bar');
		});
	});

// -------------------------------------------------------------

	describe('View::init', function() {
		it('should call the {initialize} method if one is given', function() {
			var TestView = View.extend({
				initialize: function() { /* noop */ }
			});

			spyOn(TestView.prototype, 'initialize');

			var view = new TestView();

			expect(view.initialize).toHaveBeenCalled();
		});

		describe('element creation', function() {
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

// -------------------------------------------------------------

	describe('View::bindEvents', function() {
		beforeEach(function() {
			TestView = View.extend({
				events: {
					'click a': 'foo',
					'click div': 'bar'
				},
				foo: function() { /* noop */ },
				bar: function() { /* noop */ }
			});

			view = new TestView();

			spyOn(view, '_bindEvent');
		});

		it('should do nothing if the view has no events', function() {
			view.events = null;
			view.bindEvents();

			expect(view._bindEvent).not.toHaveBeenCalled();
		});

		it('should call View::_bindEvent for each event to bind', function() {
			view.bindEvents();

			expect(view._bindEvent.calls.length).toBe(2);
		});

		describe('View::_bindEvent delegate param', function() {
			it('should be true if view.events._delegate is true', function() {
				view.events._delegate = true;
				view.bindEvents();

				expect(view._bindEvent).toHaveBeenCalledWith(true, jasmine.any(String), jasmine.any(String), jasmine.any(Object));
			});

			it('should be false if view.events._delegate is false', function() {
				view.events._delegate = false;
				view.bindEvents();

				expect(view._bindEvent).toHaveBeenCalledWith(false, jasmine.any(String), jasmine.any(String), jasmine.any(Object));
			});

			it('should be true if view.events._delegate is undefined and cloak.config.delegateEvents is true', function() {
				cloak.config.delegateEvents = true;
				view.bindEvents();

				expect(view._bindEvent).toHaveBeenCalledWith(true, jasmine.any(String), jasmine.any(String), jasmine.any(Object));
			});

			it('should be false if view.events._delegate is undefined and cloak.config.delegateEvents is false', function() {
				cloak.config.delegateEvents = false;
				view.bindEvents();

				expect(view._bindEvent).toHaveBeenCalledWith(false, jasmine.any(String), jasmine.any(String), jasmine.any(Object));
			});
		});
	});

// -------------------------------------------------------------

	describe('View::_bindEvent', function() {
		// 
	});

// -------------------------------------------------------------

	describe('View::unbindEvents', function() {
		var TestView, view;

		beforeEach(function() {
			TestView = View.extend({
				initialize: function() {
					this._boundEvents.push('BOUND1', 'BOUND2', 'BOUND3');
				}
			});

			view = new TestView();

			spyOn(view, '_unbindEvent');
		});

		it('should call View::_unbindEvent for each entry in View::_boundEvents', function() {
			view.unbindEvents();

			expect(view._unbindEvent).toHaveBeenCalledWith('BOUND1', 0, jasmine.any(Array));
			expect(view._unbindEvent).toHaveBeenCalledWith('BOUND2', 1, jasmine.any(Array));
			expect(view._unbindEvent).toHaveBeenCalledWith('BOUND3', 2, jasmine.any(Array));
		});

		it('should use the given events parameter if given instead of View::_boundEvents', function() {
			view.unbindEvents(['GIVEN1', 'GIVEN2', 'GIVEN3']);

			expect(view._unbindEvent).toHaveBeenCalledWith('GIVEN1', 0, jasmine.any(Array));
			expect(view._unbindEvent).toHaveBeenCalledWith('GIVEN2', 1, jasmine.any(Array));
			expect(view._unbindEvent).toHaveBeenCalledWith('GIVEN3', 2, jasmine.any(Array));
		});
	});

// -------------------------------------------------------------

	describe('View::_unbindEvent', function() {
		var TestView;
		var view;

		beforeEach(function() {
			TestView = View.extend({
				// 
			});

			view = new TestView();

			spyOn(view.$elem, 'off');
			spyOn(cloak.$doc, 'off');
		});

		it('should unbind from the view element if the query value is "@"', function() {
			view._unbindEvent({
				query: '@',
				event: 'foo'
			});

			expect(view.$elem.off).toHaveBeenCalledWith('foo');
		});

		it('should unbind from the document if the query is blank', function() {
			view._unbindEvent({
				query: '',
				event: 'foo'
			});

			expect(cloak.$doc.off).toHaveBeenCalledWith('foo');
		});

		it('should unbind a delegate from the view element if using delegate events', function() {
			view._unbindEvent({
				query: 'div',
				event: 'foo',
				delegate: true
			});

			expect(view.$elem.off).toHaveBeenCalledWith('foo', 'div');
		});

		it('should query for the event element and unbind from there if not using delegate events', function() {
			var elemSpy = {
				off: jasmine.createSpy()
			};
			spyOn(view, '$').andReturn(elemSpy);

			view._unbindEvent({
				query: 'div',
				event: 'foo'
			});

			expect(view.$).toHaveBeenCalledWith('div');
			expect(elemSpy.off).toHaveBeenCalledWith('foo');
		});
	});

// -------------------------------------------------------------

	describe('View::remove', function() {
		var TestView, view;

		beforeEach(function() {
			TestView = View.extend({
				events: { }
			});

			view = new TestView();
		});

		it('should emit a remove event', function() {
			var spy = jasmine.createSpy();
			
			runs(function() {
				view.on('remove', spy);
				view.remove();
			});
			waitsFor(function() {
				return spy.calls.length;
			});
			runs(function() {
				expect(spy).toHaveBeenCalled();
			});
		});

		it('should remove view.$elem from the DOM', function() {
			spyOn(view.$elem, 'remove');
			view.remove();
			expect(view.$elem.remove).toHaveBeenCalled();
		});

		it('should unbind any events', function() {
			spyOn(view, 'unbindEvents');
			view.remove();
			expect(view.unbindEvents).toHaveBeenCalled();
		})
	});

});

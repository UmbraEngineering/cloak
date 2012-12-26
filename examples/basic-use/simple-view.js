
//
// This is an example of a super-simple view class.
//

Class('FooView').Extends('View', {
	
	// 
	// The {template} property can be either a hard-coded template string
	// or a reference to a pre-compiled template
	// 
	template: '<a href="#" class="foo">{{ text }}</a>',

	// 
	// This is called for every new instance of this class; It is your
	// constructor method.
	// 
	initialize: function($root) {
		this.$root = $root;

		// 
		// The {$elem} property is important in Cloak views; it represents
		// the uppermost DOM node for this view. Method like {View::$} and
		// {View::bindEvents} operate inside of your {$elem} property, so
		// make sure it is defined before trying to perform such tasks with
		// your view's nodes.
		// 
		this.$elem = $('<div class="foo-wrapper" />');
	},

	//
	// The {events} property is a hash containing DOM events to be bound
	// inside your view when the {View::bindEvents} method is called. The
	// event below would be written something like this (in jQuery):
	// 
	//   this.$elem.find('a.foo').on('click', _.bind(this.onFoo, this));
	//
	events: {
		'click a.foo':  'onFoo'
	},

	// 
	// The method name {draw} has no real importance internally for Cloak;
	// It is just used as a convention for the method which initially renders
	// the view's markup into the DOM. You could use any method name here if
	// you wanted, but we suggest sticking with {draw} to avoid confusion.
	// 
	draw: function() {
		this.$root.append(this.$elem);
		this.$elem.html(this.render({
			text: 'Foo'
		}));

		// 
		// This method binds the DOM events defined above in the {events}
		// object.
		// 
		this.bindEvents();
	},

	// 
	// This is the method called when the "a.foo" element is clicked, as
	// defined above in the {events} object.
	// 
	onFoo: function(evt) {
		evt.preventDefault();
		alert('Foo!');
	}

});

// 
// This would normally be in a different file somewhere to start up your app
// 
app.on('ready', function() {
	var foo = new app.FooView($('body'));
	foo.draw();
});

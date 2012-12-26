
// 
// This example shows how to augment the {app.Model} constructor
// to use a templating engine other than Handlebars. This example
// uses EJS.
// 
// If you plan on using a different templating engine, it is suggested
// that you make a custom build of Cloak as Handlebars is built-in by
// default and there is no need for a templating engine you are not
// going to use.
// 

Class.mixin('EJS', {

	// 
	// We override the default {render} method. Most of this is taken directly
	// from the original method, just with the modifications needed to make
	// use of EJS in place of Handlebars.
	// 
	render: function(data, templateProperty) {
		// 
		// Build the {data} object which contains the local variables for
		// the template to use.
		// 
		data = _.extend({ _uuid: this._uuid }, data || { });

		// 
		// Emit an event letting anyone who cares no that we are rendering
		// the template now.
		// 
		this.emit('render', data);

		// 
		// Determine where the template is stored. The default is {this.template}.
		// 
		templateProperty = templateProperty || 'template';

		// 
		// If the template has not been used yet, compile it.
		// 
		if (typeof this[templateProperty] === 'string') {
			this[templateProperty] = new EJS({ text: this[templateProperty] });
		}
		
		// 
		// Render the compiled template
		// 
		if (typeof this[templateProperty] === 'object') {
			return this[templateProperty].render(data);
		}
		
		// 
		// If we could not render the template or one was not found, throw
		// an error.
		// 
		throw new TypeError('Cannot render view without a valid template');
	}

});

// 
// Mixins support late-application using the {Mixin::mixinTo} method.
// 
// Merge our augmentation mixin into the {View} class.
// 
app.EJS.mixinTo(app.View);

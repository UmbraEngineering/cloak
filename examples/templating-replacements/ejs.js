
// 
// Work around for using Cloak with a templating engine other than
// Handlebars. This example uses EJS.
// 

Class.mixin('EJS', {

	render: function(data, templateProperty) {
		data = _.extend({ _uuid: this._uuid }, data || { });

		this.emit('render', data);

		templateProperty = templateProperty || 'template';

		// If the template has not been used yet, compile it
		if (typeof this[templateProperty] === 'string') {
			this[templateProperty] = new EJS({ text: this[templateProperty] });
		}
		
		// Render the compiled template
		if (typeof this[templateProperty] === 'object') {
			return this[templateProperty].render(data);
		}
		
		throw new TypeError('Cannot render view without a valid template');
	}

});

// 
// Mixins can be late-applied to classes; Use the EJS mixin to update
// the View class, effectively replacing Handlebars rendering with the
// above EJS render method throughout the entire app.
// 
app.EJS.mixinTo(app.View);

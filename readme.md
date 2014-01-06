# cloak

_Version 1.0.0_

Cloak.js is a client-side MVC web application framework. Inspired greatly by [Backbone.js](http://backbonejs.org/), Cloak.js has many similar features and should be very easy to learn for anyone familiar with Backbone.js. Cloak.js is designed around the CommonJS module API.

```javascript
var View = require('cloak/view');

var Heading = module.exports = View.extend({

	template: '<h1>{{ text }}</h1>',
	
	draw: function(text) {
		this.$elem.html(this.render({
			text: text
		}));
	}

});
```

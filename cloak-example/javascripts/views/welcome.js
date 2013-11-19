
var View = require('cloak/view');

// 
// WelcomeView
// 
var WelcomeView = module.exports = View.extend({

	draw: function() {
		this.$elem.html('<h1>Welcome! :D</h1>');
	}

});

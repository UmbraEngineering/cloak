
var History   = require('history');
var AppObject = require('cloak/app-object');

// 
// Router class
//
var Router = module.exports = AppObject.extend({

	routes: null,

	init: function() {
		// ...
	}

});


/*

var Workspace = Backbone.Router.extend({

  routes: {
	"help":                 "help",    // #help
	"search/:query":        "search",  // #search/kiwis
	"search/:query/p:page": "search"   // #search/kiwis/p7
  },

  help: function() {
	...
  },

  search: function(query, page) {
	...
  }

});

*/

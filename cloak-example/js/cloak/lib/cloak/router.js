;require._modules["/cloak/lib/cloak/router.js"] = (function() { var __filename = "/cloak/lib/cloak/router.js"; var __dirname = "/cloak/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /cloak/lib/cloak/router.js  == */ var __module__ = function() { 
 
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
 
 }; /* ==  End source for module /cloak/lib/cloak/router.js  == */ module.require = require._bind(module); return module; }());;
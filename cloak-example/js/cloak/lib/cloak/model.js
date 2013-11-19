;require._modules["/cloak/lib/cloak/model.js"] = (function() { var __filename = "/cloak/lib/cloak/model.js"; var __dirname = "/cloak/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /cloak/lib/cloak/model.js  == */ var __module__ = function() { 
 
var AppObject = require('cloak/app-object');

// 
// Model class
// 
var Model = module.exports = AppObject.extend({

	init: function() {
		this._super();
	}

});
 
 }; /* ==  End source for module /cloak/lib/cloak/model.js  == */ module.require = require._bind(module); return module; }());;
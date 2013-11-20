;require._modules["/lib/cloak/model.js"] = (function() { var __filename = "/lib/cloak/model.js"; var __dirname = "/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/cloak/model.js  == */ var __module__ = function() { 
 
var AppObject = require('cloak/app-object');

// 
// Model class
// 
var Model = module.exports = AppObject.extend({

	init: function() {
		this._super();
	}

});
 
 }; /* ==  End source for module /lib/cloak/model.js  == */ module.require = require._bind(module); return module; }());;
;require._modules["/lib/cloak/collection.js"] = (function() { var __filename = "/lib/cloak/collection.js"; var __dirname = "/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/cloak/collection.js  == */ var __module__ = function() { 
 
// 
// Collection class
// 

var AppObject = require('cloak/app-object');

var Collection = module.exports = AppObject.extend({

	// 

});
 
 }; /* ==  End source for module /lib/cloak/collection.js  == */ module.require = require._bind(module); return module; }());;
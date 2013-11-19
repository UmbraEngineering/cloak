;require._modules["/views/welcome.js"] = (function() { var __filename = "/views/welcome.js"; var __dirname = "/views"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /views/welcome.js  == */ var __module__ = function() { 
 
var View = require('cloak/view');

var WelcomeView = module.exports = View.extend({

	// 

});
 
 }; /* ==  End source for module /views/welcome.js  == */ module.require = require._bind(module); return module; }());;
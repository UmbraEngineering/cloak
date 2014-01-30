;require._modules["/history/index.js"] = (function() { var __filename = "/history/index.js"; var __dirname = "/history"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /history/index.js  == */ var __module__ = function() { 
 
// 
// This wrapper module is to make sure that History.js loads correctly
// as a CommonJS module
// 

window.jQuery = require('jquery');

require('./history');
require('./adapter.jquery');
require('./html4');

try {
	window.jQuery = void(0);
	delete window.jQuery;
} catch (e) { }

// Export it for easier CommonJS use, even though it defines globaly
module.exports = History;
 
 }; /* ==  End source for module /history/index.js  == */ return module; }());;
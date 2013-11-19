;require._modules["/cloak/lib/history/index.js"] = (function() { var __filename = "/cloak/lib/history/index.js"; var __dirname = "/cloak/lib/history"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /cloak/lib/history/index.js  == */ var __module__ = function() { 
 
require('./history');
require('./adapter.jquery');
require('./html4');

// Export it for easier CommonJS use, even though it defines globaly
module.exports = History;
 
 }; /* ==  End source for module /cloak/lib/history/index.js  == */ module.require = require._bind(module); return module; }());;
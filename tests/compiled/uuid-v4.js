;require._modules["/uuid-v4.js"] = (function() { var __filename = "/uuid-v4.js"; var __dirname = "/"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /uuid-v4.js  == */ var __module__ = function() { 
 
// 
// Source: https://github.com/SportZing/uuid-v4
// 

exports = module.exports = function() {
	var ret = '', value;
	for (var i = 0; i < 32; i++) {
		value = exports.random() * 16 | 0;
		// Insert the hypens
		if (i > 4 && i < 21 && ! (i % 4)) {
			ret += '-';
		}
		// Add the next random character
		ret += (
			(i === 12) ? 4 : (
				(i === 16) ? (value & 3 | 8) : value
			)
		).toString(16);
	}
	return ret;
};

var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
exports.isUUID = function(uuid) {
	return uuidRegex.test(uuid);
};

exports.random = function() {
	return Math.random();
};
 
 }; /* ==  End source for module /uuid-v4.js  == */ return module; }());;
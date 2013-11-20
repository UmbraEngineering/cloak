;require._modules["/lib/base64.js"] = (function() { var __filename = "/lib/base64.js"; var __dirname = "/lib"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/base64.js  == */ var __module__ = function() { 
 
// 
// JavaScript implementation of Base64 for backward compat.
// 

var a = window,
	b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	c = function () {
		try {
			document.createElement("$")
		} catch (a) {
			return a
		}
	}();

exports.btoa = a.btoa || function (a) {
	for (var d, e, f = 0, g = b, h = ""; a.charAt(f | 0) || (g = "=", f % 1); h += g.charAt(63 & d >> 8 - f % 1 * 8)) {
		e = a.charCodeAt(f += .75);
		if (e > 255) throw c;
		d = d << 8 | e
	}
	return h
};

exports.atob = a.atob || function (a) {
	a = a.replace(/=+$/, "");
	if (a.length % 4 == 1) throw c;
	for (var d = 0, e, f, g = 0, h = ""; f = a.charAt(g++);~ f && (e = d % 4 ? e * 64 + f : f, d++ % 4) ? h += String.fromCharCode(255 & e >> (-2 * d & 6)) : 0) f = b.indexOf(f);
	return h
}; 
 }; /* ==  End source for module /lib/base64.js  == */ module.require = require._bind(module); return module; }());;
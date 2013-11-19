;require._modules["/cloak/lib/cloak/index.js"] = (function() { var __filename = "/cloak/lib/cloak/index.js"; var __dirname = "/cloak/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var exports = module.exports; 
 /* ==  Begin source for module /cloak/lib/cloak/index.js  == */ var __module__ = function() { 
 /**
 * Cloak Framework Core - v1.0.0
 *
 * Author: James Brumond
 * Copyright 2013 Umbra Engineering
 * Dual licensed under MIT and GPL
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true, boss: true,
  unused: false */

/*global Class: true, EventEmitter2: true, _: true, Handlebars: true, console: true */

var $ = require('jquery');

// 
// Allow both underscore and lodash
// 
var _, underscoreLib;
try {
	_ = require('underscore');
	underscoreLib = 'underscore';
} catch (e) {
	_ = require('lodash');
	underscoreLib = 'lodash';
}

var RequestQueue = require('cloak/xhr').Queue;

// 
// Avoid errors in older browsers and IE
// 
if (! window.console) {window.console = { };}
if (! window.console.log) {window.console.log = function () { };}

// 
// App configuration goes here
// 
exports.config = {
	// Are we using underscore or lodash?
	underscoreLib: underscoreLib
};

// 
// Authentication info is stored here
// 
exports.auth = {
	token: false,
	httpAuth: false  // {user, pass}
};

// 
// Store references to these object for easy access
// 
exports.$win = $(window);
exports.$doc = $(document);

// 
// Logs a message to the console with a prepended timestamp
// 
exports.log = function(value) {
	console.log('[' + time() + ']', value);
};

//
// Gets a formatted time string of HH:MM:SS.mmmm
//
function time() {
	var now = new Date();
	return (
		('00' + now.getHours()).slice(-2) + ':' +
		('00' + now.getMinutes()).slice(-2) + ':' +
		('00' + now.getSeconds()).slice(-2) + '.' +
		('000' + now.getMilliseconds()).slice(-4)
	);
}

// 
// The main request queue used for all internally controlled tasks
// 
exports.xhr = new RequestQueue();
 
 }; /* ==  End source for module /cloak/lib/cloak/index.js  == */ module.require = require._bind(module); return module; }());;
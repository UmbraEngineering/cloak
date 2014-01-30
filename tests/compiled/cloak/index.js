;require._modules["/cloak/index.js"] = (function() { var __filename = "/cloak/index.js"; var __dirname = "/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /cloak/index.js  == */ var __module__ = function() { 
 /**
 * Cloak Framework Core - v1.0.0
 *
 * Author: James Brumond
 * Copyright 2013 Umbra Engineering
 * Dual licensed under MIT and GPL
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, shadow: true, smarttabs: true, loopfunc: true, boss: true, unused: false */

/*global console: true */

var $ = require('jquery');
var _ = require('cloak/underscore');

// 
// Avoid errors in older browsers and IE
// 
if (! window.console) {window.console = { };}
if (! window.console.log) {window.console.log = function () { };}

// 
// App configuration goes here
// 
exports.config = {
	// EventEmitter2 configuration for all AppObjects
	ee2: {
		wildcard: false,
		delimiter: '.',
		newListener: false,
		maxListeners: 20
	},

	// URL to your API server
	apiUrl: location.protocol + '//' + location.host,

	// The property name used for passing model ids to and from
	// the server
	idKey: '_id',

	// Should repsonse data be loaded into the model after a save call?
	loadSaveResponses: true,

	// Should response data be loaded into the model after a patch call?
	loadPatchResponses: false,

	// Should delegate events be used by default?
	delegateEvents: true,

	// Should absolute URLs (not relative to apiUrl) be allowed?
	allowAbsoluteUrls: false,

	// Socket.io socket, if sockets are to be used
	socket: null,

	// How should bulk operations be performed (either "standard", "dagger", or "custom")
	bulkOperations: 'standard',

	// Maximum number of XHR/Socket requests allowed to be made at one time
	maxRequests: 1,

	// Should models be removed from collections automatically when deleted?
	removeFromCollectionOnDelete: true
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
// Converts a standardized event string (eg "foo.bar") into the correct
// format as defined by {cloak.config.ee2}
// 
exports.event = function(eventString) {
	if (exports.config.ee2.delimiter !== '.') {
		eventString = eventString.split('.').join(exports.config.ee2.delimiter);
	}
	return eventString;
};

// 
// Normalizes objects with ID to use the correct idKey as defined in
// {cloak.config.idKey}
// 
exports.idObj = function(id) {
	var obj;
	if (typeof id === 'string') {
		obj = { };
		obj[exports.config.idKey] = id;
	} else if (typeof id === 'object' && id) {
		var key = id.id ? 'id' : '_id';
		obj = id;
		obj[exports.config.idKey] = obj[key];
		delete obj[key];
	}
	return obj;
};
 
 }; /* ==  End source for module /cloak/index.js  == */ return module; }());;
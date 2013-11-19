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
	underscoreLib: underscoreLib,

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
	idKey: 'id',

	// Should id values be automatically copied over to models after
	// a GET request?
	autoAssignId: true,

	// Should the ID of a newly created object be found from the Location header?
	getIdFromCreate: false,

	// Should repsonse data be loaded into the model after a save call?
	loadSaveResponses: true,

	// Should delegate events be used by default?
	delegateEvents: true,

	// Should absolute URLs (not relative to apiUrl) be allowed?
	allowAbsoluteUrls: false
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
}

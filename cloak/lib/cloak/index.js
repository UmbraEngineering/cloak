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
var _;
try {
	_ = require('underscore');
} catch (e) {
	_ = require('lodash');
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
	// 
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

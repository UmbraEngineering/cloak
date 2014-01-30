;require._modules["/cloak/collection-async.js"] = (function() { var __filename = "/cloak/collection-async.js"; var __dirname = "/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var require = module.require = window.require._bind(module); var exports = module.exports; 
 /* ==  Begin source for module /cloak/collection-async.js  == */ var __module__ = function() { 
 
var async  = require('async');
var $      = require('jquery');
var Class  = require('cloak/class');
var _      = require('cloak/underscore');

var CollectionAsync = module.exports = Class.extend({

	init: function(collection) {
		this.collection = colllection;
	},

// --------------------------------------------------------

	// 
	// Define the non-standard async methods here
	// 

	// 
	// @alias Async::each
	// 
	forEach: function(func) {
		return this.each(func);
	},

	// 
	// @alias Async::eachSeries
	// 
	forEachSeries: function(func) {
		return this.eachSeries(func);
	},

	// 
	// @alias Async::eachLimit
	// 
	forEachLimit: function(limit, func) {
		return this.eachLimit(limit, func);
	},

	// 
	// @alias Async::detect
	// 
	find: function(func) {
		return this.detect(func);
	},

	// 
	// @alias Async::detectSeries
	// 
	findSeries: function(func) {
		return this.detectRight(func);
	}

});

// --------------------------------------------------------

// 
// Define the standard async methods here
// 

var asyncMethods = [
	'each', 'eachSeries', 'eachLimit', 'map', 'mapSeries', 'mapLimit', 'filter',
	'filterSeries', 'select', 'selectSeries', 'reject', 'rejectSeries', 'reduce',
	'reduceRight', 'detect', 'detectSeries', 'sortBy', 'some', 'every', 'concat',
	'concatSeries'
];

_.each(asyncMethods, function(method) {
	CollectionAsync.prototype[method] = function() {
		var deferred = $.Deferred();
		var args = _.toArray(arguments);
		var collection = this.collection;

		// Bind the iterator to the given parent scope
		args[args.length - 1] = _.bind(args[args.length - 1], collection);

		// Add the array and callback to the arguments
		args.unshift(collection.models);
		args.push(function(err, result) {
			if (err) {
				return deferred.rejectWith(collection, err);
			}
			deferred.resolveWith(collection, result);
		});
		
		// Call the async method
		async[method].apply(async, args);

		return deferred.promise();
	};
});
 
 }; /* ==  End source for module /cloak/collection-async.js  == */ return module; }());;
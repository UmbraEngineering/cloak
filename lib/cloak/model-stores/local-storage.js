
// 
// Local storage
// 

var uuid     = require('uuid-v4');
var _        = require('../underscore');
var Promise  = require('promise').Promise;
var Store    = require('../local-storage').Store;

var methods  = exports.methods = { };
var statics  = exports.statics = { };
var store    = exports.store   = new Store();

// 
// Load the document out of local storage
// 
// @return promise
// 
methods._load = function() {
	var self = this;

	return new Promise(function(resolve, reject) {
		var value = store.read(self.url, self.id());

		if (! value) {
			return reject(new Error('Not found'));
		}
		
		resolve(value);
	});
};

// 
// Save the document into local storage
// 
// @param {data} the data to store
// @return promise
// 
methods._save = function(data) {
	var self = this;

	return new Promise(function(resolve, reject) {
		return (self.id() ? update : create)(resolve, reject);
	});

	function create(resolve, reject) {
		self.id(store.create(self.url, data));
		resolve(store.read(self.url, self.id()));
	}

	function update(resolve, reject) {
		store.update(self.url, self.id(), data);
		resolve(store.read(self.url, self.id()));
	}
};

// 
// Patch some attributes of the document into local storage
// 
// @param {data} the data to store
// @return promise
// 
methods._patch = function(data) {
	var self = this;

	return new Promise(function(resolve, reject) {
		store.update(self.url, self.id(), data);
		resolve(store.read(self.url, self.id()));
	});
};

// 
// Delete the document from local storage
// 
// @return promise
// 
methods._del = function() {
	var self = this;

	return new Promise(function(resolve, reject) {
		store.del(self.url, self.id());
		self.emit('deleted');
		self.destroy();
		resolve();
	});
};

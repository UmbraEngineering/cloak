
// 
// Local storage
// 

var uuid   = require('uuid-v4');
var _      = require('../underscore');
var Store  = require('../local-storage').Store;

var methods = exports.methods = { };
var statics = exports.statics = { };
var store   = exports.store   = new Store();

// 
// Load the document out of local storage
// 
// @return promise
// 
methods.load = function() {
	var self = this;
	var deferred = $.Deferred();

	setTimeout(function() {
		var value = store.read(self.url, self.id());
		if (! value) {
			return deferred.rejectWith(self, new Error('Not found'));
		}
		deferred.resolveWith(self, value);
	}, 0);

	return deferred.promise();
};

// 
// Save the document into local storage
// 
// @return promise
// 
methods.save = function() {
	var self = this;
	var deferred = $.Deferred();

	self.emit('save');

	setTimeout((self.id() ? update : create), 0);

	function create() {
		self.id(store.create(self.url, self.serialize()));
		self.emit('saved');
		deferred.resolveWith(self, store.read(self.url, self.id()));
	}

	function update() {
		store.update(self.url, self.id(), self.serialize());
		self.emit('saved');
		deferred.resolveWith(self, store.read(self.url, self.id()));
	}

	return deferred.promise();
};

// 
// Patch some attributes of the document into local storage
// 
// @param {attrs...} the attributes to patch
// @return promise
// 
methods.patch = function(attrs) {
	var self = this;
	var deferred = $.Deferred();
	var keys = _.isArray(attrs) ? attrs : _.toArray(arguments);
	var data = _.pick.apply(_, [this.serialize()].concat(keys));

	self.emit('patch', keys);

	setTimeout(function() {
		store.update(self.url, self.id(), data);
		self.emit('patched', keys);
		deferred.resolveWith(self, store.read(self.url, self.id()));
	}, 0);

	return deferred.promise();
};

// 
// Delete the document from local storage
// 
// @return promise
// 
methods.del = function() {
	var self = this;
	var deferred = $.Deferred();

	if (! self.id()) {
		deferred.rejectWith(self, new Error('Document does not exist in local storage and cannot be deleted'));
	}

	else {
		self.emit('delete');
		setTimeout(function() {
			store.del(self.url, self.id());
			self.emit('deleted');
			self.destroy();
			deferred.resolveWith(self);
		}, 0);
	}

	return deferred.promise();
};


var store      = require('store');
var $          = require('jquery');
var uuid       = require('uuid-v4');
var config     = require('cloak').config;
var AppObject  = require('cloak/app-object');

// 
// Local storage class
// 
var Store = exports.Store = AppObject.extend({

	init: function() {
		this._super();
	},

	_modelStore: function(model) {
		return store.get(model) || { };
	},

	_withModelStore: function(model, func) {
		var modelStore = this._modelStore();
		store.set(model, func.call(this, modelStore) || modelStore);
	},

// -------------------------------------------------------------

	read: function(model, id) {
		return this._modelStore(model)[id];
	},

	readBulk: function(model, ids) {
		return _.values(
			_.pick.apply(_, [this._modelStore(model)].concat(ids))
		);
	},

	readByQuery: function(model, query, data) {
		return _.filter(_.values(this._modelStore(model)),
			function(obj) {
				// 
				// TODO Write query filtering code
				// 
			}
		);
	},

// -------------------------------------------------------------

	generateId: function() {
		return uuid().split('-').join('');
	},

	create: function(model, data) {
		var id = this.generateId();

		this._withModelStore(model, function(modelStore) {
			modelStore[id] = data;
		});

		return id;
	},

// -------------------------------------------------------------
	
	update: function(model, id, data) {
		this._withModelStore(model, function(modelStore) {
			_.extend(modelStore[id], data);
		});
	},

	updateBulk: function(model, objects) {
		this._withModelStore(model, function(modelStore) {
			_.forEach(objects, function(object) {
				_.extend(modelStore[object[config.idKey]], object);
			});
		});
	},

// -------------------------------------------------------------

	del: function(model, id) {
		this._withModelStore(model, function(modelStore) {
			delete modelStore[id];
		});
	},

	delBulk: function(model, ids) {
		this._withModelStore(model, function(modelStore) {
			_.forEach(_.keys(modelStore), function(key) {
				if (_.indexOf(ids, key) >= 0) {
					delete modelStore[key];
				}
			});
		});
	},

// -------------------------------------------------------------
	
	clear: function() {
		return store.clear();
	}

});

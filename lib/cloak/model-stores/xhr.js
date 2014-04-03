
// 
// Standard XHR REST communication
// 

var xhr  = require('../xhr');
var $    = require('jquery');

var methods = exports.methods = { };
var statics = exports.statics = { };

// 
// Load new data from the server
// 
// @return promise
// 
methods.load = function() {
	var self = this;
	var deferred = $.Deferred();

	self.emit('load');

	xhr.get(self.reqUrl(), query)
		.on('error', _.bind(deferred.rejectWith, deferred, this))
		.on('success', function(req) {
			self.importData(req.json, deferred);
		});

	return deferred.promise();
};

// 
// Saves the model to the server. Selects the request method based on whether
// or not the ID property is defined
// 
// @return promise
// 
methods.save = function() {
	var self = this;
	var deferred = $.Deferred();
	var method = this.id() ? 'put' : 'post';

	this.emit('save', method);

	xhr[method](this.reqUrl(), this.serialize())
		.on('error', _.bind(deferred.rejectWith, deferred, this))
		.on('success', function(req) {
			self.emit('saved', method);

			if (cloak.config.loadSaveResponses) {
				return self.importData(req.json, deferred);
			} else {
				// Empty out the changes list
				self._changedLocally.length = 0;
			}

			deferred.resolveWith(self, req.json);
		});

	return deferred.promise();
};

//
// Selectively saves specific properties back to the server using
// a PATCH request
// 
// @param {arg1...} attributes to be patched
// @return promise
//
methods.patch = function(arg1) {
	var self = this;
	var deferred = $.Deferred();
	var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);
	var data = _.pick.apply(_, [this.serialize()].concat(keys));

	this.emit('patch', keys);

	xhr.patch(this.reqUrl(), data)
		.on('error', _.bind(deferred.rejectWith, deferred, this))
		.on('success', function(req) {
			self.emit('patched', keys);

			if (cloak.config.loadPatchResponses) {
				return self.importData(req.json, deferred);
			} else {
				// Remove patched items from the changes list
				_.each(keys, function(key) {
					var index = _.indexOf(self._changedLocally, key);
					if (index >= 0) {
						self._changedLocally.splice(index, 1);
					}
				});
			}

			deferred.resolveWith(self, req.json);
		});

	return deferred.promise();
};

// 
// Delete the model from the server using a DELETE request
// 
// @return promise
// 
methods.del = function() {
	var deferred = $.Deferred();

	// Don't allow deleting without an ID to avoid accidental deletion
	// of entire list routes
	if (! this.id()) {
		deferred.rejectWith(this, new Error('Cannot make a DELETE request on a model with no ID'));
	}

	// Otherwise, go ahead with the delete, then teardown the model
	else {
		this.emit('delete');
		xhr.del(this.reqUrl())
			.on('error', _.bind(deferred.rejectWith, deferred, this))
			.on('success', this.emits('deleted'))
			.on('success', _.bind(this.destroy, this))
			.on('success', _.bind(function(req) {
				deferred.resolveWith(this, req.json);
			}));
	}

	return deferred.promise();
};

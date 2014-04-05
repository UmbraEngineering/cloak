
// 
// XHR requests/queueing code
// 

var $          = require('jquery');
var _          = require('underscore');
var cloak      = require('cloak');
var base64     = require('cloak/base64');
var AppObject  = require('cloak/app-object');

// 
// Request queue class. One of these queues up XHR/Socket requests to be run
// one at a time.
// 
var Queue = exports.Queue = AppObject.extend({

	init: function() {
		this._super();
		this.queue = [ ];
		this.running = 0;
	},

	next: function() {
		_.nextTick(this, function() {
			if (this.running < Queue.maxRequests && this.queue.length) {
				this.running++;

				var req = this.queue.shift();
				req.on('done', function() {
					this.running--;
					this.next();
				});
				this.emit('request', req);
				req.start();
			}
		});
	},

	run: function(method, url, data) {
		var req = new Request(method, url, data);

		this.queue.push(req);
		this.emit('queued', req);
		this.next();

		return req;
	},

	get: function(url, data) {
		return this.run('get', url, data);
	},

	post: function(url, data) {
		return this.run('post', url, data);
	},

	put: function(url, data) {
		return this.run('put', url, data);
	},

	patch: function(url, data) {
		return this.run('patch', url, data);
	},

	del: function(url, data) {
		return this.run('delete', url, data);
	}

});

// 
// Max number of concurrent requests allowed
// 
Queue.maxRequests = 2;

// --------------------------------------------------------

// 
// Export a single queue
// 
exports.queue = new Queue();

// 
// Expose the queue's main methods
// 
_.each(['run', 'get', 'post', 'put', 'patch', 'del'], function(method) {
	exports[method] = _.bind(exports.queue[method], exports.queue);
});

// --------------------------------------------------------

// 
// Request class
// 
var Request = exports.Request = AppObject.extend({

	init: function(method, url, data) {
		this.method  = method;
		this.url     = cloak.config.apiUrl + url;
		this.data    = data;

		// The config object to pass to $.ajax
		this.config = {
			url: url,
			type: method.toUpperCase(),
			async: true,
			cache: false,
			dataType: 'json',
			contentType: 'application/json',
			headers: { },
			traditional: true
		};

		// Add any default headers
		_.forEach(Request.defaultHeaders, _.bind(function(header) {
			this.setHeader(header[0], header[1]);
		}, this));

		// Check if we need to set an X-Http-Method-Override header
		if (_(cloak.config.httpMethodOverride).indexOf(method) >= 0) {
			this.config.type = 'POST';
			this.config.headers['X-Http-Method-Override'] = method;
		}

		// Add the request body
		if (method === 'GET') {
			this.config.data = data;
		} else {
			this.config.data = JSON.stringify(data);
			this.config.processData = false;
		}
	},

	// 
	// Set a new request header
	// 
	setHeader: function(header, value) {
		this.config.headers[header] = value;
	},

	// 
	// Starts running the request
	// 
	run: function() {
		var deferred = this._deferred = $.Deferred();

		this.config.complete = _.bind(this.oncomplete, this, deferred);

		cloak.log('XHR: ' + this.method.toUpperCase() + ' ' + this.url + ' ' + this.config.data);
		this.emit('send', this);
		this.xhr = $.ajax(this.config);

		return deferred.promise();
	},

	// 
	// This is called when the XHR is complete, and handles parsing the response
	// and emiting events.
	// 
	oncomplete: function(deferred, xhr, status) {
		try {
			this.json = JSON.parse(xhr.responseText);
		} catch (e) {
			this.json = { };
		}

		this.emit('response', this);
		this.emit('response.' + status, this);

		if (status === 'success' || status === 'error') {
			this.emit(status + '.' + xhr.status, this);
		}

		if (status >= 400 || ! status) {
			deferred.reject(this);
		} else {
			deferred.resolve(this);
		}
	},

	// 
	// Abort the running request if we can
	// 
	abort: function() {
		if (this.xhr && this.xhr.abort) {
			this.xhr.abort();
			this.emit('abort', this);
		}
	}

});

// 
// Default headers set on every request
// 
Request.defaultHeaders = [ ];

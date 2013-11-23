
// 
// XHR classes
// 

var $          = require('jquery');
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
		var self = this;
		setTimeout(function() {
			if (self.running < cloak.config.maxRequests && self.queue.length) {
				self.running++;

				var req = self.queue.shift();
				req.on('done', function() {
					self.running--;
					self.next();
				});
				self.emit('startRequest', req);
				req.start();
			}
		}, 0);
	},

	run: function(method, url, data) {
		var req;

		if (cloak.config.socket && url.charAt(0) === '/') {
			req = new SocketRequest(method, url, data);
		} else {
			req = new XhrRequest(method, url, data);
		}

		this.queue.push(req);
		this.emit('queue', req);
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
// XhrRequest class
// 
var XhrRequest = exports.XhrRequest = AppObject.extend({

	init: function(method, url, data) {
		this._super();

		this.method  = method;
		this.url     = url;
		this.data    = data;

		// The config object to pass to $.ajax
		this.config = {
			url: url,
			type: method.toUpperCase(),
			async: true,
			cache: false,
			dataType: 'json',
			contentType: 'application/json',
			complete: _.bind(this.oncomplete, this),
			headers: { },
			traditional: true
		};

		// Check if we need to set an X-Http-Method-Override header
		if (_(cloak.config.httpMethodOverride).indexOf(method) >= 0) {
			this.config.type = 'POST';
			this.config.headers['X-Http-Method-Override'] = method;
		}

		// Check if we are using an authentication token
		if (cloak.auth.token) {
			this.config.headers['Auth-Token'] = cloak.auth.token;
		}

		// Check if we are using HTTP Basic Auth
		else if (cloak.auth.httpAuth) {
			var auth = cloak.auth.httpAuth;
			if (! auth.compiled) {
				auth.compiled = base64.btoa(auth.user + ':' + auth.pass);
			}
			this.config.headers['Authorization'] = auth.compiled;
		}

		// Add the request body
		if (method === 'GET') {
			this.config.data = data;
		} else {
			this.config.data = JSON.stringify(data);
			this.config.processData = false;
		}

		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// Starts running the request
	// 
	start: function() {
		cloak.log('XHR: ' + this.method + ' ' + this.url + ' ' + this.config.data);
		this.emit('start', this);
		this.xhr = $.ajax(this.config);
	},

	// 
	// This is called when the XHR is complete, and handles parsing the response
	// and emiting events.
	// 
	oncomplete: function(xhr, status) {
		try {
			this.json = JSON.parse(xhr.responseText);
		} catch (e) {
			this.json = { };
		}

		this.emit('done', this);
		this.emit(status, this);

		if (status === 'success' || status === 'error') {
			this.emit(status + '.' + xhr.status, this);
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

// --------------------------------------------------------

// 
// SocketRequest class
// 
var SocketRequest = exports.SocketRequest = AppObject.extend({

	init: function(method, url, data) {
		this._super();

		this.method  = method.toLowerCase();
		this.url     = url;
		this.data    = data;

		// The Socket.io emit payload
		this.payload = {
			method: this.method,
			url: this.url,
			body: this.data,
			headers: [
				['Content-Type', 'application/json']
			]
		};

		// Check if we are using an authentication token
		if (cloak.auth.token) {
			this.payload.headers.push(['Auth-Token', cloak.auth.token]);
		}

		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// Start running the request
	// 
	start: function() {
		cloak.log('Socket: ' + this.method + ' ' + this.url + ' ' + this.config.data);
		this.emit('start', this);
		cloak.config.socket.emit(this.method, this.payload, _.bind(this.oncomplete, this));
	},

	// 
	// This is called when the XHR is complete, and handles parsing the response
	// and emiting events.
	// 
	oncomplete: function(res) {
		var status = (res.status < 400) ? 'success' : 'error';
		this.json = res.body;
		this.emit('done', this);
		this.emit(status, this);
		this.emit(status + '.' + res.status, this);
	},

	// 
	// Abort the running request if we can
	// 
	//   NOTE: Abort is kind of meaningless in the realm of socket.io
	// 
	abort: function() {
		// pass
	}

});

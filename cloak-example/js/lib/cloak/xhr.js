;require._modules["/lib/cloak/xhr.js"] = (function() { var __filename = "/lib/cloak/xhr.js"; var __dirname = "/lib/cloak"; var module = { loaded: false, exports: { }, filename: __filename, dirname: __dirname, require: null, call: function() { var require = module.require; module.loaded = true; module.call = function() { }; __module__(); }, parent: null, children: [ ] }; var process = { title: "browser", nextTick: function(func) { setTimeout(func, 0); } }; var exports = module.exports; 
 /* ==  Begin source for module /lib/cloak/xhr.js  == */ var __module__ = function() { 
 
// 
// XHR classes
// 

var Q          = require('q');
var $          = require('jquery');
var base64     = require('base64');
var cloak      = require('cloak');
var AppObject  = require('cloak/app-object');

// 
// Request queue class. One of these queues up XHR/Socket requests to be run
// one at a time.
// 
var Queue = exports.Queue = AppObject.extend({

	init: function() {
		this._super();
		this.queue = [ ];
		this.running = false;
	},

	next: function() {
		var self = this;
		setTimeout(function() {
			if (! self.running && self.queue.length) {
				self.running = self.queue.shift();
				self.running.on('done', function() {
					self.running = null;
					self.next();
				});
				self.trigger('startRequest', {req: self.running});
				self.running.start();
			}
		}, 0);
	},

	run: function(method, url, data) {
		var req;

		if (cloak.config.socketio) {
			req = new SocketRequest(method, url, data);
		} else {
			req = new XhrRequest(method, url, data);
		}

		this.queue.push(req);
		this.trigger('queue', {req: req});
		this.next();
		return req;
	},

	get: function(url, data) {
		return this.run('GET', url, data);
	},

	post: function(url, data) {
		return this.run('POST', url, data);
	},

	put: function(url, data) {
		return this.run('PUT', url, data);
	},

	patch: function(url, data) {
		return this.run('PATCH', url, data);
	},

	del: function(url, data) {
		return this.run('DELETE', url, data);
	}

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
			type: method,
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
	},

	// 
	// Starts running the request
	// 
	start: function() {
		cloak.log('XHR: ' + this.method + ' ' + this.url + ' ' + this.config.data);
		this.trigger('start', {req: this});
		this.xhr = $.ajax(this.config);
	},

	// 
	// This is called when the XHR is complete, and handles parsing the response
	// and triggering events.
	// 
	oncomplete: function(xhr, status) {
		try {
			this.json = JSON.parse(xhr.responseText);
		} catch (e) {
			this.json = { };
		}

		this.trigger('done', {req: this});
		this.trigger(status, {req: this});

		if (status === 'success' || status === 'error') {
			this.trigger(status + '.' + xhr.status, {req: this});
		}
	},

	// 
	// Abort the running request if we can
	// 
	abort: function() {
		if (this.xhr && this.xhr.abort) {
			this.xhr.abort();
			this.trigger('abort', {req: this});
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
		// 
	},

	start: function() {
		// 
	}

});
 
 }; /* ==  End source for module /lib/cloak/xhr.js  == */ module.require = require._bind(module); return module; }());;
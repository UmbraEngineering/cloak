
var cloak     = require('cloak');
var History   = require('history');
var AppObject = require('cloak/app-object');
var _         = require('cloak/underscore');

// 
// Router class
//
var Router = module.exports = AppObject.extend({

	routes: null,
	_routes: [ ],
	_isOn: false,
	_variablePattern: /:([^\/]+)/g,
	_currentUrl: null,

	init: function() {
		this._super();
		this._routes = [ ];

		_.forEach(_.keys(this.routes),
			_.bind(
				function(uri) {
					this._parseRoute(uri, this.routes[uri]);
				},
			this)
		);

		// Listen for history.statechange events
		this.bind('_onstatechange');
		if (History.enabled) {
			this.on();
		}

		// Call any given initialize method
		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}

		// When we initialize a new router, we trigger a statechange event. This shouldn't
		// cause any issues, though, as we ignore statechanges that have the same url as
		// the current one
		cloak.$win.trigger('statechange');
	},

	// 
	// Start listening for events
	// 
	// @return void
	// 
	on: function() {
		if (! this._isOn) {
			this._isOn = true;
			cloak.$win.on('statechange', this._onstatechange);
		}
	},

	// 
	// Stop listening for events
	// 
	// @return void
	// 
	off: function() {
		if (this._isOn) {
			this._isOn = false;
			cloak.$win.off('statechange', this._onstatechange);
		}
	},

	// 
	// @alias History.pushState
	// 
	pushState: function(data, title, url) {
		return History.pushState(data, title, url);
	},

	// 
	// @alias History.replaceState
	// 
	replaceState: function(data, title, url) {
		return History.replaceState(data, title, url);
	},

	// 
	// @alias History.back
	// 
	back: function() {
		return History.back();
	},

	// 
	// @alias History.forward
	// 
	forward: function() {
		return History.forward();
	},

	// 
	// @alias History.go
	// 
	go: function(num) {
		return History.go(num);
	},

	// 
	// Redirect to a different route
	// 
	// @param {href} the route to redirect to
	// @return void
	// 
	redirectTo: function(href) {
		this.pushState(null, null, href);
	},

// --------------------------------------------------------

	// 
	// Parses a single route and stores the route object
	// 
	// @param {uri} the route URI string
	// @param {method} the method to be called for the route
	// 
	_parseRoute: function(uri, method) {
		this.bind(method);

		var result = {
			uri: uri,
			func: _.bind(this[method], this),
			params: [ ]
		};

		result.regex = uri.replace(this._variablePattern, function(match, $1) {
			result.params.push($1);
			return '([^/]+)';
		});
		this._variablePattern.lastIndex = 0;

		result.regex = new RegExp('^' + result.regex + '$');

		this._routes.push(result);
	},

	// 
	// Look up a stored route by an href string
	// 
	// @param {href} the href to search for
	// @return object
	// 
	_find: function(href) {
		for (var i = 0, c = this._routes.length; i < c; i++) {
			var route = this._routes[i];
			var match = route.regex.exec(href);
			if (match) {
				return this._prepareMatch(href, route, match);
			}
		}
		
		return null;
	},

	// 
	// Assuming a match is found by {_find}, build an object representing the match
	// 
	// @param {href} the href string
	// @param {route} the original route object
	// @param {match} the regex match
	// @return object
	// 
	_prepareMatch: function(href, route, match) {
		var params = { };
		for (var i = 0, c = route.params.length; i < c; i++) {
			params[route.params[i]] = match[i + 1] || null;
		}

		return {
			func: route.func,
			href: href,
			params: params
		};
	},

	// 
	// Runs when an onstatechange event is thrown up
	// 
	// @return void
	// 
	_onstatechange: function() {
		var state = History.getState();

		// If the currently tracked url is the one we're already on, do nothing
		if (state.hash === this._currentUrl) {
			return;
		}

		this._currentUrl = state.hash;
		var route = this._find(state.hash);
		if (! route) {
			return this.emit('notfound', state);
		}
		route.func(route.params, route.href);
	}

});

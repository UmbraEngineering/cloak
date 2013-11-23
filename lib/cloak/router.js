
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
		var route = this._find(state.href);
		if (! route) {
			return this.emit('notfound', state);
		}
		route.func(route.params, route.href);
	}

});


var cloak     = require('cloak');
var History   = require('history');
var AppObject = require('cloak/app-object');
var _         = require('cloak/underscore');

var defaults = {
	autoStart: true,
	isTopLevel: true
};

// 
// Router class
//
var Router = module.exports = AppObject.extend({

	routes: null,
	_opts: null,
	_routes: null,
	_subRouters: null,
	_isOn: false,
	_variablePattern: /:([^\/]+)/g,
	_currentUrl: null,
	_currentRoute: null,
	_isAnchor: false,

	init: function(opts) {
		this._super();
		this._routes = [ ];
		this._opts = _.defaults(opts || { }, Router.defaults);

		if (this._opts.isTopLevel) {
			this.topLevel = this;
		}

		_.forEach(_.keys(this.routes),
			_.bind(
				function(uri) {
					this._parseRoute(uri, this.routes[uri]);
				},
			this)
		);

		this._subRouters = [ ];

		this.bind('handleAnchor');

		// Listen for history.statechange events
		this.bind('_onstatechange');
		if (History.enabled && this._opts.autoStart) {
			this.start();
		}

		// Call any given initialize method
		if (typeof this.initialize === 'function') {
			this.initialize.apply(this, arguments);
		}
	},

	// 
	// Add another router's routes to this one
	// 
	// @param {router} the router to use
	// @return this
	// 
	use: function(router) {
		// If given a router constructor, create an instance
		if (typeof router === 'function') {
			router = new router({
				autoStart: false,
				isTopLevel: false
			});
		}

		router.parent = this;
		router.topLevel = this.topLevel;
		this._subRouters.push(router);

		return this;
	},

	// 
	// Start listening for events
	// 
	// @return void
	// 
	start: function() {
		if (! this._isOn) {
			this._isOn = true;
			cloak.$win.on('statechange', this._onstatechange);

			// When we start a router, we trigger a statechange event. This shouldn't
			// cause any issues, though, as we ignore statechanges that have the same url as
			// the current one
			cloak.$win.trigger('statechange');
		}

		return this;
	},

	// 
	// Stop listening for events
	// 
	// @return void
	// 
	stop: function() {
		if (this._isOn) {
			this._isOn = false;
			cloak.$win.off('statechange', this._onstatechange);
		}

		return this;
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

	// 
	// Used to bind an anchor to the router, like this:
	// 
	//   $('a#foo').on('click', router.handleAnchor);
	// 
	// @param {evt} the click event object
	// @return void
	// 
	handleAnchor: function(evt) {
		evt.preventDefault();

		var target = evt.target;
		while (target.tagName !== 'A' && target !== document.body) {
			target = target.parentNode;
		}
		
		var href = target.getAttribute('href');
		while (href.charAt(0) === '/' || href.charAt(0) === '#') {
			href = href.slice(1);
		}
		
		this._isAnchor = true;
		this.redirectTo('/' + href);
		this._isAnchor = false;
	},

// --------------------------------------------------------

	// 
	// Parses a single route and stores the route object
	// 
	// @param {uri} the route URI string
	// @param {method} the method to be called for the route
	// @return void
	// 
	_parseRoute: function(uri, method) {
		if (typeof this[method] !== 'function') {
			throw new Error('Router: cannot bind URI "' + uri + '" to missing method "' + method + '"');
		}

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

		result.regex += (result.regex.slice(-1) === '/') ? '?' : '/?';
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
		// Make sure to cut off any query string before matching
		href = href.split('?')[0];

		// If there is a hash, remove it before matching
		href = href.replace('#', '');

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
		var data = {
			state: state,
			isAnchor: this._isAnchor
		};

		// If the currently tracked url is the one we're already on, emit an event and move on
		if (state.hash === this.topLevel._currentUrl) {
			if (this._currentRoute) {
				var params = this._currentRoute.params;
				var href = this._currentRoute.href;
			}
			this.emit('reload', params, href, data);
			return true;
		}

		if (this._opts.isTopLevel) {
			this.emit('statechange', state);
			cloak.log('State Change: ' + state.hash);
		}

		this._currentUrl = state.hash;
		this._currentRoute = this._find(state.hash);

		// Handle unrecognized routes
		if (! this._currentRoute) {
			if (! this._deferToSubRouters()) {
				this.emit('notfound', state);
				return false;
			}
			return true;
		}
		
		
		this._currentRoute.func(this._currentRoute.params, this._currentRoute.href, data);
		return true;
	},

	// 
	// Checks any listed sub-routers for a match
	// 
	// @return void
	// 
	_deferToSubRouters: function() {
		var temp = this._currentUrl;
		this._currentUrl = null;

		var sub = _.find(this._subRouters, function(subRouter) {
			return subRouter._onstatechange();
		});

		this._currentUrl = temp;

		if (sub) {
			this._currentRoute = sub._currentRoute;
		}

		return !! sub;
	}

});

// 
// Expose the default config object
// 
Router.defaults = defaults;

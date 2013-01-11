/**
 * Cloak Router Class
 *
 * For use with History.js to add routing to Cloak applications
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true */

/*global Class: true, EventEmitter2: true, _: true, Handlebars: true */

(function() {

	// Listen for history.statechange events and reemit them
	if (History.enabled) {
		$(window).on('statechange', function() {
			app.emit('history.statechange', History.getState());
		});
	}

// -------------------------------------------------------------
//  Router Class
	
	Class('Router').Extends('AppObject', {

		routes: null,

		variablePattern: /:([^\/]+)/g,

		construct: function(routes) {
			this.construct.parent(this);

			this.routes = [ ];
			
			for (var uri in routes) {
				if (routes.hasOwnProperty(uri)) {
					this.parseRoute(uri, routes[uri]);
				}
			}

			this.onstatechange = _.bind(this.onstatechange, this);
			app.on('history.statechange', this.onstatechange);
		},

		parseRoute: function(uri, func) {
			var result = {
				uri: uri,
				func: func,
				params: [ ]
			};

			result.regex = uri.replace(this.variablePattern, function(match, $1) {
				result.params.push($1);
				return '([^/]+)';
			});
			this.variablePattern.lastIndex = 0;

			result.regex = new RegExp('^' + result.regex + '$');

			this.routes.push(result);
		},

		find: function(href) {
			for (var i = 0, c = this.routes.length; i < c; i++) {
				var route = this.routes[i];
				var match = route.regex.exec(href);
				if (match) {
					return this.prepareMatch(href, route, match);
				}
			}
			
			return null;
		},

		prepareMatch: function(href, route, match) {
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

		onstatechange: function(state) {
			var route = this.find(state.href);
			if (! route) {
				return this.emit('notfound', state);
			}
			route.func.call(this, route.href, route.params);
		}

	});

}());
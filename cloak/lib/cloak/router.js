
var cloak     = require('cloak');
var History   = require('history');
var AppObject = require('cloak/app-object');
var _         = require(cloak.config.underscoreLib);

// 
// Router class
//
var Router = module.exports = AppObject.extend({

	routes: null,
	_routes: [ ],

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
		if (History.enabled) {
			this.bind('_onstatechange');
			cloak.$win.on('statechange', this._onstatechange);
		}
	},

	_parseRoute: function(uri, method) {
		this.bind(method);

		var result = {
			uri: uri,
			func: this[method],
			params: [ ]
		};

		result.regex = uri.replace(this._variablePattern, function(match, $1) {
			result.params.push($1);
			return '([^/]+)';
		});
		this.variablePattern.lastIndex = 0;

		result.regex = new RegExp('^' + result.regex + '$');

		this.routes.push(result);
	},

	_find: function(href) {
		for (var i = 0, c = this.routes.length; i < c; i++) {
			var route = this.routes[i];
			var match = route.regex.exec(href);
			if (match) {
				return this._prepareMatch(href, route, match);
			}
		}
		
		return null;
	},

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

	_onstatechange: function() {
		var state = History.getState();
		var route = this._find(state.href);
		if (! route) {
			return this.emit('notfound', state);
		}
		route.func(route.href, route.params);
	}

});


/*

var Workspace = Backbone.Router.extend({

  routes: {
	"help":                 "help",    // #help
	"search/:query":        "search",  // #search/kiwis
	"search/:query/p:page": "search"   // #search/kiwis/p7
  },

  help: function() {
	...
  },

  search: function(query, page) {
	...
  }

});

*/


module.exports = exports = function(grunt) {
	init(grunt);
};

exports.shims = [
	'src/lib/json2.js',
	'src/lib/base64.min.js',
	'src/lib/history.js',
];

exports.historyShim = [
	'/src/lib/history.html4.js',
	'/src/lib/history.adapter.jquery.js',
	'/src/lib/history.js'
];

exports._ = {
	lodash: 'src/lib/lodash.js',
	underscore: 'src/lib/underscore.js'
};
	
exports.core = [
	'src/lib/classes.js',
	'src/lib/eventemitter2.js',
	// Underscore/lodash goes here
	'src/lib/handlebars.js',
	'src/lib/jquery.js',
	'src/core.js'
];

exports.coreWith = function(underscore) {
	var files = exports.core.slice();
	files.splice(2, 0, exports._[underscore]);
	return files;
};

exports.routing = [
	'src/router.js'
];

function init(grunt) {
	
	grunt.initConfig({
	// JS Lint
		lint: {
			all: ['src/core.js', 'src/router.js']
		},
		jshint: {
			options: {
				browser: true,
				bitwise: false,
				camelcase: false,
				eqnull: true,
				latedef: false,
				plusplus: false,
				jquery: true,
				shadow: true,
				smarttabs: true,
				loopfunc: true,
				boss: true
			}
		},
	// Concat
		concat: {
			allUnderscore: {
				src: [].concat(exports.shims, exports.historyShim, exports.coreWith('underscore'), exports.routing),
				dest: 'build/cloak.all-underscore.js'
			},
			allLodash: {
				src: [].concat(exports.shims, exports.historyShim, exports.coreWith('lodash'), exports.routing),
				dest: 'build/cloak.all-lodash.js'
			},
			coreUnderscore: {
				src: [].concat(exports.coreWith('underscore')),
				dest: 'build/cloak.core-underscore.js'
			},
			coreLodash: {
				src: [].concat(exports.coreWith('lodash')),
				dest: 'build/cloak.core-lodash.js'
			},
			// This has the basic shims, but not the router class or History.js
			coreWithShimsUnderscore: {
				src: [].concat(exports.shims, exports.coreWith('underscore')),
				dest: 'build/cloak.core-shims-underscore.js'
			},
			coreWithShimsLodash: {
				src: [].concat(exports.shims, exports.coreWith('lodash')),
				dest: 'build/cloak.core-shims-lodash.js'
			},
			// This has History.js, but not the html4 support
			coreWithRouterUnderscore: {
				src: [].concat(exports.historyShim.slice(1), exports.coreWith('underscore'), exports.routing),
				dest: 'build/cloak.core-routing-underscore.js'
			},
			coreWithRouterLodash: {
				src: [].concat(exports.historyShim.slice(1), exports.coreWith('lodash'), exports.routing),
				dest: 'build/cloak.core-routing-lodash.js'
			}
		},
	// JS Min
		min: {
			allUnderscore: {
				src: 'build/cloak.all-underscore.js',
				dest: 'build/cloak.all-underscore.min.js'
			},
			allLodash: {
				src: 'build/cloak.all-lodash.js',
				dest: 'build/cloak.all-lodash.min.js'
			},
			coreUnderscore: {
				src: 'build/cloak.core-underscore.js',
				dest: 'build/cloak.core-underscore.min.js'
			},
			coreLodash: {
				src: 'build/cloak.core-lodash.js',
				dest: 'build/cloak.core-lodash.min.js'
			},
			coreWithShimsUnderscore: {
				src: 'build/cloak.core-shims-underscore.js',
				dest: 'build/cloak.core-shims-underscore.min.js'
			},
			coreWithShimsLodash: {
				src: 'build/cloak.core-shims-lodash.js',
				dest: 'build/cloak.core-shims-lodash.min.js'
			},
			coreWithRouterUnderscore: {
				src: 'build/cloak.core-routing-underscore.js',
				dest: 'build/cloak.core-routing-underscore.min.js'
			},
			coreWithRouterLodash: {
				src: 'build/cloak.core-routing-lodash.js',
				dest: 'build/cloak.core-routing-lodash.min.js'
			}
		}
	});
		
	grunt.registerTask('default', 'clean lint concat min');
	

// Clean
	grunt.registerTask('clean', function() {
		var fs    = require('fs');
		var path  = require('path');
		
		fs.unlink(relpath('build/cloak.all-underscore.js'));
		fs.unlink(relpath('build/cloak.all-lodash.js'));
		fs.unlink(relpath('build/cloak.all-underscore.min.js'));
		fs.unlink(relpath('build/cloak.all-lodash.min.js'));
		fs.unlink(relpath('build/cloak.core-underscore.js'));
		fs.unlink(relpath('build/cloak.core-lodash.js'));
		fs.unlink(relpath('build/cloak.core-underscore.min.js'));
		fs.unlink(relpath('build/cloak.core-lodash.min.js'));
		fs.unlink(relpath('build/cloak.core-shims-underscore.js'));
		fs.unlink(relpath('build/cloak.core-shims-lodash.js'));
		fs.unlink(relpath('build/cloak.core-shims-underscore.min.js'));
		fs.unlink(relpath('build/cloak.core-shims-lodash.min.js'));
		fs.unlink(relpath('build/cloak.core-routing-underscore.js'));
		fs.unlink(relpath('build/cloak.core-routing-lodash.js'));
		fs.unlink(relpath('build/cloak.core-routing-underscore.min.js'));
		fs.unlink(relpath('build/cloak.core-routing-lodash.min.js'));
		
		function relpath(file) {
			return path.join(__dirname, file);
		}
	});
		
}


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
	
exports.core = [
	'src/lib/classes.js',
	'src/lib/eventemitter2.js',
	'src/lib/lodash.js',
	'src/lib/handlebars.js',
	'src/lib/jquery.js',
	'src/core.js'
];

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
			all: {
				src: [].concat(exports.shims, exports.historyShim, exports.core, exports.routing),
				dest: 'build/cloak.all.js'
			},
			core: {
				src: [].concat(exports.core),
				dest: 'build/cloak.core.js'
			},
			// This has the basic shims, but not the router class or History.js
			coreWithShims: {
				src: [].concat(exports.shims, exports.core),
				dest: 'build/cloak.core-shims.js'
			},
			// This has History.js, but not the html4 support
			coreWithRouter: {
				src: [].concat(exports.historyShim.slice(1), exports.core, exports.routing),
				dest: 'build/cloak.core-routing.js'
			}
		},
	// JS Min
		min: {
			all: {
				src: 'build/cloak.all.js',
				dest: 'build/cloak.all.min.js'
			},
			core: {
				src: 'build/cloak.core.js',
				dest: 'build/cloak.core.min.js'
			},
			coreWithShims: {
				src: 'build/cloak.core-shims.js',
				dest: 'build/cloak.core-shims.min.js'
			},
			coreWithRouter: {
				src: 'build/cloak.core-routing.js',
				dest: 'build/cloak.core-routing.min.js'
			}
		}
	});
		
	grunt.registerTask('default', 'clean lint concat min');
	

// Clean
	grunt.registerTask('clean', function() {
		var fs    = require('fs');
		var path  = require('path');
		
		fs.unlink(relpath('build/cloak.all.js'));
		fs.unlink(relpath('build/cloak.all.min.js'));
		fs.unlink(relpath('build/cloak.core.js'));
		fs.unlink(relpath('build/cloak.core.min.js'));
		fs.unlink(relpath('build/cloak.core-shims.js'));
		fs.unlink(relpath('build/cloak.core-shims.min.js'));
		fs.unlink(relpath('build/cloak.core-routing.js'));
		fs.unlink(relpath('build/cloak.core-routing.min.js'));
		
		function relpath(file) {
			return path.join(__dirname, file);
		}
	});
		
}

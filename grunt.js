
module.exports = exports = function(grunt) {
	init(grunt);
};
	
exports.javascripts = [
	'src/lib/json2.js',
	'src/lib/base64.min.js',
	'src/lib/classes.js',
	'src/lib/eventemitter2.js',
	'src/lib/lodash.js',
	'src/lib/handlebars.js',
	'src/lib/jquery.js',
	'src/core.js'
];

function init(grunt) {
	
	grunt.initConfig({
	// JS Lint
		lint: {
			all: ['src/core.js']
		},
		jshint: {
			options: {
				browser: true
			}
		},
	// Concat
		concat: {
			all: {
				src: exports.javascripts,
				dest: 'build/all.js'
			},
			core: {
				src: exports.javascripts.slice(2),
				dest: 'build/core.js'
			}
		},
	// JS Min
		min: {
			all: {
				src: 'build/all.js',
				dest: 'build/all.min.js'
			},
			core: {
				src: 'build/core.js',
				dest: 'build/core.min.js'
			}
		}
	});
		
	grunt.registerTask('default', 'clean lint concat min');
	

// Clean
	grunt.registerTask('clean', function() {
		var fs    = require('fs');
		var path  = require('path');
		
		fs.unlink(relpath('build/all.js'));
		fs.unlink(relpath('build/all.min.js'));
		fs.unlink(relpath('build/core.js'));
		fs.unlink(relpath('build/core.min.js'));
		
		function relpath(file) {
			return path.join(__dirname, file);
		}
	});
		
}

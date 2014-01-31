

var fs        = require('fs');
var commonjs  = require('common.js');

var libPath = './lib';
var testPath = './tests/compiled';
var buildPath = './build';

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-karma');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		jshint: {
			files: [
				libPath + '/cloak/app-object.js',
				libPath + '/cloak/class.js',
				libPath + '/cloak/collection-async.js',
				libPath + '/cloak/collection.js',
				libPath + '/cloak/index.js',
				libPath + '/cloak/local-storage.js',
				libPath + '/cloak/model.js',
				libPath + '/cloak/router.js',
				libPath + '/cloak/view.js',
				libPath + '/cloak/xhr.js'
			],
			options: {
				sub: true,
				browser: true,
				bitwise: false,
				camelcase: false,
				eqnull: true,
				latedef: false,
				plusplus: false,
				shadow: true,
				smarttabs: true,
				loopfunc: true,
				boss: true,
				globals: {
					console: true,
					module: true,
					exports: true,
					require: true
				}
			}
		},
		
		commonjs: {
			test: {
				src: libPath,
				dest: testPath
			},
			build: {
				src: libPath,
				dest: buildPath
			}
		},
		
		// concat: {
		// 	lib: {
		// 		src: [buildPath + '/js/lib/**/*.js'],
		// 		dest: buildPath + '/js/lib.js'
		// 	}
		// },

		karma: {
			options: {
				configFile: 'karma.conf.js',
				singleRun: true,
				browsers: ['PhantomJS'],
				reporters: 'dots'
			},
			continuous: {
				colors: false,
				logLevel: 'WARN'
			},
			unit: { }
		}

	});

// --------------------------------------------------------

	grunt.registerMultiTask('commonjs', 'Compiles the JavaScript in CommonJS format', function() {
		var data = this.data;
		var done = this.async();
		var opts = {
			output: 2,
			src: data.src,
			dest: data.dest,
			keepFiles: data.keepFiles
		};
		commonjs.build(opts, function() {
			commonjs.outputClientTo(data.dest + '/common.js', done);
		});
	});

// --------------------------------------------------------

	grunt.registerTask('default', ['jshint', 'commonjs:test', 'karma:continuous']);//, 'concat']);

};

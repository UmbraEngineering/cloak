
var commonjs = require('common.js');

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-concat');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		commonjs: {
			all: {
				src: __dirname + '/javascripts',
				dest: __dirname + '/js'
			}
		},
		concat: {
			lib: {
				src: ['js/lib/**/*.js'],
				dest: 'js/lib.js'
			},
			app: {
				src: ['js/models/**/*.js', 'js/views/**/*.js'],
				dest: 'js/app.js'
			}
		}
	});

// --------------------------------------------------------

	grunt.registerMultiTask('commonjs', 'Compiles the JavaScript in CommonJS format', function() {
		var data = this.data;
		var done = this.async();
		var opts = {
			output: 2,
			src: data.src,
			dest: data.dest
		};
		commonjs.build(opts, function() {
			commonjs.outputClientTo(data.dest + '/common.js', done);
		});
	});

// --------------------------------------------------------

	grunt.registerTask('default', ['copy', 'commonjs', 'concat:lib', 'concat:app']);

};

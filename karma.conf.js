
module.exports = function(config) {
	config.set({
		frameworks: ['jasmine'],
		files: [
			'tests/compiled/common.js',
			'tests/compiled/**/*.js',
			'tests/specs/**/*.js'
		],
		included: false,
		autoWatch: true
	});
};

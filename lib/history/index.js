
// 
// This wrapper module is to make sure that History.js loads correctly
// as a CommonJS module
// 

window.jQuery = require('jquery');

require('./history');
require('./adapter.jquery');
require('./html4');

try {
	window.jQuery = void(0);
	delete window.jQuery;
} catch (e) { }

// Export it for easier CommonJS use, even though it defines globaly
module.exports = History;

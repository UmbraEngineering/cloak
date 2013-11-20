
var Item   = require('./item');
var Model  = require('cloak/model');

var Foo = Model.extend({
	
	attributes: {
		items: Item.Collection.$unique
	}

});

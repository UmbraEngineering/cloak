
var Item   = require('./item');
var Model  = require('cloak/model');

var Foo = Model.extend({

	url: '/foos{/#}',
	
	attributes: {
		items: Item.Collection.$unique
	}

});

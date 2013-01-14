
Class('User').Extends('Model', {

	url: '/api/v1/user/{@.id}',

	attributes: {
		username: null,
		firstName: null,
		lastName: null,
		group: null
	},

	initialize: function() {
		// 
	},

	fromXhr: function(data, callback) {
		this.fromXhr.parentApply(this);

		this.attributes.group = new app.Group({
			id: this.attributes.group.id
		});

		this.attributes.group.get()
			.on('ready', callback);
	}

});

Class('Group').Extends('Model', {

	url: '/api/v1/group/{@.id}',

	attributes: {
		name: null
	},

	initialize: function(data) {
		_.extend(this.attributes, data);
	}

});

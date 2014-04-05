
// 
// Underscore/lodash wrapper and extensions
// 

var _;
var underscoreLib;

// Load either underscore or lodash, whichever is available
if (require.resolve('underscore')) {
	_ = require(underscoreLib = 'underscore');
} else if (require.resolve('lodash')) {
	_ = require(underscoreLib = 'lodash');
} else {
	throw new Error('Either underscore or lodash is required to use cloak.js');
}

// Export
module.exports = _;

// --------------------------------------------------------

// 
// Extend with new functionality
// 

_.mixin({

	// 
	// Like Node's process.nextTick, with the added advantage of allowing scope binding
	// 
	nextTick: function(scope, func) {
		if (arguments.length === 1) {
			func = scope;
			scope = null;
		}

		setTimeout(function() {
			func.call(scope);
		}, 0);
	},

	// 
	// _.pick, except this excepts an array of keys
	// 
	pickArray: function(obj, keys) {
		return _.pick.apply([obj].concat(keys));
	},
	
	// 
	// Allows filtering an array in place
	// 
	filterInPlace: function(arr, func, scope) {
		scope = scope || null;
		for (var i = 0; i < arr.length; i++) {
			if (! func.call(scope, arr[i], i, arr)) {
				arr.splice(i--, 1, 0);
			}
		}
		return arr;
	},

	// 
	// The oposite of filterInPlace above
	// 
	rejectInPlace: function(arr, func, scope) {
		scope = scope || null;
		for (var i = 0; i < arr.length; i++) {
			if (func.call(scope, arr[i], i, arr)) {
				arr.splice(i--, 1, 0);
			}
		}
		return arr;
	},

	// 
	// Filter out all duplicate from the given array in place
	// 
	uniqueInPlace: function(arr, isSorted, mutator) {
		if (typeof isSorted === 'function') {
			mutator = isSorted, isSorted = false;
		}

		if (typeof mutator !== 'function') {
			mutator = _.identity;
		}

		var count;
		var current;
		var compareTo;

		// If the array is sorted, use the faster algorithm
		if (isSorted) {
			for (var i = 0; i < arr.length; i++) {
				count = 0;
				current = mutator(arr[i]);
				do {
					compareTo = mutator(arr[ i + count + 1 ]);
				}
				// Keep moving until we are out of duplicates
				while(compareTo === current && ++count);
				// If there are duplicates, remove them
				if (count) {
					arr.splice(i + 1, count);
					count = 0;
				}
			}
		}

		// Otherwise, we have to use the slower algorithm
		else {
			var mutators = [ ];
			for (var i = 0; i < arr.length; i++) {
				current = mutators[i] = mutators[i] || mutator(arr[i]);
				// Iterate through the rest of array looking for duplicates
				for (var j = i + 1; j < arr.length; j++) {
					compareTo = mutators[j] = mutators[j] || mutator(arr[j]);
					if (current === compareTo) {
						arr.splice(j, 1);
						mutators.splice(j--, 1);
					}
				}
			}
			mutators = null;
		}

		return arr;
	},

	// 
	// Allows mapping an array of values using a method on the values
	// 
	mapTo: function(arr, method) {
		var args = Array.prototype.slice.call(arguments, 2);
		return _.map(arr, function(value) {
			return value[method].apply(value, args);
		});
	},

	// 
	// A filter in place that returns the filtered out elements, creating two distinct arrays
	// 
	extract: function(arr, func, scope) {
		var result = [ ];
		scope = scope || null;
		for (var i = 0; i < arr.length; i++) {
			if (! func.call(scope, arr[i], i, arr)) {
				result.push(arr.splice(i--, 1, 0)[0]);
			}
		}
		return result;
	}

});

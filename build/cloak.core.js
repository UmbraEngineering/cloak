/**
 * A simple JavaScript class system
 *
 * @author     James Brumond
 * @version    0.2.2
 * @copyright  Copyright 2012 James Brumond
 * @license    Dual licensed under MIT and GPL
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true */

(function() {
	var _global = this;
	var namespace = _global;

	// The class constructor
	var createClass = function(name, parent, mixins, constructor) {
		
		// If an array was given for a name, we only want the
		// actual name value
		if (typeof name === 'object' && name) {
			name = name[1] || false;
			if (! name) {
				throw new TypeError('Invalid class name value');
			}
		}

		// Default the parent to the global Object
		if (! parent) {
			parent = Object;
		}

		// The actual constructor function
		var self = function() {
			var inst = this;
			if (! inst instanceof self) {
				throw new Error('Classes should be invoked with the new keyword.');
			}
			// Set the scope for super
			inst.__scope__ = self.prototype.__scope__;
			// This allows .apply() type expansion with constructor calls
			var _args = arguments[0];
			if (! (_args && _args.__shouldExpand__)) {
				_args = arguments;
			}
			// If a function was given as the constructor, it should
			// be called every time a new instance is created
			if (typeof constructor === 'function') {
				constructor.apply(inst, _args);
			}
			// If a construct() method exists, it should also be called
			if (typeof inst.construct === 'function') {
				inst.construct.apply(inst, _args);
			}
		};
		
		// Fetch the parent if a string is given
		if (typeof parent === 'string') {
			parent = namespace[parent];
		}
		
		// Inherit from the parent if one was given (inheritence model
		// based roughly on CoffeeScript classes)
		var _super = parent.prototype;
		for (var i in parent) {
			if (parent.hasOwnProperty(i)) {
				self[i] = parent[i];
			}
		}
		var ctor = function() {
			this._super = _super;
			this.constructor = self;
		};
		ctor.prototype = _super;
		self.prototype = new ctor();
		
		// Inherit from mixins
		if (mixins) {
			for (var j = 0, c = mixins.length; j < c; j++) {
				if (typeof mixins[j] === 'string') {
					mixins[j] = namespace[mixins[j]];
				}
				mixins[j].mixinTo(self);
			}
		}
		
		// The class/parent name
		self.prototype.__class__ = self.__class__ = name;
		self.prototype.__parent__ = self.__parent__ = parent.__class__ || getNativeClassName(parent);
		self.prototype.__mixins__ = self.__mixins__ = mixins;
		
		// Expose the parent
		self.parent = parent;
		self.prototype.__scope__ = self;

		// If an object was given as the constructor, the properties
		// should be placed on the prototype
		if (typeof constructor === 'object') {
			for (var k in constructor) {
				self.prototype[k] = constructor[k];
				// Build a parent method on all class methods that will allow
				// calling supers with this.method.parent(this, ...)
				if (isFunc(self.prototype[k])) {
					(function(method) {
						self.prototype[method].parent = function(that) {
							var scope = that.__scope__;
							if (! scope) {
								throw new Error('Could not determine super scope. Did you forget to ' +
									'pass `this` to `.parent`?');
							}
							var args = slice(arguments, 1);
							that.__scope__ = that.__scope__.parent;
							var result = scope.parent.prototype[method].apply(that, args);
							that.__scope__ = scope;
							return result;
						};
						self.prototype[method].parentApply = function(that, args) {
							args = slice(args);
							args.unshift(that);
							return self.prototype[method].parent.apply(that, args);
						};
					}(k));
				}
			}
		}

	// ----------------------------------------------------------------------------
	//  Create the external functions
		
		/**
		 * Extend the current class
		 *
		 * @access  public
		 * @param   string    the class name
		 * @param   function  the constructor function
		 * @return  void
		 */
		self.extend = function(name, constructor) {
			Class(name, self, constructor);
		};

		/**
		 * Create a new instance of the class
		 *
		 * @access  public
		 * @return  object
		 */
		self.create = function() {
			var args = slice(arguments);
			args.__shouldExpand__ = true;
			return new self(args);
		};
		
		/**
		 * A toString method that identifies this as a class
		 */
		self.toString = function() {
			return '[object Class]';
		};
		
		return self;
	};

// ----------------------------------------------------------------------------
//  Used for the extends() and uses() syntax
	
	var TempClass = function(name) {
		this.parent = null;
		this.mixins = [ ];
		this.Uses = function(mixins, constructor) {
			this.mixins.push.apply(this.mixins, mixins);
			if (constructor) {
				return assignTo(name,
					createClass(name, this.parent, this.mixins, constructor)
				);
			}
			return this;
		};
		this.Extends = function(parent, constructor) {
			this.parent = parent;
			if (constructor) {
				return assignTo(name,
					createClass(name, this.parent, this.mixins, constructor)
				);
			}
			return this;
		};
		// For backwards-compat
		this['extends'] = this.Extends;
	};

// ----------------------------------------------------------------------------
//  Main Functions
	
	function Class(name, parent, constructor) {
		if (arguments.length <= 1) {
			if (name && (typeof name === 'object' || isFunc(name)) && ! isArray(name)) {
				return createClass(null, null, [ ], name);
			}
			return new TempClass(name);
		} else if (arguments.length === 2) {
			return assignTo(name,
				createClass(name, null, [ ], parent)
			);
		}
		return assignTo(name,
			createClass(name, parent, [ ], constructor)
		);
	}
	
	Class.mixin = function(name, constructor) {
		if (arguments.length === 1) {
			constructor = name;
			name = null;
		}
		return assignTo(name, new Mixin(constructor));
	};
	
	Class.namespace = function(ns) {
		namespace = ns ? ns : _global;
	};

	Class.isClass = function(value) {
		return isClass(value);
	};
	
	function Mixin(constructor) {
		this.mixinTo = function(func) {
			for (var i in constructor) {
				if (constructor.hasOwnProperty(i)) {
					func.prototype[i] = constructor[i];
				}
			}
		};
	}

// ----------------------------------------------------------------------------
//  Helper functions
	
	var toString = Object.prototype.toString;
	
	function isFunc(value) {
		return (toString.call(value) === '[object Function]');
	}

	function isArray(value) {
		return (toString.call(value) === '[object Array]');
	}

	function isClass(value) {
		return (typeof value === 'function' && value.toString() === '[object Class]');
	}

	function slice(value, index) {
		return Array.prototype.slice.call(value, index);
	}
	
	function assignTo(name, constructor) {
		if (! name) {
			return constructor;
		} else if (typeof name === 'object' && name.length === 2) {
			name[0][name[1]] = constructor;
		} else if (typeof name === 'string') {
			namespace[name] = constructor;
		} else {
			throw new TypeError('Invalid class/mixin name value');
		}
	}
	
	function getNativeClassName(constructor) {
		return toString.call(new constructor()).slice(8, -1);
	}
	
// ------------------------------------------------------------------
//  Expose
	
	try {
		module.exports.Class = Class;
	} catch (e) {
		_global.Class = Class;
	}
	
}).call();
;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = new Object;
  }

  function configure(conf) {
    if (conf) {
      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      if (this.wildcard) {
        this.listenerTree = new Object;
      }
    }
  }

  function EventEmitter(conf) {
    this._events = new Object;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }
    
    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }
        
        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    
    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = new Object;
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;
            
            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  };

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    };

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {
    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener') {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      
      if (!this._all && 
        !this._events.error && 
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {
    
    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;
        
        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if(!this._all) {
      this._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          return this;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1)
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define(function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter; 
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);

/*!
 * Lo-Dash v0.8.2 <http://lodash.com>
 * (c) 2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Underscore.js 1.4.2 <http://underscorejs.org>
 * (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 * Available under MIT license <http://lodash.com/license>
 */
;(function(window, undefined) {
  'use strict';

  /** Detect free variable `exports` */
  var freeExports = typeof exports == 'object' && exports &&
    (typeof global == 'object' && global && global == global.global && (window = global), exports);

  /** Native prototype shortcuts */
  var ArrayProto = Array.prototype,
      BoolProto = Boolean.prototype,
      ObjectProto = Object.prototype,
      NumberProto = Number.prototype,
      StringProto = String.prototype;

  /** Used to generate unique IDs */
  var idCounter = 0;

  /** Used by `cachedContains` as the default size when optimizations are enabled for large arrays */
  var largeArraySize = 30;

  /** Used to restore the original `_` reference in `noConflict` */
  var oldDash = window._;

  /** Used to detect delimiter values that should be processed by `tokenizeEvaluate` */
  var reComplexDelimiter = /[-?+=!~*%&^<>|{(\/]|\[\D|\b(?:delete|in|instanceof|new|typeof|void)\b/;

  /** Used to match HTML entities */
  var reEscapedHtml = /&(?:amp|lt|gt|quot|#x27);/g;

  /** Used to match empty string literals in compiled template source */
  var reEmptyStringLeading = /\b__p \+= '';/g,
      reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
      reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

  /** Used to match regexp flags from their coerced string values */
  var reFlags = /\w*$/;

  /** Used to insert the data object variable into compiled template source */
  var reInsertVariable = /(?:__e|__t = )\(\s*(?![\d\s"']|this\.)/g;

  /** Used to detect if a method is native */
  var reNative = RegExp('^' +
    (ObjectProto.valueOf + '')
      .replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&')
      .replace(/valueOf|for [^\]]+/g, '.+?') + '$'
  );

  /** Used to ensure capturing order and avoid matches for undefined delimiters */
  var reNoMatch = /($^)/;

  /** Used to match HTML characters */
  var reUnescapedHtml = /[&<>"']/g;

  /** Used to match unescaped characters in compiled string literals */
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

  /** Used to fix the JScript [[DontEnum]] bug */
  var shadowed = [
    'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    'toLocaleString', 'toString', 'valueOf'
  ];

  /** Used to make template sourceURLs easier to identify */
  var templateCounter = 0;

  /** Native method shortcuts */
  var ceil = Math.ceil,
      concat = ArrayProto.concat,
      floor = Math.floor,
      getPrototypeOf = reNative.test(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf,
      hasOwnProperty = ObjectProto.hasOwnProperty,
      push = ArrayProto.push,
      propertyIsEnumerable = ObjectProto.propertyIsEnumerable,
      slice = ArrayProto.slice,
      toString = ObjectProto.toString;

  /* Native method shortcuts for methods with the same name as other `lodash` methods */
  var nativeBind = reNative.test(nativeBind = slice.bind) && nativeBind,
      nativeIsArray = reNative.test(nativeIsArray = Array.isArray) && nativeIsArray,
      nativeIsFinite = window.isFinite,
      nativeKeys = reNative.test(nativeKeys = Object.keys) && nativeKeys,
      nativeMax = Math.max,
      nativeMin = Math.min,
      nativeRandom = Math.random;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

  /** Timer shortcuts */
  var clearTimeout = window.clearTimeout,
      setTimeout = window.setTimeout;

  /**
   * Detect the JScript [[DontEnum]] bug:
   *
   * In IE < 9 an objects own properties, shadowing non-enumerable ones, are
   * made non-enumerable as well.
   */
  var hasDontEnumBug;

  /**
   * Detect if `Array#shift` and `Array#splice` augment array-like objects
   * incorrectly:
   *
   * Firefox < 10, IE compatibility mode, and IE < 9 have buggy Array `shift()`
   * and `splice()` functions that fail to remove the last element, `value[0]`,
   * of array-like objects even though the `length` property is set to `0`.
   * The `shift()` method is buggy in IE 8 compatibility mode, while `splice()`
   * is buggy regardless of mode in IE < 9 and buggy in compatibility mode in IE 9.
   */
  var hasObjectSpliceBug;

  /** Detect if own properties are iterated after inherited properties (IE < 9) */
  var iteratesOwnLast;

  /** Detect if an `arguments` object's indexes are non-enumerable (IE < 9) */
  var noArgsEnum = true;

  (function() {
    var object = { '0': 1, 'length': 1 },
        props = [];

    function ctor() { this.x = 1; }
    ctor.prototype = { 'valueOf': 1, 'y': 1 };
    for (var prop in new ctor) { props.push(prop); }
    for (prop in arguments) { noArgsEnum = !prop; }

    hasDontEnumBug = (props + '').length < 4;
    iteratesOwnLast = props[0] != 'x';
    hasObjectSpliceBug = (props.splice.call(object, 0, 1), object[0]);
  }(1));

  /** Detect if an `arguments` object's [[Class]] is unresolvable (Firefox < 4, IE < 9) */
  var noArgsClass = !isArguments(arguments);

  /** Detect if `Array#slice` cannot be used to convert strings to arrays (Opera < 10.52) */
  var noArraySliceOnStrings = slice.call('x')[0] != 'x';

  /**
   * Detect lack of support for accessing string characters by index:
   *
   * IE < 8 can't access characters by index and IE 8 can only access
   * characters by index on string literals.
   */
  var noCharByIndex = ('x'[0] + Object('x')[0]) != 'xx';

  /**
   * Detect if a node's [[Class]] is unresolvable (IE < 9)
   * and that the JS engine won't error when attempting to coerce an object to
   * a string without a `toString` property value of `typeof` "function".
   */
  try {
    var noNodeClass = ({ 'toString': 0 } + '', toString.call(window.document || 0) == objectClass);
  } catch(e) { }

  /* Detect if `Function#bind` exists and is inferred to be fast (all but V8) */
  var isBindFast = nativeBind && /\n|Opera/.test(nativeBind + toString.call(window.opera));

  /* Detect if `Object.keys` exists and is inferred to be fast (IE, Opera, V8) */
  var isKeysFast = nativeKeys && /^.+$|true/.test(nativeKeys + !!window.attachEvent);

  /* Detect if strict mode, "use strict", is inferred to be fast (V8) */
  var isStrictFast = !isBindFast;

  /**
   * Detect if sourceURL syntax is usable without erroring:
   *
   * The JS engine in Adobe products, like InDesign, will throw a syntax error
   * when it encounters a single line comment beginning with the `@` symbol.
   *
   * The JS engine in Narwhal will generate the function `function anonymous(){//}`
   * and throw a syntax error.
   *
   * Avoid comments beginning `@` symbols in IE because they are part of its
   * non-standard conditional compilation support.
   * http://msdn.microsoft.com/en-us/library/121hztk3(v=vs.94).aspx
   */
  try {
    var useSourceURL = (Function('//@')(), !window.attachEvent);
  } catch(e) { }

  /** Used to identify object classifications that are array-like */
  var arrayLikeClasses = {};
  arrayLikeClasses[boolClass] = arrayLikeClasses[dateClass] = arrayLikeClasses[funcClass] =
  arrayLikeClasses[numberClass] = arrayLikeClasses[objectClass] = arrayLikeClasses[regexpClass] = false;
  arrayLikeClasses[argsClass] = arrayLikeClasses[arrayClass] = arrayLikeClasses[stringClass] = true;

  /** Used to identify object classifications that `_.clone` supports */
  var cloneableClasses = {};
  cloneableClasses[argsClass] = cloneableClasses[funcClass] = false;
  cloneableClasses[arrayClass] = cloneableClasses[boolClass] = cloneableClasses[dateClass] =
  cloneableClasses[numberClass] = cloneableClasses[objectClass] = cloneableClasses[regexpClass] =
  cloneableClasses[stringClass] = true;

  /** Used to determine if values are of the language type Object */
  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false,
    'unknown': true
  };

  /** Used to escape characters for inclusion in compiled string literals */
  var stringEscapes = {
    '\\': '\\',
    "'": "'",
    '\n': 'n',
    '\r': 'r',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The `lodash` function.
   *
   * @name _
   * @constructor
   * @category Chaining
   * @param {Mixed} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns a `lodash` instance.
   */
  function lodash(value) {
    // exit early if already wrapped
    if (value && value.__wrapped__) {
      return value;
    }
    // allow invoking `lodash` without the `new` operator
    if (!(this instanceof lodash)) {
      return new lodash(value);
    }
    this.__wrapped__ = value;
  }

  /**
   * By default, the template delimiters used by Lo-Dash are similar to those in
   * embedded Ruby (ERB). Change the following template settings to use alternative
   * delimiters.
   *
   * @static
   * @memberOf _
   * @type Object
   */
  lodash.templateSettings = {

    /**
     * Used to detect `data` property values to be HTML-escaped.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'escape': /<%-([\s\S]+?)%>/g,

    /**
     * Used to detect code to be evaluated.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'evaluate': /<%([\s\S]+?)%>/g,

    /**
     * Used to detect `data` property values to inject.
     *
     * @static
     * @memberOf _.templateSettings
     * @type RegExp
     */
    'interpolate': /<%=([\s\S]+?)%>/g,

    /**
     * Used to reference the data object in the template text.
     *
     * @static
     * @memberOf _.templateSettings
     * @type String
     */
    'variable': ''
  };

  /*--------------------------------------------------------------------------*/

  /**
   * The template used to create iterator functions.
   *
   * @private
   * @param {Obect} data The data object used to populate the text.
   * @returns {String} Returns the interpolated text.
   */
  var iteratorTemplate = template(
    // conditional strict mode
    '<% if (useStrict) { %>\'use strict\';\n<% } %>' +

    // the `iteratee` may be reassigned by the `top` snippet
    'var index, value, iteratee = <%= firstArg %>, ' +
    // assign the `result` variable an initial value
    'result = <%= init || firstArg %>;\n' +
    // exit early if the first argument is falsey
    'if (!<%= firstArg %>) return result;\n' +
    // add code before the iteration branches
    '<%= top %>;\n' +

    // the following branch is for iterating arrays and array-like objects
    '<% if (arrayBranch) { %>' +
    'var length = iteratee.length; index = -1;' +
    '  <% if (objectBranch) { %>\nif (length === +length) {<% } %>' +

    // add support for accessing string characters by index if needed
    '  <% if (noCharByIndex) { %>\n' +
    '  if (toString.call(iteratee) == stringClass) {\n' +
    '    iteratee = iteratee.split(\'\')\n' +
    '  }' +
    '  <% } %>\n' +

    '  <%= arrayBranch.beforeLoop %>;\n' +
    '  while (++index < length) {\n' +
    '    value = iteratee[index];\n' +
    '    <%= arrayBranch.inLoop %>\n' +
    '  }' +
    '  <% if (objectBranch) { %>\n}<% } %>' +
    '<% } %>' +

    // the following branch is for iterating an object's own/inherited properties
    '<% if (objectBranch) { %>' +
    '  <% if (arrayBranch) { %>\nelse {' +

    // add support for iterating over `arguments` objects if needed
    '  <%  } else if (noArgsEnum) { %>\n' +
    '  var length = iteratee.length; index = -1;\n' +
    '  if (length && isArguments(iteratee)) {\n' +
    '    while (++index < length) {\n' +
    '      value = iteratee[index += \'\'];\n' +
    '      <%= objectBranch.inLoop %>\n' +
    '    }\n' +
    '  } else {' +
    '  <% } %>' +

    // Firefox < 3.6, Opera > 9.50 - Opera < 11.60, and Safari < 5.1
    // (if the prototype or a property on the prototype has been set)
    // incorrectly sets a function's `prototype` property [[Enumerable]]
    // value to `true`. Because of this Lo-Dash standardizes on skipping
    // the the `prototype` property of functions regardless of its
    // [[Enumerable]] value.
    '  <% if (!hasDontEnumBug) { %>\n' +
    '  var skipProto = typeof iteratee == \'function\' && \n' +
    '    propertyIsEnumerable.call(iteratee, \'prototype\');\n' +
    '  <% } %>' +

    // iterate own properties using `Object.keys` if it's fast
    '  <% if (isKeysFast && useHas) { %>\n' +
    '  var ownIndex = -1,\n' +
    '      ownProps = objectTypes[typeof iteratee] ? nativeKeys(iteratee) : [],\n' +
    '      length = ownProps.length;\n\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  while (++ownIndex < length) {\n' +
    '    index = ownProps[ownIndex];\n' +
    '    <% if (!hasDontEnumBug) { %>if (!(skipProto && index == \'prototype\')) {\n  <% } %>' +
    '    value = iteratee[index];\n' +
    '    <%= objectBranch.inLoop %>\n' +
    '    <% if (!hasDontEnumBug) { %>}\n<% } %>' +
    '  }' +

    // else using a for-in loop
    '  <% } else { %>\n' +
    '  <%= objectBranch.beforeLoop %>;\n' +
    '  for (index in iteratee) {<%' +
    '    if (!hasDontEnumBug || useHas) { %>\n    if (<%' +
    '      if (!hasDontEnumBug) { %>!(skipProto && index == \'prototype\')<% }' +
    '      if (!hasDontEnumBug && useHas) { %> && <% }' +
    '      if (useHas) { %>hasOwnProperty.call(iteratee, index)<% }' +
    '    %>) {' +
    '    <% } %>\n' +
    '    value = iteratee[index];\n' +
    '    <%= objectBranch.inLoop %>;' +
    '    <% if (!hasDontEnumBug || useHas) { %>\n    }<% } %>\n' +
    '  }' +
    '  <% } %>' +

    // Because IE < 9 can't set the `[[Enumerable]]` attribute of an
    // existing property and the `constructor` property of a prototype
    // defaults to non-enumerable, Lo-Dash skips the `constructor`
    // property when it infers it's iterating over a `prototype` object.
    '  <% if (hasDontEnumBug) { %>\n\n' +
    '  var ctor = iteratee.constructor;\n' +
    '    <% for (var k = 0; k < 7; k++) { %>\n' +
    '  index = \'<%= shadowed[k] %>\';\n' +
    '  if (<%' +
    '      if (shadowed[k] == \'constructor\') {' +
    '        %>!(ctor && ctor.prototype === iteratee) && <%' +
    '      } %>hasOwnProperty.call(iteratee, index)) {\n' +
    '    value = iteratee[index];\n' +
    '    <%= objectBranch.inLoop %>\n' +
    '  }' +
    '    <% } %>' +
    '  <% } %>' +
    '  <% if (arrayBranch || noArgsEnum) { %>\n}<% } %>' +
    '<% } %>\n' +

    // add code to the bottom of the iteration function
    '<%= bottom %>;\n' +
    // finally, return the `result`
    'return result'
  );

  /**
   * Reusable iterator options shared by
   * `countBy`, `every`, `filter`, `find`, `forEach`, `forIn`, `forOwn`, `groupBy`,
   * `map`, `reject`, `some`, and `sortBy`.
   */
  var baseIteratorOptions = {
    'args': 'collection, callback, thisArg',
    'top': 'callback = createCallback(callback, thisArg)',
    'inLoop': 'if (callback(value, index, collection) === false) return result'
  };

  /** Reusable iterator options for `countBy`, `groupBy`, and `sortBy` */
  var countByIteratorOptions = {
    'init': '{}',
    'top': 'callback = createCallback(callback, thisArg)',
    'inLoop':
      'var prop = callback(value, index, collection);\n' +
      '(hasOwnProperty.call(result, prop) ? result[prop]++ : result[prop] = 1)'
  };

  /** Reusable iterator options for `every` and `some` */
  var everyIteratorOptions = {
    'init': 'true',
    'inLoop': 'if (!callback(value, index, collection)) return !result'
  };

  /** Reusable iterator options for `defaults` and `extend` */
  var extendIteratorOptions = {
    'useHas': false,
    'useStrict': false,
    'args': 'object',
    'top':
      'for (var argsIndex = 1, argsLength = arguments.length; argsIndex < argsLength; argsIndex++) {\n' +
      '  if (iteratee = arguments[argsIndex]) {',
    'inLoop': 'result[index] = value',
    'bottom': '  }\n}'
  };

  /** Reusable iterator options for `filter`, `reject`, and `where` */
  var filterIteratorOptions = {
    'init': '[]',
    'inLoop': 'callback(value, index, collection) && result.push(value)'
  };

  /** Reusable iterator options for `find`, `forEach`, `forIn`, and `forOwn` */
  var forEachIteratorOptions = {
    'top': 'callback = createCallback(callback, thisArg)'
  };

  /** Reusable iterator options for `forIn` and `forOwn` */
  var forOwnIteratorOptions = {
    'inLoop': {
      'object': baseIteratorOptions.inLoop
    }
  };

  /** Reusable iterator options for `invoke`, `map`, `pluck`, and `sortBy` */
  var mapIteratorOptions = {
    'init': 'collection || []',
    'beforeLoop': {
      'array':  'result = Array(length)',
      'object': 'result = ' + (isKeysFast ? 'Array(length)' : '[]')
    },
    'inLoop': {
      'array':  'result[index] = callback(value, index, collection)',
      'object': 'result' + (isKeysFast ? '[ownIndex] = ' : '.push') + '(callback(value, index, collection))'
    }
  };

  /** Reusable iterator options for `omit` and `pick` */
  var omitIteratorOptions = {
    'useHas': false,
    'args': 'object, callback, thisArg',
    'init': '{}',
    'top':
      'var isFunc = typeof callback == \'function\';\n' +
      'if (isFunc) callback = createCallback(callback, thisArg);\n' +
      'else var props = concat.apply(ArrayProto, arguments)',
    'inLoop':
      'if (isFunc\n' +
      '  ? !callback(value, index, object)\n' +
      '  : indexOf(props, index) < 0\n' +
      ') result[index] = value'
  };

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a function optimized for searching large arrays for a given `value`,
   * starting at `fromIndex`, using strict equality for comparisons, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} [fromIndex=0] The index to start searching from.
   * @param {Number} [largeSize=30] The length at which an array is considered large.
   * @returns {Boolean} Returns `true` if `value` is found, else `false`.
   */
  function cachedContains(array, fromIndex, largeSize) {
    fromIndex || (fromIndex = 0);

    var length = array.length,
        isLarge = (length - fromIndex) >= (largeSize || largeArraySize),
        cache = isLarge ? {} : array;

    if (isLarge) {
      // init value cache
      var index = fromIndex - 1;
      while (++index < length) {
        // manually coerce `value` to string because `hasOwnProperty`, in some
        // older versions of Firefox, coerces objects incorrectly
        var key = array[index] + '';
        (hasOwnProperty.call(cache, key) ? cache[key] : (cache[key] = [])).push(array[index]);
      }
    }
    return function(value) {
      if (isLarge) {
        var key = value + '';
        return hasOwnProperty.call(cache, key) && indexOf(cache[key], value) > -1;
      }
      return indexOf(cache, value, fromIndex) > -1;
    }
  }

  /**
   * Used by `sortBy` to compare transformed `collection` values, stable sorting
   * them in ascending order.
   *
   * @private
   * @param {Object} a The object to compare to `b`.
   * @param {Object} b The object to compare to `a`.
   * @returns {Number} Returns the sort order indicator of `1` or `-1`.
   */
  function compareAscending(a, b) {
    var ai = a.index,
        bi = b.index;

    a = a.criteria;
    b = b.criteria;

    // ensure a stable sort in V8 and other engines
    // http://code.google.com/p/v8/issues/detail?id=90
    if (a !== b) {
      if (a > b || a === undefined) {
        return 1;
      }
      if (a < b || b === undefined) {
        return -1;
      }
    }
    return ai < bi ? -1 : 1;
  }

  /**
   * Creates a function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any `partailArgs` to the arguments passed
   * to the bound function.
   *
   * @private
   * @param {Function|String} func The function to bind or the method name.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @param {Array} partialArgs An array of arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   */
  function createBound(func, thisArg, partialArgs) {
    var isFunc = isFunction(func),
        isPartial = !partialArgs,
        methodName = func;

    // juggle arguments
    if (isPartial) {
      partialArgs = thisArg;
    }

    function bound() {
      // `Function#bind` spec
      // http://es5.github.com/#x15.3.4.5
      var args = arguments,
          thisBinding = isPartial ? this : thisArg;

      if (!isFunc) {
        func = thisArg[methodName];
      }
      if (partialArgs.length) {
        args = args.length
          ? partialArgs.concat(slice.call(args))
          : partialArgs;
      }
      if (this instanceof bound) {
        // get `func` instance if `bound` is invoked in a `new` expression
        noop.prototype = func.prototype;
        thisBinding = new noop;

        // mimic the constructor's `return` behavior
        // http://es5.github.com/#x13.2.2
        var result = func.apply(thisBinding, args);
        return result && objectTypes[typeof result]
          ? result
          : thisBinding
      }
      return func.apply(thisBinding, args);
    }
    return bound;
  }

  /**
   * Produces an iteration callback bound to an optional `thisArg`. If `func` is
   * a property name, the callback will return the property value for a given element.
   *
   * @private
   * @param {Function|String} [func=identity|property] The function called per
   * iteration or property name to query.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Function} Returns a callback function.
   */
  function createCallback(func, thisArg) {
    if (!func) {
      return identity;
    }
    if (typeof func != 'function') {
      return function(object) {
        return object[func];
      };
    }
    if (thisArg !== undefined) {
      return function(value, index, object) {
        return func.call(thisArg, value, index, object);
      };
    }
    return func;
  }

  /**
   * Creates compiled iteration functions. The iteration function will be created
   * to iterate over only objects if the first argument of `options.args` is
   * "object" or `options.inLoop.array` is falsey.
   *
   * @private
   * @param {Object} [options1, options2, ...] The compile options objects.
   *
   *  useHas - A boolean to specify using `hasOwnProperty` checks in the object loop.
   *
   *  useStrict - A boolean to specify including the "use strict" directive.
   *
   *  args - A string of comma separated arguments the iteration function will accept.
   *
   *  init - A string to specify the initial value of the `result` variable.
   *
   *  top - A string of code to execute before the iteration branches.
   *
   *  beforeLoop - A string or object containing an "array" or "object" property
   *   of code to execute before the array or object loops.
   *
   *  inLoop - A string or object containing an "array" or "object" property
   *   of code to execute in the array or object loops.
   *
   *  bottom - A string of code to execute after the iteration branches but
   *   before the `result` is returned.
   *
   * @returns {Function} Returns the compiled function.
   */
  function createIterator() {
    var data = {
      'bottom': '',
      'hasDontEnumBug': hasDontEnumBug,
      'init': '',
      'isKeysFast': isKeysFast,
      'noArgsEnum': noArgsEnum,
      'noCharByIndex': noCharByIndex,
      'shadowed': shadowed,
      'top': '',
      'useHas': true,
      'useStrict': isStrictFast,
      'arrayBranch': { 'beforeLoop': '' },
      'objectBranch': { 'beforeLoop': '' }
    };

    var object,
        index = -1;

    // merge options into a template data object
    while (object = arguments[++index]) {
      for (var prop in object) {
        var value = object[prop];
        // keep this regexp explicit for the build pre-process
        if (/beforeLoop|inLoop/.test(prop)) {
          if (typeof value == 'string') {
            value = { 'array': value, 'object': value };
          }
          data.arrayBranch[prop] = value.array;
          data.objectBranch[prop] = value.object;
        } else {
          data[prop] = value;
        }
      }
    }
    // set additional template `data` properties
    var args = data.args;
    if ((data.firstArg = /^[^,]+/.exec(args)[0]) != 'collection' || !data.arrayBranch.inLoop) {
      data.arrayBranch = null;
    }
    // create the function factory
    var factory = Function(
        'arrayLikeClasses, ArrayProto, bind, compareAscending, concat, createCallback, ' +
        'forIn, hasOwnProperty, indexOf, isArguments, isArray, isFunction, ' +
        'isPlainObject, objectClass, objectTypes, nativeKeys, propertyIsEnumerable, ' +
        'slice, stringClass, toString, undefined',
      'var callee = function(' + args + ') {\n' + iteratorTemplate(data) + '\n};\n' +
      'return callee'
    );
    // return the compiled function
    return factory(
      arrayLikeClasses, ArrayProto, bind, compareAscending, concat, createCallback,
      forIn, hasOwnProperty, indexOf, isArguments, isArray, isFunction,
      isPlainObject, objectClass, objectTypes, nativeKeys, propertyIsEnumerable,
      slice, stringClass, toString
    );
  }

  /**
   * Used by `template` to escape characters for inclusion in compiled
   * string literals.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }

  /**
   * Used by `escape` to convert characters to HTML entities.
   *
   * @private
   * @param {String} match The matched character to escape.
   * @returns {String} Returns the escaped character.
   */
  function escapeHtmlChar(match) {
    return htmlEscapes[match];
  }

  /**
   * A no-operation function.
   *
   * @private
   */
  function noop() {
    // no operation performed
  }

  /**
   * Used by `unescape` to convert HTML entities to characters.
   *
   * @private
   * @param {String} match The matched character to unescape.
   * @returns {String} Returns the unescaped character.
   */
  function unescapeHtmlChar(match) {
    return htmlUnescapes[match];
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates an object composed of the inverted keys and values of the given `object`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to invert.
   * @returns {Object} Returns the created inverted object.
   * @example
   *
   *  _.invert({ 'first': 'Moe', 'second': 'Larry', 'third': 'Curly' });
   * // => { 'Moe': 'first', 'Larry': 'second', 'Curly': 'third' } (order is not guaranteed)
   */
  var invert = createIterator({
    'args': 'object',
    'init': '{}',
    'inLoop': 'result[value] = index'
  });

  /**
   * Checks if `value` is an `arguments` object.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an `arguments` object, else `false`.
   * @example
   *
   * (function() { return _.isArguments(arguments); })(1, 2, 3);
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    return toString.call(value) == argsClass;
  }
  // fallback for browsers that can't detect `arguments` objects by [[Class]]
  if (noArgsClass) {
    isArguments = function(value) {
      return value ? hasOwnProperty.call(value, 'callee') : false;
    };
  }

  /**
   * Checks if `value` is an array.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an array, else `false`.
   * @example
   *
   * (function() { return _.isArray(arguments); })();
   * // => false
   *
   * _.isArray([1, 2, 3]);
   * // => true
   */
  var isArray = nativeIsArray || function(value) {
    return toString.call(value) == arrayClass;
  };

  /**
   * Checks if `value` is a function.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   */
  function isFunction(value) {
    return typeof value == 'function';
  }
  // fallback for older versions of Chrome and Safari
  if (isFunction(/x/)) {
    isFunction = function(value) {
      return toString.call(value) == funcClass;
    };
  }

  /**
   * Checks if a given `value` is an object created by the `Object` constructor.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if `value` is a plain object, else `false`.
   * @example
   *
   * function Stooge(name, age) {
   *   this.name = name;
   *   this.age = age;
   * }
   *
   * _.isPlainObject(new Stooge('moe', 40));
   * // false
   *
   * _.isPlainObject([1, 2, 3]);
   * // false
   *
   * _.isPlainObject({ 'name': 'moe', 'age': 40 });
   * // => true
   */
  var isPlainObject = !getPrototypeOf ? isPlainFallback : function(value) {
    if (!(value && typeof value == 'object')) {
      return false;
    }
    var valueOf = value.valueOf,
        objProto = typeof valueOf == 'function' && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);

    return objProto
      ? value == objProto || (getPrototypeOf(value) == objProto && !isArguments(value))
      : isPlainFallback(value);
  };

  /**
   * A fallback implementation of `isPlainObject` that checks if a given `value`
   * is an object created by the `Object` constructor, assuming objects created
   * by the `Object` constructor have no inherited enumerable properties and that
   * there are no `Object.prototype` extensions.
   *
   * @private
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if `value` is a plain object, else `false`.
   */
  function isPlainFallback(value) {
    // avoid non-objects and false positives for `arguments` objects
    var result = false;
    if (!(value && typeof value == 'object') || isArguments(value)) {
      return result;
    }
    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
    // methods that are `typeof` "string" and still can coerce nodes to strings.
    // Also check that the constructor is `Object` (i.e. `Object instanceof Object`)
    var ctor = value.constructor;
    if ((!noNodeClass || !(typeof value.toString != 'function' && typeof (value + '') == 'string')) &&
        (!isFunction(ctor) || ctor instanceof ctor)) {
      // IE < 9 iterates inherited properties before own properties. If the first
      // iterated property is an object's own property then there are no inherited
      // enumerable properties.
      if (iteratesOwnLast) {
        forIn(value, function(value, key, object) {
          result = !hasOwnProperty.call(object, key);
          return false;
        });
        return result === false;
      }
      // In most environments an object's own properties are iterated before
      // its inherited properties. If the last iterated property is an object's
      // own property then there are no inherited enumerable properties.
      forIn(value, function(value, key) {
        result = key;
      });
      return result === false || hasOwnProperty.call(value, result);
    }
    return result;
  }

  /**
   * A shim implementation of `Object.keys` that produces an array of the given
   * object's own enumerable property names.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   */
  var shimKeys = createIterator({
    'args': 'object',
    'init': '[]',
    'inLoop': 'result.push(index)'
  });

  /**
   * Used to convert characters to HTML entities:
   *
   * Though the `>` character is escaped for symmetry, characters like `>` and `/`
   * don't require escaping in HTML and have no special meaning unless they're part
   * of a tag or an unquoted attribute value.
   * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
   */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  /** Used to convert HTML entities to characters */
  var htmlUnescapes = invert(htmlEscapes);

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a clone of `value`. If `deep` is `true`, all nested objects will
   * also be cloned otherwise they will be assigned by reference. Functions, DOM
   * nodes, `arguments` objects, and objects created by constructors other than
   * `Object` are **not** cloned.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to clone.
   * @param {Boolean} deep A flag to indicate a deep clone.
   * @param- {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `deep`.
   * @param- {Array} [stackA=[]] Internally used to track traversed source objects.
   * @param- {Array} [stackB=[]] Internally used to associate clones with their
   *  source counterparts.
   * @returns {Mixed} Returns the cloned `value`.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.clone({ 'name': 'moe' });
   * // => { 'name': 'moe' }
   *
   * var shallow = _.clone(stooges);
   * shallow[0] === stooges[0];
   * // => true
   *
   * var deep = _.clone(stooges, true);
   * shallow[0] === stooges[0];
   * // => false
   */
  function clone(value, deep, guard, stackA, stackB) {
    if (value == null) {
      return value;
    }
    if (guard) {
      deep = false;
    }
    // inspect [[Class]]
    var isObj = objectTypes[typeof value];
    if (isObj) {
      // don't clone `arguments` objects, functions, or non-object Objects
      var className = toString.call(value);
      if (!cloneableClasses[className] || (noArgsClass && isArguments(value))) {
        return value;
      }
      var isArr = className == arrayClass;
      isObj = isArr || (className == objectClass ? isPlainObject(value) : isObj);
    }
    // shallow clone
    if (!isObj || !deep) {
      // don't clone functions
      return isObj
        ? (isArr ? slice.call(value) : extend({}, value))
        : value;
    }

    var ctor = value.constructor;
    switch (className) {
      case boolClass:
      case dateClass:
        return new ctor(+value);

      case numberClass:
      case stringClass:
        return new ctor(value);

      case regexpClass:
        return ctor(value.source, reFlags.exec(value));
    }
    // check for circular references and return corresponding clone
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == value) {
        return stackB[length];
      }
    }
    // init cloned object
    var result = isArr ? ctor(value.length) : {};

    // add the source value to the stack of traversed objects
    // and associate it with its clone
    stackA.push(value);
    stackB.push(result);

    // recursively populate clone (susceptible to call stack limits)
    (isArr ? forEach : forOwn)(value, function(objValue, key) {
      result[key] = clone(objValue, deep, null, stackA, stackB);
    });

    return result;
  }

  /**
   * Assigns enumerable properties of the default object(s) to the `destination`
   * object for all `destination` properties that resolve to `null`/`undefined`.
   * Once a property is set, additional defaults of the same property will be
   * ignored.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [default1, default2, ...] The default objects.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * var iceCream = { 'flavor': 'chocolate' };
   * _.defaults(iceCream, { 'flavor': 'vanilla', 'sprinkles': 'rainbow' });
   * // => { 'flavor': 'chocolate', 'sprinkles': 'rainbow' }
   */
  var defaults = createIterator(extendIteratorOptions, {
    'inLoop': 'if (result[index] == null) ' + extendIteratorOptions.inLoop
  });

  /**
   * Assigns enumerable properties of the source object(s) to the `destination`
   * object. Subsequent sources will overwrite propery assignments of previous
   * sources.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * _.extend({ 'name': 'moe' }, { 'age': 40 });
   * // => { 'name': 'moe', 'age': 40 }
   */
  var extend = createIterator(extendIteratorOptions);

  /**
   * Iterates over `object`'s own and inherited enumerable properties, executing
   * the `callback` for each property. The `callback` is bound to `thisArg` and
   * invoked with three arguments; (value, key, object). Callbacks may exit iteration
   * early by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function Dog(name) {
   *   this.name = name;
   * }
   *
   * Dog.prototype.bark = function() {
   *   alert('Woof, woof!');
   * };
   *
   * _.forIn(new Dog('Dagny'), function(value, key) {
   *   alert(key);
   * });
   * // => alerts 'name' and 'bark' (order is not guaranteed)
   */
  var forIn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions, {
    'useHas': false
  });

  /**
   * Iterates over `object`'s own enumerable properties, executing the `callback`
   * for each property. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, key, object). Callbacks may exit iteration early by explicitly
   * returning `false`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns `object`.
   * @example
   *
   * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
   *   alert(key);
   * });
   * // => alerts '0', '1', and 'length' (order is not guaranteed)
   */
  var forOwn = createIterator(baseIteratorOptions, forEachIteratorOptions, forOwnIteratorOptions);

  /**
   * Creates a sorted array of all enumerable properties, own and inherited,
   * of `object` that have function values.
   *
   * @static
   * @memberOf _
   * @alias methods
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names that have function values.
   * @example
   *
   * _.functions(_);
   * // => ['all', 'any', 'bind', 'bindAll', 'clone', 'compact', 'compose', ...]
   */
  var functions = createIterator({
    'useHas': false,
    'args': 'object',
    'init': '[]',
    'inLoop': 'isFunction(value) && result.push(index)',
    'bottom': 'result.sort()'
  });

  /**
   * Checks if the specified object `property` exists and is a direct property,
   * instead of an inherited property.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to check.
   * @param {String} property The property to check for.
   * @returns {Boolean} Returns `true` if key is a direct property, else `false`.
   * @example
   *
   * _.has({ 'a': 1, 'b': 2, 'c': 3 }, 'b');
   * // => true
   */
  function has(object, property) {
    return object ? hasOwnProperty.call(object, property) : false;
  }

  /**
   * Checks if `value` is a boolean (`true` or `false`) value.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a boolean value, else `false`.
   * @example
   *
   * _.isBoolean(null);
   * // => false
   */
  function isBoolean(value) {
    return value === true || value === false || toString.call(value) == boolClass;
  }

  /**
   * Checks if `value` is a date.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a date, else `false`.
   * @example
   *
   * _.isDate(new Date);
   * // => true
   */
  function isDate(value) {
    return toString.call(value) == dateClass;
  }

  /**
   * Checks if `value` is a DOM element.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a DOM element, else `false`.
   * @example
   *
   * _.isElement(document.body);
   * // => true
   */
  function isElement(value) {
    return value ? value.nodeType === 1 : false;
  }

  /**
   * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
   * length of `0` and objects with no own enumerable properties are considered
   * "empty".
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Array|Object|String} value The value to inspect.
   * @returns {Boolean} Returns `true` if the `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({});
   * // => true
   *
   * _.isEmpty('');
   * // => true
   */
  var isEmpty = createIterator({
    'args': 'value',
    'init': 'true',
    'top':
      'var className = toString.call(value),\n' +
      '    length = value.length;\n' +
      'if (arrayLikeClasses[className]' +
      (noArgsClass ? ' || isArguments(value)' : '') + ' ||\n' +
      '  (className == objectClass && length === +length &&\n' +
      '  isFunction(value.splice))' +
      ') return !length',
    'inLoop': {
      'object': 'return false'
    }
  });

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent to each other.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} a The value to compare.
   * @param {Mixed} b The other value to compare.
   * @param- {Object} [stackA=[]] Internally used track traversed `a` objects.
   * @param- {Object} [stackB=[]] Internally used track traversed `b` objects.
   * @returns {Boolean} Returns `true` if the values are equvalent, else `false`.
   * @example
   *
   * var moe = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   * var clone = { 'name': 'moe', 'luckyNumbers': [13, 27, 34] };
   *
   * moe == clone;
   * // => false
   *
   * _.isEqual(moe, clone);
   * // => true
   */
  function isEqual(a, b, stackA, stackB) {
    // a strict comparison is necessary because `null == undefined`
    if (a == null || b == null) {
      return a === b;
    }
    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }
    // unwrap any `lodash` wrapped values
    if (objectTypes[typeof a] || objectTypes[typeof b]) {
      a = a.__wrapped__ || a;
      b = b.__wrapped__ || b;
    }
    // compare [[Class]] names
    var className = toString.call(a);
    if (className != toString.call(b)) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        // coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0`, treating invalid dates coerced to `NaN` as not equal
        return +a == +b;

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return a != +a
          ? b != +b
          // but treat `+0` vs. `-0` as not equal
          : (a == 0 ? (1 / a == 1 / b) : a == +b);

      case regexpClass:
      case stringClass:
        // coerce regexes to strings (http://es5.github.com/#x15.10.6.4)
        // treat string primitives and their corresponding object instances as equal
        return a == b + '';
    }
    // exit early, in older browsers, if `a` is array-like but not `b`
    var isArr = arrayLikeClasses[className];
    if (noArgsClass && !isArr && (isArr = isArguments(a)) && !isArguments(b)) {
      return false;
    }
    // exit for functions and DOM nodes
    if (!isArr && (className != objectClass || (noNodeClass && (
        (typeof a.toString != 'function' && typeof (a + '') == 'string') ||
        (typeof b.toString != 'function' && typeof (b + '') == 'string'))))) {
      return false;
    }

    // assume cyclic structures are equal
    // the algorithm for detecting cyclic structures is adapted from ES 5.1
    // section 15.12.3, abstract operation `JO` (http://es5.github.com/#x15.12.3)
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }

    var index = -1,
        result = true,
        size = 0;

    // add `a` and `b` to the stack of traversed objects
    stackA.push(a);
    stackB.push(b);

    // recursively compare objects and arrays (susceptible to call stack limits)
    if (isArr) {
      // compare lengths to determine if a deep comparison is necessary
      size = a.length;
      result = size == b.length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          if (!(result = isEqual(a[size], b[size], stackA, stackB))) {
            break;
          }
        }
      }
      return result;
    }

    var ctorA = a.constructor,
        ctorB = b.constructor;

    // non `Object` object instances with different constructors are not equal
    if (ctorA != ctorB && !(
          isFunction(ctorA) && ctorA instanceof ctorA &&
          isFunction(ctorB) && ctorB instanceof ctorB
        )) {
      return false;
    }
    // deep compare objects
    for (var prop in a) {
      if (hasOwnProperty.call(a, prop)) {
        // count the number of properties.
        size++;
        // deep compare each property value.
        if (!(hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stackA, stackB))) {
          return false;
        }
      }
    }
    // ensure both objects have the same number of properties
    for (prop in b) {
      // The JS engine in Adobe products, like InDesign, has a bug that causes
      // `!size--` to throw an error so it must be wrapped in parentheses.
      // https://github.com/documentcloud/underscore/issues/355
      if (hasOwnProperty.call(b, prop) && !(size--)) {
        // `size` will be `-1` if `b` has more properties than `a`
        return false;
      }
    }
    // handle JScript [[DontEnum]] bug
    if (hasDontEnumBug) {
      while (++index < 7) {
        prop = shadowed[index];
        if (hasOwnProperty.call(a, prop) &&
            !(hasOwnProperty.call(b, prop) && isEqual(a[prop], b[prop], stackA, stackB))) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Checks if `value` is a finite number.
   *
   * Note: This is not the same as native `isFinite`, which will return true for
   * booleans and other values. See http://es5.github.com/#x15.1.2.5.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a finite number, else `false`.
   * @example
   *
   * _.isFinite(-101);
   * // => true
   *
   * _.isFinite('10');
   * // => false
   *
   * _.isFinite(Infinity);
   * // => false
   */
  function isFinite(value) {
    return nativeIsFinite(value) && toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is the language type of Object.
   * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(1);
   * // => false
   */
  function isObject(value) {
    // check if the value is the ECMAScript language type of Object
    // http://es5.github.com/#x8
    // and avoid a V8 bug
    // http://code.google.com/p/v8/issues/detail?id=2291
    return value ? objectTypes[typeof value] : false;
  }

  /**
   * Checks if `value` is `NaN`.
   *
   * Note: This is not the same as native `isNaN`, which will return true for
   * `undefined` and other values. See http://es5.github.com/#x15.1.2.4.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `NaN`, else `false`.
   * @example
   *
   * _.isNaN(NaN);
   * // => true
   *
   * _.isNaN(new Number(NaN));
   * // => true
   *
   * isNaN(undefined);
   * // => true
   *
   * _.isNaN(undefined);
   * // => false
   */
  function isNaN(value) {
    // `NaN` as a primitive is the only value that is not equal to itself
    // (perform the [[Class]] check first to avoid errors with some host objects in IE)
    return toString.call(value) == numberClass && value != +value
  }

  /**
   * Checks if `value` is `null`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `null`, else `false`.
   * @example
   *
   * _.isNull(null);
   * // => true
   *
   * _.isNull(undefined);
   * // => false
   */
  function isNull(value) {
    return value === null;
  }

  /**
   * Checks if `value` is a number.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a number, else `false`.
   * @example
   *
   * _.isNumber(8.4 * 5);
   * // => true
   */
  function isNumber(value) {
    return toString.call(value) == numberClass;
  }

  /**
   * Checks if `value` is a regular expression.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a regular expression, else `false`.
   * @example
   *
   * _.isRegExp(/moe/);
   * // => true
   */
  function isRegExp(value) {
    return toString.call(value) == regexpClass;
  }

  /**
   * Checks if `value` is a string.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is a string, else `false`.
   * @example
   *
   * _.isString('moe');
   * // => true
   */
  function isString(value) {
    return toString.call(value) == stringClass;
  }

  /**
   * Checks if `value` is `undefined`.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Objects
   * @param {Mixed} value The value to check.
   * @returns {Boolean} Returns `true` if the `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /**
   * Creates an array composed of the own enumerable property names of `object`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property names.
   * @example
   *
   * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
   * // => ['one', 'two', 'three'] (order is not guaranteed)
   */
  var keys = !nativeKeys ? shimKeys : function(object) {
    var type = typeof object;

    // avoid iterating over the `prototype` property
    if (type == 'function' && propertyIsEnumerable.call(object, 'prototype')) {
      return shimKeys(object);
    }
    return object && objectTypes[type]
      ? nativeKeys(object)
      : [];
  };

  /**
   * Merges enumerable properties of the source object(s) into the `destination`
   * object. Subsequent sources will overwrite propery assignments of previous
   * sources.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The destination object.
   * @param {Object} [source1, source2, ...] The source objects.
   * @param- {Object} [indicator] Internally used to indicate that the `stack`
   *  argument is an array of traversed objects instead of another source object.
   * @param- {Array} [stackA=[]] Internally used to track traversed source objects.
   * @param- {Array} [stackB=[]] Internally used to associate clones with their
   *  source counterparts.
   * @returns {Object} Returns the destination object.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe' },
   *   { 'name': 'larry' }
   * ];
   *
   * var ages = [
   *   { 'age': 40 },
   *   { 'age': 50 }
   * ];
   *
   * _.merge(stooges, ages);
   * // => [{ 'name': 'moe', 'age': 40 }, { 'name': 'larry', 'age': 50 }]
   */
  var merge = createIterator(extendIteratorOptions, {
    'args': 'object, source, indicator',
    'top':
      'var isArr, args = arguments, argsIndex = 0;\n' +
      'if (indicator == compareAscending) {\n' +
      '  var argsLength = 2, stackA = args[3], stackB = args[4]\n' +
      '} else {\n' +
      '  var argsLength = args.length, stackA = [], stackB = []\n' +
      '}\n' +
      'while (++argsIndex < argsLength) {\n' +
      '  if (iteratee = args[argsIndex]) {',
    'inLoop':
      'if ((source = value) && ((isArr = isArray(source)) || isPlainObject(source))) {\n' +
      '  var found = false, stackLength = stackA.length;\n' +
      '  while (stackLength--) {\n' +
      '    if (found = stackA[stackLength] == source) break\n' +
      '  }\n' +
      '  if (found) {\n' +
      '    result[index] = stackB[stackLength]\n' +
      '  } else {\n' +
      '    stackA.push(source);\n' +
      '    stackB.push(value = (value = result[index], isArr)\n' +
      '      ? (isArray(value) ? value : [])\n' +
      '      : (isPlainObject(value) ? value : {})\n' +
      '    );\n' +
      '    result[index] = callee(value, source, compareAscending, stackA, stackB)\n' +
      '  }\n' +
      '} else if (source != null) {\n' +
      '  result[index] = source\n' +
      '}'
  });

  /**
   * Creates a shallow clone of `object` excluding the specified properties.
   * Property names may be specified as individual arguments or as arrays of
   * property names. If `callback` is passed, it will be executed for each property
   * in the `object`, omitting the properties `callback` returns truthy for. The
   * `callback` is bound to `thisArg` and invoked with three arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The source object.
   * @param {Function|String} callback|[prop1, prop2, ...] The properties to omit
   *  or the function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns an object without the omitted properties.
   * @example
   *
   * _.omit({ 'name': 'moe', 'age': 40, 'userid': 'moe1' }, 'userid');
   * // => { 'name': 'moe', 'age': 40 }
   *
   * _.omit({ 'name': 'moe', '_hint': 'knucklehead', '_seed': '96c4eb' }, function(value, key) {
   *   return key.charAt(0) == '_';
   * });
   * // => { 'name': 'moe' }
   */
  var omit = createIterator(omitIteratorOptions);

  /**
   * Creates a two dimensional array of the given object's key-value pairs,
   * i.e. `[[key1, value1], [key2, value2]]`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns new array of key-value pairs.
   * @example
   *
   * _.pairs({ 'moe': 30, 'larry': 40, 'curly': 50 });
   * // => [['moe', 30], ['larry', 40], ['curly', 50]] (order is not guaranteed)
   */
  var pairs = createIterator({
    'args': 'object',
    'init':'[]',
    'inLoop': 'result'  + (isKeysFast ? '[ownIndex] = ' : '.push') + '([index, value])'
  });

  /**
   * Creates a shallow clone of `object` composed of the specified properties.
   * Property names may be specified as individual arguments or as arrays of
   * property names. If `callback` is passed, it will be executed for each property
   * in the `object`, picking the properties `callback` returns truthy for. The
   * `callback` is bound to `thisArg` and invoked with three arguments; (value, key, object).
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The source object.
   * @param {Function|String} callback|[prop1, prop2, ...] The properties to pick
   *  or the function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns an object composed of the picked properties.
   * @example
   *
   * _.pick({ 'name': 'moe', 'age': 40, 'userid': 'moe1' }, 'name', 'age');
   * // => { 'name': 'moe', 'age': 40 }
   *
   * _.pick({ 'name': 'moe', '_hint': 'knucklehead', '_seed': '96c4eb' }, function(value, key) {
   *   return key.charAt(0) != '_';
   * });
   * // => { 'name': 'moe' }
   */
  var pick = createIterator(omitIteratorOptions, {
    'top':
      'if (typeof callback != \'function\') {\n' +
      '  var index = 0,\n' +
      '      props = concat.apply(ArrayProto, arguments),\n' +
      '      length = props.length;\n' +
      '  while (++index < length) {\n' +
      '    var prop = props[index];\n' +
      '    if (prop in object) result[prop] = object[prop]\n' +
      '  }\n' +
      '} else {\n' +
      '  callback = createCallback(callback, thisArg)',
    'inLoop':
      'if (callback(value, index, object)) result[index] = value',
    'bottom': '}'
  });

  /**
   * Creates an array composed of the own enumerable property values of `object`.
   *
   * @static
   * @memberOf _
   * @category Objects
   * @param {Object} object The object to inspect.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * _.values({ 'one': 1, 'two': 2, 'three': 3 });
   * // => [1, 2, 3]
   */
  var values = createIterator({
    'args': 'object',
    'init': '[]',
    'inLoop': 'result.push(value)'
  });

  /*--------------------------------------------------------------------------*/

  /**
   * Checks if a given `target` element is present in a `collection` using strict
   * equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @alias include
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Mixed} target The value to check for.
   * @returns {Boolean} Returns `true` if the `target` element is found, else `false`.
   * @example
   *
   * _.contains([1, 2, 3], 3);
   * // => true
   *
   * _.contains({ 'name': 'moe', 'age': 40 }, 'moe');
   * // => true
   *
   * _.contains('curly', 'ur');
   * // => true
   */
  var contains = createIterator({
    'args': 'collection, target',
    'init': 'false',
    'noCharByIndex': false,
    'beforeLoop': {
      'array': 'if (toString.call(collection) == stringClass) return collection.indexOf(target) > -1'
    },
    'inLoop': 'if (value === target) return true'
  });

  /**
   * Creates an object composed of keys returned from running each element of
   * `collection` through a `callback`. The corresponding value of each key is
   * the number of times the key was returned by `callback`. The `callback` is
   * bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
   * The `callback` argument may also be the name of a property to count by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback|property The function called per iteration
   *  or property name to count by.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns the composed aggregate object.
   * @example
   *
   * _.countBy([4.3, 6.1, 6.4], function(num) { return Math.floor(num); });
   * // => { '4': 1, '6': 2 }
   *
   * _.countBy([4.3, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
   * // => { '4': 1, '6': 2 }
   *
   * _.countBy(['one', 'two', 'three'], 'length');
   * // => { '3': 2, '5': 1 }
   */
  var countBy = createIterator(baseIteratorOptions, countByIteratorOptions);

  /**
   * Checks if the `callback` returns a truthy value for **all** elements of a
   * `collection`. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias all
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Boolean} Returns `true` if all elements pass the callback check,
   *  else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   */
  var every = createIterator(baseIteratorOptions, everyIteratorOptions);

  /**
   * Examines each element in a `collection`, returning an array of all elements
   * the `callback` returns truthy for. The `callback` is bound to `thisArg` and
   * invoked with three arguments; (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias select
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a new array of elements that passed the callback check.
   * @example
   *
   * var evens = _.filter([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [2, 4, 6]
   */
  var filter = createIterator(baseIteratorOptions, filterIteratorOptions);

  /**
   * Examines each element in a `collection`, returning the first one the `callback`
   * returns truthy for. The function returns as soon as it finds an acceptable
   * element, and does not iterate over the entire `collection`. The `callback` is
   * bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias detect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the element that passed the callback check,
   *  else `undefined`.
   * @example
   *
   * var even = _.find([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => 2
   */
  var find = createIterator(baseIteratorOptions, forEachIteratorOptions, {
    'init': 'undefined',
    'inLoop': 'if (callback(value, index, collection)) return value'
  });

  /**
   * Iterates over a `collection`, executing the `callback` for each element in
   * the `collection`. The `callback` is bound to `thisArg` and invoked with three
   * arguments; (value, index|key, collection). Callbacks may exit iteration early
   * by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @alias each
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array|Object|String} Returns `collection`.
   * @example
   *
   * _([1, 2, 3]).forEach(alert).join(',');
   * // => alerts each number and returns '1,2,3'
   *
   * _.forEach({ 'one': 1, 'two': 2, 'three': 3 }, alert);
   * // => alerts each number (order is not guaranteed)
   */
  var forEach = createIterator(baseIteratorOptions, forEachIteratorOptions);

  /**
   * Creates an object composed of keys returned from running each element of
   * `collection` through a `callback`. The corresponding value of each key is an
   * array of elements passed to `callback` that returned the key. The `callback`
   * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
   * The `callback` argument may also be the name of a property to count by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback|property The function called per iteration
   *  or property name to group by.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Object} Returns the composed aggregate object.
   * @example
   *
   * _.groupBy([4.2, 6.1, 6.4], function(num) { return Math.floor(num); });
   * // => { '4': [4.2], '6': [6.1, 6.4] }
   *
   * _.groupBy([4.2, 6.1, 6.4], function(num) { return this.floor(num); }, Math);
   * // => { '4': [4.2], '6': [6.1, 6.4] }
   *
   * _.groupBy(['one', 'two', 'three'], 'length');
   * // => { '3': ['one', 'two'], '5': ['three'] }
   */
  var groupBy = createIterator(baseIteratorOptions, countByIteratorOptions, {
    'inLoop':
      'var prop = callback(value, index, collection);\n' +
      '(hasOwnProperty.call(result, prop) ? result[prop] : result[prop] = []).push(value)'
  });

  /**
   * Invokes the method named by `methodName` on each element in the `collection`,
   * returning an array of the results of each invoked method. Additional arguments
   * will be passed to each invoked method. If `methodName` is a function it will
   * be invoked for, and `this` bound to, each element in the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} methodName The name of the method to invoke or
   *  the function invoked per iteration.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the method with.
   * @returns {Array} Returns a new array of the results of each invoked method.
   * @example
   *
   * _.invoke([[5, 1, 7], [3, 2, 1]], 'sort');
   * // => [[1, 5, 7], [1, 2, 3]]
   *
   * _.invoke([123, 456], String.prototype.split, '');
   * // => [['1', '2', '3'], ['4', '5', '6']]
   */
  var invoke = createIterator(mapIteratorOptions, {
    'args': 'collection, methodName',
    'top':
      'var args = slice.call(arguments, 2),\n' +
      '    isFunc = typeof methodName == \'function\'',
    'inLoop': {
      'array':
        'result[index] = (isFunc ? methodName : value[methodName]).apply(value, args)',
      'object':
        'result' + (isKeysFast ? '[ownIndex] = ' : '.push') +
        '((isFunc ? methodName : value[methodName]).apply(value, args))'
    }
  });

  /**
   * Creates an array of values by running each element in the `collection`
   * through a `callback`. The `callback` is bound to `thisArg` and invoked with
   * three arguments; (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias collect
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a new array of the results of each `callback` execution.
   * @example
   *
   * _.map([1, 2, 3], function(num) { return num * 3; });
   * // => [3, 6, 9]
   *
   * _.map({ 'one': 1, 'two': 2, 'three': 3 }, function(num) { return num * 3; });
   * // => [3, 6, 9] (order is not guaranteed)
   */
  var map = createIterator(baseIteratorOptions, mapIteratorOptions);

  /**
   * Retrieves the maximum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to
   * `thisArg` and invoked with three arguments; (value, index, collection).
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array} collection The collection to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the maximum value.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.max(stooges, function(stooge) { return stooge.age; });
   * // => { 'name': 'curly', 'age': 60 };
   */
  function max(collection, callback, thisArg) {
    var computed = -Infinity,
        index = -1,
        length = collection ? collection.length : 0,
        result = computed;

    if (callback || length !== +length) {
      callback = createCallback(callback, thisArg);
      forEach(collection, function(value, index, collection) {
        var current = callback(value, index, collection);
        if (current > computed) {
          computed = current;
          result = value;
        }
      });
    } else {
      while (++index < length) {
        if (collection[index] > result) {
          result = collection[index];
        }
      }
    }
    return result;
  }

  /**
   * Retrieves the minimum value of an `array`. If `callback` is passed,
   * it will be executed for each value in the `array` to generate the
   * criterion by which the value is ranked. The `callback` is bound to `thisArg`
   * and invoked with three arguments; (value, index, collection).
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array} collection The collection to iterate over.
   * @param {Function} [callback] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the minimum value.
   * @example
   *
   * _.min([10, 5, 100, 2, 1000]);
   * // => 2
   */
  function min(collection, callback, thisArg) {
    var computed = Infinity,
        index = -1,
        length = collection ? collection.length : 0,
        result = computed;

    if (callback || length !== +length) {
      callback = createCallback(callback, thisArg);
      forEach(collection, function(value, index, collection) {
        var current = callback(value, index, collection);
        if (current < computed) {
          computed = current;
          result = value;
        }
      });
    } else {
      while (++index < length) {
        if (collection[index] < result) {
          result = collection[index];
        }
      }
    }
    return result;
  }

  /**
   * Retrieves the value of a specified property from all elements in
   * the `collection`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {String} property The property to pluck.
   * @returns {Array} Returns a new array of property values.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.pluck(stooges, 'name');
   * // => ['moe', 'larry', 'curly']
   */
  var pluck = createIterator(mapIteratorOptions, {
    'args': 'collection, property',
    'inLoop': {
      'array':  'result[index] = value[property]',
      'object': 'result' + (isKeysFast ? '[ownIndex] = ' : '.push') + '(value[property])'
    }
  });

  /**
   * Boils down a `collection` to a single value. The initial state of the
   * reduction is `accumulator` and each successive step of it should be returned
   * by the `callback`. The `callback` is bound to `thisArg` and invoked with 4
   * arguments; for arrays they are (accumulator, value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias foldl, inject
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var sum = _.reduce([1, 2, 3], function(memo, num) { return memo + num; });
   * // => 6
   */
  var reduce = createIterator({
    'args': 'collection, callback, accumulator, thisArg',
    'init': 'accumulator',
    'top':
      'var noaccum = arguments.length < 3;\n' +
      'callback = createCallback(callback, thisArg)',
    'beforeLoop': {
      'array': 'if (noaccum) result = iteratee[++index]'
    },
    'inLoop': {
      'array':
        'result = callback(result, value, index, collection)',
      'object':
        'result = noaccum\n' +
        '  ? (noaccum = false, value)\n' +
        '  : callback(result, value, index, collection)'
    }
  });

  /**
   * The right-associative version of `_.reduce`.
   *
   * @static
   * @memberOf _
   * @alias foldr
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [accumulator] Initial value of the accumulator.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Mixed} Returns the accumulated value.
   * @example
   *
   * var list = [[0, 1], [2, 3], [4, 5]];
   * var flat = _.reduceRight(list, function(a, b) { return a.concat(b); }, []);
   * // => [4, 5, 2, 3, 0, 1]
   */
  function reduceRight(collection, callback, accumulator, thisArg) {
    var iteratee = collection,
        length = collection ? collection.length : 0,
        noaccum = arguments.length < 3;

    if (length !== +length) {
      var props = keys(collection);
      length = props.length;
    } else if (noCharByIndex && toString.call(collection) == stringClass) {
      iteratee = collection.split('');
    }
    forEach(collection, function(value, index, object) {
      index = props ? props[--length] : --length;
      accumulator = noaccum
        ? (noaccum = false, iteratee[index])
        : callback.call(thisArg, accumulator, iteratee[index], index, object);
    });
    return accumulator;
  }

  /**
   * The opposite of `_.filter`, this method returns the values of a
   * `collection` that `callback` does **not** return truthy for.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a new array of elements that did **not** pass the
   *  callback check.
   * @example
   *
   * var odds = _.reject([1, 2, 3, 4, 5, 6], function(num) { return num % 2 == 0; });
   * // => [1, 3, 5]
   */
  var reject = createIterator(baseIteratorOptions, filterIteratorOptions, {
    'inLoop': '!' + filterIteratorOptions.inLoop
  });

  /**
   * Creates an array of shuffled `array` values, using a version of the
   * Fisher-Yates shuffle. See http://en.wikipedia.org/wiki/Fisher-Yates_shuffle.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array} collection The collection to shuffle.
   * @returns {Array} Returns a new shuffled collection.
   * @example
   *
   * _.shuffle([1, 2, 3, 4, 5, 6]);
   * // => [4, 1, 6, 3, 5, 2]
   */
  function shuffle(collection) {
    var index = -1,
        result = Array(collection ? collection.length : 0);

    forEach(collection, function(value) {
      var rand = floor(nativeRandom() * (++index + 1));
      result[index] = result[rand];
      result[rand] = value;
    });
    return result;
  }

  /**
   * Gets the size of the `collection` by returning `collection.length` for arrays
   * and array-like objects or the number of own enumerable properties for objects.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to inspect.
   * @returns {Number} Returns `collection.length` or number of own enumerable properties.
   * @example
   *
   * _.size([1, 2]);
   * // => 2
   *
   * _.size({ 'one': 1, 'two': 2, 'three': 3 });
   * // => 3
   *
   * _.size('curly');
   * // => 5
   */
  function size(collection) {
    var length = collection ? collection.length : 0;
    return length === +length ? length : keys(collection).length;
  }

  /**
   * Checks if the `callback` returns a truthy value for **any** element of a
   * `collection`. The function returns as soon as it finds passing value, and
   * does not iterate over the entire `collection`. The `callback` is bound to
   * `thisArg` and invoked with three arguments; (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @alias any
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Boolean} Returns `true` if any element passes the callback check,
   *  else `false`.
   * @example
   *
   * _.some([null, 0, 'yes', false]);
   * // => true
   */
  var some = createIterator(baseIteratorOptions, everyIteratorOptions, {
    'init': 'false',
    'inLoop': everyIteratorOptions.inLoop.replace('!', '')
  });

  /**
   * Creates an array, stable sorted in ascending order by the results of
   * running each element of `collection` through a `callback`. The `callback`
   * is bound to `thisArg` and invoked with three arguments; (value, index|key, collection).
   * The `callback` argument may also be the name of a property to sort by (e.g. 'length').
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Function|String} callback|property The function called per iteration
   *  or property name to sort by.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a new array of sorted elements.
   * @example
   *
   * _.sortBy([1, 2, 3], function(num) { return Math.sin(num); });
   * // => [3, 1, 2]
   *
   * _.sortBy([1, 2, 3], function(num) { return this.sin(num); }, Math);
   * // => [3, 1, 2]
   *
   * _.sortBy(['larry', 'brendan', 'moe'], 'length');
   * // => ['moe', 'larry', 'brendan']
   */
  var sortBy = createIterator(baseIteratorOptions, countByIteratorOptions, mapIteratorOptions, {
    'inLoop': {
      'array':
        'result[index] = {\n' +
        '  criteria: callback(value, index, collection),\n' +
        '  index: index,\n' +
        '  value: value\n' +
        '}',
      'object':
        'result' + (isKeysFast ? '[ownIndex] = ' : '.push') + '({\n' +
        '  criteria: callback(value, index, collection),\n' +
        '  index: index,\n' +
        '  value: value\n' +
        '})'
    },
    'bottom':
      'result.sort(compareAscending);\n' +
      'length = result.length;\n' +
      'while (length--) {\n' +
      '  result[length] = result[length].value\n' +
      '}'
  });

  /**
   * Converts the `collection`, to an array.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to convert.
   * @returns {Array} Returns the new converted array.
   * @example
   *
   * (function() { return _.toArray(arguments).slice(1); })(1, 2, 3, 4);
   * // => [2, 3, 4]
   */
  function toArray(collection) {
    if (!collection) {
      return [];
    }
    var length = collection.length;
    if (length === +length) {
      return (noArraySliceOnStrings ? toString.call(collection) == stringClass : typeof collection == 'string')
        ? collection.split('')
        : slice.call(collection);
    }
    return values(collection);
  }

  /**
   * Examines each element in a `collection`, returning an array of all elements
   * that contain the given `properties`.
   *
   * @static
   * @memberOf _
   * @category Collections
   * @param {Array|Object|String} collection The collection to iterate over.
   * @param {Object} properties The object of properties/values to filter by.
   * @returns {Array} Returns a new array of elements that contain the given `properties`.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * _.where(stooges, { 'age': 40 });
   * // => [{ 'name': 'moe', 'age': 40 }]
   */
  var where = createIterator(filterIteratorOptions, {
    'args': 'collection, properties',
    'top':
      'var props = [];\n' +
      'forIn(properties, function(value, prop) { props.push(prop) });\n' +
      'var propsLength = props.length',
    'inLoop':
      'for (var pass = true, propIndex = 0; propIndex < propsLength; propIndex++) {\n' +
      '  var prop = props[propIndex];\n' +
      '  if (!(pass = value[prop] === properties[prop])) break\n' +
      '}\n' +
      'pass && result.push(value)'
  });

  /*--------------------------------------------------------------------------*/

  /**
   * Creates an array with all falsey values of `array` removed. The values
   * `false`, `null`, `0`, `""`, `undefined` and `NaN` are all falsey.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var index = -1,
        length = array ? array.length : 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (value) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Creates an array of `array` elements not present in the other arrays
   * using strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Array} [array1, array2, ...] Arrays to check.
   * @returns {Array} Returns a new array of `array` elements not present in the
   *  other arrays.
   * @example
   *
   * _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
   * // => [1, 3, 4]
   */
  function difference(array) {
    var result = [];
    if (!array) {
      return result;
    }
    var index = -1,
        length = array.length,
        flattened = concat.apply(ArrayProto, arguments),
        contains = cachedContains(flattened, length);

    while (++index < length) {
      var value = array[index];
      if (!contains(value)) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the first element of the `array`. Pass `n` to return the first `n`
   * elements of the `array`.
   *
   * @static
   * @memberOf _
   * @alias head, take
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param- {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the first element or an array of the first `n`
   *  elements of `array`.
   * @example
   *
   * _.first([5, 4, 3, 2, 1]);
   * // => 5
   */
  function first(array, n, guard) {
    if (array) {
      return (n == null || guard) ? array[0] : slice.call(array, 0, n);
    }
  }

  /**
   * Flattens a nested array (the nesting can be to any depth). If `shallow` is
   * truthy, `array` will only be flattened a single level.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to compact.
   * @param {Boolean} shallow A flag to indicate only flattening a single level.
   * @returns {Array} Returns a new flattened array.
   * @example
   *
   * _.flatten([1, [2], [3, [[4]]]]);
   * // => [1, 2, 3, 4];
   *
   * _.flatten([1, [2], [3, [[4]]]], true);
   * // => [1, 2, 3, [[4]]];
   */
  function flatten(array, shallow) {
    var index = -1,
        length = array ? array.length : 0,
        result = [];

    while (++index < length) {
      var value = array[index];

      // recursively flatten arrays (susceptible to call stack limits)
      if (isArray(value)) {
        push.apply(result, shallow ? value : flatten(value));
      } else {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the index at which the first occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`. If the `array` is already
   * sorted, passing `true` for `fromIndex` will run a faster binary search.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Boolean|Number} [fromIndex=0] The index to start searching from or
   *  `true` to perform a binary search on a sorted `array`.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 1
   *
   * _.indexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 4
   *
   * _.indexOf([1, 1, 2, 2, 3, 3], 2, true);
   * // => 2
   */
  function indexOf(array, value, fromIndex) {
    var index = -1,
        length = array ? array.length : 0;

    if (typeof fromIndex == 'number') {
      index = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0) - 1;
    } else if (fromIndex) {
      index = sortedIndex(array, value);
      return array[index] === value ? index : -1;
    }
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Gets all but the last element of `array`. Pass `n` to exclude the last `n`
   * elements from the result.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param- {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the last element or `n` elements of `array`.
   * @example
   *
   * _.initial([3, 2, 1]);
   * // => [3, 2]
   */
  function initial(array, n, guard) {
    return array
      ? slice.call(array, 0, -((n == null || guard) ? 1 : n))
      : [];
  }

  /**
   * Computes the intersection of all the passed-in arrays using strict equality
   * for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique elements, in order, that are
   *  present in **all** of the arrays.
   * @example
   *
   * _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2]
   */
  function intersection(array) {
    var argsLength = arguments.length,
        cache = [],
        index = -1,
        length = array ? array.length : 0,
        result = [];

    array: while (++index < length) {
      var value = array[index];
      if (indexOf(result, value) < 0) {
        for (var argsIndex = 1; argsIndex < argsLength; argsIndex++) {
          if (!(cache[argsIndex] || (cache[argsIndex] = cachedContains(arguments[argsIndex])))(value)) {
            continue array;
          }
        }
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Gets the last element of the `array`. Pass `n` to return the last `n`
   * elements of the `array`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param- {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Mixed} Returns the last element or an array of the last `n`
   *  elements of `array`.
   * @example
   *
   * _.last([3, 2, 1]);
   * // => 1
   */
  function last(array, n, guard) {
    if (array) {
      var length = array.length;
      return (n == null || guard) ? array[length - 1] : slice.call(array, -n || length);
    }
  }

  /**
   * Gets the index at which the last occurrence of `value` is found using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to search.
   * @param {Mixed} value The value to search for.
   * @param {Number} [fromIndex=array.length-1] The index to start searching from.
   * @returns {Number} Returns the index of the matched value or `-1`.
   * @example
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
   * // => 4
   *
   * _.lastIndexOf([1, 2, 3, 1, 2, 3], 2, 3);
   * // => 1
   */
  function lastIndexOf(array, value, fromIndex) {
    var index = array ? array.length : 0;
    if (typeof fromIndex == 'number') {
      index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
    }
    while (index--) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Creates an object composed from arrays of `keys` and `values`. Pass either
   * a single two dimensional array, i.e. `[[key1, value1], [key2, value2]]`, or
   * two arrays, one of `keys` and one of corresponding `values`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} keys The array of keys.
   * @param {Array} [values=[]] The array of values.
   * @returns {Object} Returns an object composed of the given keys and
   *  corresponding values.
   * @example
   *
   * _.object(['moe', 'larry', 'curly'], [30, 40, 50]);
   * // => { 'moe': 30, 'larry': 40, 'curly': 50 }
   */
  function object(keys, values) {
    var index = -1,
        length = keys ? keys.length : 0,
        result = {};

    while (++index < length) {
      var key = keys[index];
      if (values) {
        result[key] = values[index];
      } else {
        result[key[0]] = key[1];
      }
    }
    return result;
  }

  /**
   * Creates an array of numbers (positive and/or negative) progressing from
   * `start` up to but not including `stop`. This method is a port of Python's
   * `range()` function. See http://docs.python.org/library/functions.html#range.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Number} [start=0] The start of the range.
   * @param {Number} end The end of the range.
   * @param {Number} [step=1] The value to increment or descrement by.
   * @returns {Array} Returns a new range array.
   * @example
   *
   * _.range(10);
   * // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
   *
   * _.range(1, 11);
   * // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
   *
   * _.range(0, 30, 5);
   * // => [0, 5, 10, 15, 20, 25]
   *
   * _.range(0, -10, -1);
   * // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
   *
   * _.range(0);
   * // => []
   */
  function range(start, end, step) {
    start = +start || 0;
    step = +step || 1;

    if (end == null) {
      end = start;
      start = 0;
    }
    // use `Array(length)` so V8 will avoid the slower "dictionary" mode
    // http://www.youtube.com/watch?v=XAqIpGU8ZZk#t=16m27s
    var index = -1,
        length = nativeMax(0, ceil((end - start) / step)),
        result = Array(length);

    while (++index < length) {
      result[index] = start;
      start += step;
    }
    return result;
  }

  /**
   * The opposite of `_.initial`, this method gets all but the first value of
   * `array`. Pass `n` to exclude the first `n` values from the result.
   *
   * @static
   * @memberOf _
   * @alias drop, tail
   * @category Arrays
   * @param {Array} array The array to query.
   * @param {Number} [n] The number of elements to return.
   * @param- {Object} [guard] Internally used to allow this method to work with
   *  others like `_.map` without using their callback `index` argument for `n`.
   * @returns {Array} Returns all but the first value or `n` values of `array`.
   * @example
   *
   * _.rest([3, 2, 1]);
   * // => [2, 1]
   */
  function rest(array, n, guard) {
    return array
      ? slice.call(array, (n == null || guard) ? 1 : n)
      : [];
  }

  /**
   * Uses a binary search to determine the smallest index at which the `value`
   * should be inserted into `array` in order to maintain the sort order of the
   * sorted `array`. If `callback` is passed, it will be executed for `value` and
   * each element in `array` to compute their sort ranking. The `callback` is
   * bound to `thisArg` and invoked with one argument; (value). The `callback`
   * argument may also be the name of a property to order by.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to iterate over.
   * @param {Mixed} value The value to evaluate.
   * @param {Function|String} [callback=identity|property] The function called
   *  per iteration or property name to order by.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Number} Returns the index at which the value should be inserted
   *  into `array`.
   * @example
   *
   * _.sortedIndex([20, 30, 50], 40);
   * // => 2
   *
   * _.sortedIndex([{ 'x': 20 }, { 'x': 30 }, { 'x': 50 }], { 'x': 40 }, 'x');
   * // => 2
   *
   * var dict = {
   *   'wordToNumber': { 'twenty': 20, 'thirty': 30, 'fourty': 40, 'fifty': 50 }
   * };
   *
   * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
   *   return dict.wordToNumber[word];
   * });
   * // => 2
   *
   * _.sortedIndex(['twenty', 'thirty', 'fifty'], 'fourty', function(word) {
   *   return this.wordToNumber[word];
   * }, dict);
   * // => 2
   */
  function sortedIndex(array, value, callback, thisArg) {
    var low = 0,
        high = array ? array.length : low;

    if (callback) {
      callback = createCallback(callback, thisArg);
      value = callback(value);
      while (low < high) {
        var mid = (low + high) >>> 1;
        callback(array[mid]) < value ? low = mid + 1 : high = mid;
      }
    } else {
      while (low < high) {
        var mid = (low + high) >>> 1;
        array[mid] < value ? low = mid + 1 : high = mid;
      }
    }
    return low;
  }

  /**
   * Computes the union of the passed-in arrays using strict equality for
   * comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of unique values, in order, that are
   *  present in one or more of the arrays.
   * @example
   *
   * _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
   * // => [1, 2, 3, 101, 10]
   */
  function union() {
    var index = -1,
        flattened = concat.apply(ArrayProto, arguments),
        length = flattened.length,
        result = [];

    while (++index < length) {
      var value = flattened[index];
      if (indexOf(result, value) < 0) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Creates a duplicate-value-free version of the `array` using strict equality
   * for comparisons, i.e. `===`. If the `array` is already sorted, passing `true`
   * for `isSorted` will run a faster algorithm. If `callback` is passed, each
   * element of `array` is passed through a callback` before uniqueness is computed.
   * The `callback` is bound to `thisArg` and invoked with three arguments; (value, index, array).
   *
   * @static
   * @memberOf _
   * @alias unique
   * @category Arrays
   * @param {Array} array The array to process.
   * @param {Boolean} [isSorted=false] A flag to indicate that the `array` is already sorted.
   * @param {Function} [callback=identity] The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a duplicate-value-free array.
   * @example
   *
   * _.uniq([1, 2, 1, 3, 1]);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 1, 2, 2, 3], true);
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return Math.floor(num); });
   * // => [1, 2, 3]
   *
   * _.uniq([1, 2, 1.5, 3, 2.5], function(num) { return this.floor(num); }, Math);
   * // => [1, 2, 3]
   */
  function uniq(array, isSorted, callback, thisArg) {
    var index = -1,
        length = array ? array.length : 0,
        result = [],
        seen = [];

    // juggle arguments
    if (typeof isSorted == 'function') {
      thisArg = callback;
      callback = isSorted;
      isSorted = false;
    }
    callback = createCallback(callback, thisArg);
    while (++index < length) {
      var computed = callback(array[index], index, array);
      if (isSorted
            ? !index || seen[seen.length - 1] !== computed
            : indexOf(seen, computed) < 0
          ) {
        seen.push(computed);
        result.push(array[index]);
      }
    }
    return result;
  }

  /**
   * Creates an array with all occurrences of the passed values removed using
   * strict equality for comparisons, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} array The array to filter.
   * @param {Mixed} [value1, value2, ...] Values to remove.
   * @returns {Array} Returns a new filtered array.
   * @example
   *
   * _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
   * // => [2, 3, 4]
   */
  function without(array) {
    var index = -1,
        length = array ? array.length : 0,
        contains = cachedContains(arguments, 1, 20),
        result = [];

    while (++index < length) {
      var value = array[index];
      if (!contains(value)) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Groups the elements of each array at their corresponding indexes. Useful for
   * separate data sources that are coordinated through matching array indexes.
   * For a matrix of nested arrays, `_.zip.apply(...)` can transpose the matrix
   * in a similar fashion.
   *
   * @static
   * @memberOf _
   * @category Arrays
   * @param {Array} [array1, array2, ...] Arrays to process.
   * @returns {Array} Returns a new array of grouped elements.
   * @example
   *
   * _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
   * // => [['moe', 30, true], ['larry', 40, false], ['curly', 50, false]]
   */
  function zip(array) {
    var index = -1,
        length = array ? max(pluck(arguments, 'length')) : 0,
        result = Array(length);

    while (++index < length) {
      result[index] = pluck(arguments, index);
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a function that is restricted to executing only after it is
   * called `n` times.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Number} n The number of times the function must be called before
   * it is executed.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var renderNotes = _.after(notes.length, render);
   * _.forEach(notes, function(note) {
   *   note.asyncSave({ 'success': renderNotes });
   * });
   * // `renderNotes` is run once, after all notes have saved
   */
  function after(n, func) {
    if (n < 1) {
      return func();
    }
    return function() {
      if (--n < 1) {
        return func.apply(this, arguments);
      }
    };
  }

  /**
   * Creates a function that, when called, invokes `func` with the `this`
   * binding of `thisArg` and prepends any additional `bind` arguments to those
   * passed to the bound function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to bind.
   * @param {Mixed} [thisArg] The `this` binding of `func`.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * var func = function(greeting) {
   *   return greeting + ' ' + this.name;
   * };
   *
   * func = _.bind(func, { 'name': 'moe' }, 'hi');
   * func();
   * // => 'hi moe'
   */
  function bind(func, thisArg) {
    // use `Function#bind` if it exists and is fast
    // (in V8 `Function#bind` is slower except when partially applied)
    return isBindFast || (nativeBind && arguments.length > 2)
      ? nativeBind.call.apply(nativeBind, arguments)
      : createBound(func, thisArg, slice.call(arguments, 2));
  }

  /**
   * Binds methods on `object` to `object`, overwriting the existing method.
   * If no method names are provided, all the function properties of `object`
   * will be bound.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Object} object The object to bind and assign the bound methods to.
   * @param {String} [methodName1, methodName2, ...] Method names on the object to bind.
   * @returns {Object} Returns `object`.
   * @example
   *
   * var buttonView = {
   *  'label': 'lodash',
   *  'onClick': function() { alert('clicked: ' + this.label); }
   * };
   *
   * _.bindAll(buttonView);
   * jQuery('#lodash_button').on('click', buttonView.onClick);
   * // => When the button is clicked, `this.label` will have the correct value
   */
  var bindAll = createIterator({
    'useHas': false,
    'useStrict': false,
    'args': 'object',
    'top':
      'var funcs = arguments,\n' +
      '    index = 0,\n' +
      '    length = funcs.length;\n' +
      'if (length > 1) {\n' +
      '  while (++index < length) {\n' +
      '    result[funcs[index]] = bind(result[funcs[index]], result)\n' +
      '  }\n' +
      '  return result\n' +
      '}',
    'inLoop':
      'if (isFunction(value)) result[index] = bind(value, result)'
  });

  /**
   * Creates a function that is the composition of the passed functions,
   * where each function consumes the return value of the function that follows.
   * In math terms, composing the functions `f()`, `g()`, and `h()` produces `f(g(h()))`.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} [func1, func2, ...] Functions to compose.
   * @returns {Function} Returns the new composed function.
   * @example
   *
   * var greet = function(name) { return 'hi: ' + name; };
   * var exclaim = function(statement) { return statement + '!'; };
   * var welcome = _.compose(exclaim, greet);
   * welcome('moe');
   * // => 'hi: moe!'
   */
  function compose() {
    var funcs = arguments;
    return function() {
      var args = arguments,
          length = funcs.length;

      while (length--) {
        args = [funcs[length].apply(this, args)];
      }
      return args[0];
    };
  }

  /**
   * Creates a function that will delay the execution of `func` until after
   * `wait` milliseconds have elapsed since the last time it was invoked. Pass
   * `true` for `immediate` to cause debounce to invoke `func` on the leading,
   * instead of the trailing, edge of the `wait` timeout. Subsequent calls to
   * the debounced function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to debounce.
   * @param {Number} wait The number of milliseconds to delay.
   * @param {Boolean} immediate A flag to indicate execution is on the leading
   *  edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * var lazyLayout = _.debounce(calculateLayout, 300);
   * jQuery(window).on('resize', lazyLayout);
   */
  function debounce(func, wait, immediate) {
    var args,
        result,
        thisArg,
        timeoutId;

    function delayed() {
      timeoutId = null;
      if (!immediate) {
        result = func.apply(thisArg, args);
      }
    }

    return function() {
      var isImmediate = immediate && !timeoutId;
      args = arguments;
      thisArg = this;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(delayed, wait);

      if (isImmediate) {
        result = func.apply(thisArg, args);
      }
      return result;
    };
  }

  /**
   * Executes the `func` function after `wait` milliseconds. Additional arguments
   * will be passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to delay.
   * @param {Number} wait The number of milliseconds to delay execution.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * var log = _.bind(console.log, console);
   * _.delay(log, 1000, 'logged later');
   * // => 'logged later' (Appears after one second.)
   */
  function delay(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function() { return func.apply(undefined, args); }, wait);
  }

  /**
   * Defers executing the `func` function until the current call stack has cleared.
   * Additional arguments will be passed to `func` when it is invoked.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to defer.
   * @param {Mixed} [arg1, arg2, ...] Arguments to invoke the function with.
   * @returns {Number} Returns the `setTimeout` timeout id.
   * @example
   *
   * _.defer(function() { alert('deferred'); });
   * // returns from the function before `alert` is called
   */
  function defer(func) {
    var args = slice.call(arguments, 1);
    return setTimeout(function() { return func.apply(undefined, args); }, 1);
  }

  /**
   * Creates a function that, when called, invokes `object[methodName]` and
   * prepends any additional `lateBind` arguments to those passed to the bound
   * function. This method differs from `_.bind` by allowing bound functions to
   * reference methods that will be redefined or don't yet exist.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Object} object The object the method belongs to.
   * @param {String} methodName The method name.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * var object = {
   *   'name': 'moe',
   *   'greet': function(greeting) {
   *     return greeting + ' ' + this.name;
   *   }
   * };
   *
   * var func = _.lateBind(object, 'greet', 'hi');
   * func();
   * // => 'hi moe'
   *
   * object.greet = function(greeting) {
   *   return greeting + ', ' + this.name + '!';
   * };
   *
   * func();
   * // => 'hi, moe!'
   */
  function lateBind(object, methodName) {
    return createBound(methodName, object, slice.call(arguments, 2));
  }

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * passed, it will be used to determine the cache key for storing the result
   * based on the arguments passed to the memoized function. By default, the first
   * argument passed to the memoized function is used as the cache key.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] A function used to resolve the cache key.
   * @returns {Function} Returns the new memoizing function.
   * @example
   *
   * var fibonacci = _.memoize(function(n) {
   *   return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
   * });
   */
  function memoize(func, resolver) {
    var cache = {};
    return function() {
      var prop = resolver ? resolver.apply(this, arguments) : arguments[0];
      return hasOwnProperty.call(cache, prop)
        ? cache[prop]
        : (cache[prop] = func.apply(this, arguments));
    };
  }

  /**
   * Creates a function that is restricted to one execution. Repeat calls to
   * the function will return the value of the first call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // Application is only created once.
   */
  function once(func) {
    var result,
        ran = false;

    return function() {
      if (ran) {
        return result;
      }
      ran = true;
      result = func.apply(this, arguments);

      // clear the `func` variable so the function may be garbage collected
      func = null;
      return result;
    };
  }

  /**
   * Creates a function that, when called, invokes `func` with any additional
   * `partial` arguments prepended to those passed to the new function. This method
   * is similar to `bind`, except it does **not** alter the `this` binding.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to partially apply arguments to.
   * @param {Mixed} [arg1, arg2, ...] Arguments to be partially applied.
   * @returns {Function} Returns the new partially applied function.
   * @example
   *
   * var greet = function(greeting, name) { return greeting + ': ' + name; };
   * var hi = _.partial(greet, 'hi');
   * hi('moe');
   * // => 'hi: moe'
   */
  function partial(func) {
    return createBound(func, slice.call(arguments, 1));
  }

  /**
   * Creates a function that, when executed, will only call the `func`
   * function at most once per every `wait` milliseconds. If the throttled
   * function is invoked more than once during the `wait` timeout, `func` will
   * also be called on the trailing edge of the timeout. Subsequent calls to the
   * throttled function will return the result of the last `func` call.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Function} func The function to throttle.
   * @param {Number} wait The number of milliseconds to throttle executions to.
   * @returns {Function} Returns the new throttled function.
   * @example
   *
   * var throttled = _.throttle(updatePosition, 100);
   * jQuery(window).on('scroll', throttled);
   */
  function throttle(func, wait) {
    var args,
        result,
        thisArg,
        timeoutId,
        lastCalled = 0;

    function trailingCall() {
      lastCalled = new Date;
      timeoutId = null;
      result = func.apply(thisArg, args);
    }

    return function() {
      var now = new Date,
          remain = wait - (now - lastCalled);

      args = arguments;
      thisArg = this;

      if (remain <= 0) {
        clearTimeout(timeoutId);
        lastCalled = now;
        result = func.apply(thisArg, args);
      }
      else if (!timeoutId) {
        timeoutId = setTimeout(trailingCall, remain);
      }
      return result;
    };
  }

  /**
   * Creates a function that passes `value` to the `wrapper` function as its
   * first argument. Additional arguments passed to the new function are appended
   * to those passed to the `wrapper` function.
   *
   * @static
   * @memberOf _
   * @category Functions
   * @param {Mixed} value The value to wrap.
   * @param {Function} wrapper The wrapper function.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var hello = function(name) { return 'hello: ' + name; };
   * hello = _.wrap(hello, function(func) {
   *   return 'before, ' + func('moe') + ', after';
   * });
   * hello();
   * // => 'before, hello: moe, after'
   */
  function wrap(value, wrapper) {
    return function() {
      var args = [value];
      if (arguments.length) {
        push.apply(args, arguments);
      }
      return wrapper.apply(this, args);
    };
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
   * corresponding HTML entities.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} string The string to escape.
   * @returns {String} Returns the escaped string.
   * @example
   *
   * _.escape('Moe, Larry & Curly');
   * // => "Moe, Larry &amp; Curly"
   */
  function escape(string) {
    return string == null ? '' : (string + '').replace(reUnescapedHtml, escapeHtmlChar);
  }

  /**
   * This function returns the first argument passed to it.
   *
   * Note: It is used throughout Lo-Dash as a default callback.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Mixed} value Any value.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * var moe = { 'name': 'moe' };
   * moe === _.identity(moe);
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Adds functions properties of `object` to the `lodash` function and chainable
   * wrapper.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object of function properties to add to `lodash`.
   * @example
   *
   * _.mixin({
   *   'capitalize': function(string) {
   *     return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
   *   }
   * });
   *
   * _.capitalize('larry');
   * // => 'Larry'
   *
   * _('curly').capitalize();
   * // => 'Curly'
   */
  function mixin(object) {
    forEach(functions(object), function(methodName) {
      var func = lodash[methodName] = object[methodName];

      lodash.prototype[methodName] = function() {
        var args = [this.__wrapped__];
        if (arguments.length) {
          push.apply(args, arguments);
        }
        var result = func.apply(lodash, args);
        if (this.__chain__) {
          result = new lodash(result);
          result.__chain__ = true;
        }
        return result;
      };
    });
  }

  /**
   * Reverts the '_' variable to its previous value and returns a reference to
   * the `lodash` function.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @returns {Function} Returns the `lodash` function.
   * @example
   *
   * var lodash = _.noConflict();
   */
  function noConflict() {
    window._ = oldDash;
    return this;
  }

  /**
   * Produces a random number between `min` and `max` (inclusive). If only one
   * argument is passed, a number between `0` and the given number will be returned.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Number} [min=0] The minimum possible value.
   * @param {Number} [max=1] The maximum possible value.
   * @returns {Number} Returns a random number.
   * @example
   *
   * _.random(0, 5);
   * // => a number between 1 and 5
   *
   * _.random(5);
   * // => also a number between 1 and 5
   */
  function random(min, max) {
    if (min == null && max == null) {
      max = 1;
    }
    min = +min || 0;
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + floor(nativeRandom() * ((+max || 0) - min + 1));
  }

  /**
   * Resolves the value of `property` on `object`. If `property` is a function
   * it will be invoked and its result returned, else the property value is
   * returned. If `object` is falsey, then `null` is returned.
   *
   * @deprecated
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Object} object The object to inspect.
   * @param {String} property The property to get the value of.
   * @returns {Mixed} Returns the resolved value.
   * @example
   *
   * var object = {
   *   'cheese': 'crumpets',
   *   'stuff': function() {
   *     return 'nonsense';
   *   }
   * };
   *
   * _.result(object, 'cheese');
   * // => 'crumpets'
   *
   * _.result(object, 'stuff');
   * // => 'nonsense'
   */
  function result(object, property) {
    // based on Backbone's private `getValue` function
    // https://github.com/documentcloud/backbone/blob/0.9.2/backbone.js#L1419-1424
    var value = object ? object[property] : null;
    return isFunction(value) ? object[property]() : value;
  }

  /**
   * A micro-templating method that handles arbitrary delimiters, preserves
   * whitespace, and correctly escapes quotes within interpolated code.
   *
   * Note: In the development build `_.template` utilizes sourceURLs for easier
   * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
   *
   * Note: Lo-Dash may be used in Chrome extensions by either creating a `lodash csp`
   * build and avoiding `_.template` use, or loading Lo-Dash in a sandboxed page.
   * See http://developer.chrome.com/trunk/extensions/sandboxingEval.html
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} text The template text.
   * @param {Obect} data The data object used to populate the text.
   * @param {Object} options The options object.
   * @returns {Function|String} Returns a compiled function when no `data` object
   *  is given, else it returns the interpolated text.
   * @example
   *
   * // using a compiled template
   * var compiled = _.template('hello: <%= name %>');
   * compiled({ 'name': 'moe' });
   * // => 'hello: moe'
   *
   * var list = '<% _.forEach(people, function(name) { %><li><%= name %></li><% }); %>';
   * _.template(list, { 'people': ['moe', 'larry', 'curly'] });
   * // => '<li>moe</li><li>larry</li><li>curly</li>'
   *
   * // using the "escape" delimiter to escape HTML in data property values
   * _.template('<b><%- value %></b>', { 'value': '<script>' });
   * // => '<b>&lt;script></b>'
   *
   * // using the internal `print` function in "evaluate" delimiters
   * _.template('<% print("Hello " + epithet); %>.', { 'epithet': 'stooge' });
   * // => 'Hello stooge.'
   *
   * // using custom template delimiter settings
   * _.templateSettings = {
   *   'interpolate': /\{\{([\s\S]+?)\}\}/g
   * };
   *
   * _.template('Hello {{ name }}!', { 'name': 'Mustache' });
   * // => 'Hello Mustache!'
   *
   * // using the `variable` option to ensure a with-statement isn't used in the compiled template
   * var compiled = _.template('hello: <%= data.name %>', null, { 'variable': 'data' });
   * compiled.source;
   * // => function(data) {
   *   var __t, __p = '', __e = _.escape;
   *   __p += 'hello: ' + ((__t = ( data.name )) == null ? '' : __t);
   *   return __p;
   * }
   *
   * // using the `source` property to inline compiled templates for meaningful
   * // line numbers in error messages and a stack trace
   * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
   *   var JST = {\
   *     "main": ' + _.template(mainText).source + '\
   *   };\
   * ');
   */
  function template(text, data, options) {
    // based on John Resig's `tmpl` implementation
    // http://ejohn.org/blog/javascript-micro-templating/
    // and Laura Doktorova's doT.js
    // https://github.com/olado/doT
    text || (text = '');
    options || (options = {});

    var isEvaluating,
        result,
        index = 0,
        settings = lodash.templateSettings,
        source = "__p += '",
        variable = options.variable || settings.variable,
        hasVariable = variable;

    // compile regexp to match each delimiter
    var reDelimiters = RegExp(
      (options.escape || settings.escape || reNoMatch).source + '|' +
      (options.interpolate || settings.interpolate || reNoMatch).source + '|' +
      (options.evaluate || settings.evaluate || reNoMatch).source + '|$'
    , 'g');

    text.replace(reDelimiters, function(match, escapeValue, interpolateValue, evaluateValue, offset) {
      // escape characters that cannot be included in string literals
      source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

      // replace delimiters with snippets
      source +=
        escapeValue ? "' +\n__e(" + escapeValue + ") +\n'" :
        evaluateValue ? "';\n" + evaluateValue + ";\n__p += '" :
        interpolateValue ? "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'" : '';

      isEvaluating || (isEvaluating = evaluateValue || reComplexDelimiter.test(escapeValue || interpolateValue));
      index = offset + match.length;
    });

    source += "';\n";

    // if `variable` is not specified and the template contains "evaluate"
    // delimiters, wrap a with-statement around the generated code to add the
    // data object to the top of the scope chain
    if (!hasVariable) {
      variable = 'obj';
      if (isEvaluating) {
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      else {
        // avoid a with-statement by prepending data object references to property names
        var reDoubleVariable = RegExp('(\\(\\s*)' + variable + '\\.' + variable + '\\b', 'g');
        source = source
          .replace(reInsertVariable, '$&' + variable + '.')
          .replace(reDoubleVariable, '$1__d');
      }
    }

    // cleanup code by stripping empty strings
    source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
      .replace(reEmptyStringMiddle, '$1')
      .replace(reEmptyStringTrailing, '$1;');

    // frame code as the function body
    source = 'function(' + variable + ') {\n' +
      (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
      'var __t, __p = \'\', __e = _.escape' +
      (isEvaluating
        ? ', __j = Array.prototype.join;\n' +
          'function print() { __p += __j.call(arguments, \'\') }\n'
        : (hasVariable ? '' : ', __d = ' + variable + '.' + variable + ' || ' + variable) + ';\n'
      ) +
      source +
      'return __p\n}';

    // use a sourceURL for easier debugging
    // http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
    var sourceURL = useSourceURL
      ? '\n//@ sourceURL=/lodash/template/source[' + (templateCounter++) + ']'
      : '';

    try {
      result = Function('_', 'return ' + source + sourceURL)(lodash);
    } catch(e) {
      e.source = source;
      throw e;
    }

    if (data) {
      return result(data);
    }
    // provide the compiled function's source via its `toString` method, in
    // supported environments, or the `source` property as a convenience for
    // inlining compiled templates during the build process
    result.source = source;
    return result;
  }

  /**
   * Executes the `callback` function `n` times, returning an array of the results
   * of each `callback` execution. The `callback` is bound to `thisArg` and invoked
   * with one argument; (index).
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {Number} n The number of times to execute the callback.
   * @param {Function} callback The function called per iteration.
   * @param {Mixed} [thisArg] The `this` binding of `callback`.
   * @returns {Array} Returns a new array of the results of each `callback` execution.
   * @example
   *
   * var diceRolls = _.times(3, _.partial(_.random, 1, 6));
   * // => [3, 6, 4]
   *
   * _.times(3, function(n) { mage.castSpell(n); });
   * // => calls `mage.castSpell(n)` three times, passing `n` of `0`, `1`, and `2` respectively
   *
   * _.times(3, function(n) { this.cast(n); }, mage);
   * // => also calls `mage.castSpell(n)` three times
   */
  function times(n, callback, thisArg) {
    n = +n || 0;
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = callback.call(thisArg, index);
    }
    return result;
  }

  /**
   * Converts the HTML entities `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#x27;`
   * in `string` to their corresponding characters.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} string The string to unescape.
   * @returns {String} Returns the unescaped string.
   * @example
   *
   * _.unescape('Moe, Larry &amp; Curly');
   * // => "Moe, Larry & Curly"
   */
  function unescape(string) {
    return string == null ? '' : (string + '').replace(reEscapedHtml, unescapeHtmlChar);
  }

  /**
   * Generates a unique id. If `prefix` is passed, the id will be appended to it.
   *
   * @static
   * @memberOf _
   * @category Utilities
   * @param {String} [prefix] The value to prefix the id with.
   * @returns {Number|String} Returns a numeric id if no prefix is passed, else
   *  a string id may be returned.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   */
  function uniqueId(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Wraps the value in a `lodash` wrapper object.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to wrap.
   * @returns {Object} Returns the wrapper object.
   * @example
   *
   * var stooges = [
   *   { 'name': 'moe', 'age': 40 },
   *   { 'name': 'larry', 'age': 50 },
   *   { 'name': 'curly', 'age': 60 }
   * ];
   *
   * var youngest = _.chain(stooges)
   *     .sortBy(function(stooge) { return stooge.age; })
   *     .map(function(stooge) { return stooge.name + ' is ' + stooge.age; })
   *     .first()
   *     .value();
   * // => 'moe is 40'
   */
  function chain(value) {
    value = new lodash(value);
    value.__chain__ = true;
    return value;
  }

  /**
   * Invokes `interceptor` with the `value` as the first argument, and then
   * returns `value`. The purpose of this method is to "tap into" a method chain,
   * in order to perform operations on intermediate results within the chain.
   *
   * @static
   * @memberOf _
   * @category Chaining
   * @param {Mixed} value The value to pass to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @returns {Mixed} Returns `value`.
   * @example
   *
   * _.chain([1, 2, 3, 200])
   *  .filter(function(num) { return num % 2 == 0; })
   *  .tap(alert)
   *  .map(function(num) { return num * num })
   *  .value();
   * // => // [2, 200] (alerted)
   * // => [4, 40000]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /**
   * Enables method chaining on the wrapper object.
   *
   * @name chain
   * @deprecated
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapper object.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperChain() {
    this.__chain__ = true;
    return this;
  }

  /**
   * Extracts the wrapped value.
   *
   * @name value
   * @memberOf _
   * @category Chaining
   * @returns {Mixed} Returns the wrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return this.__wrapped__;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type String
   */
  lodash.VERSION = '0.8.2';

  // assign static methods
  lodash.after = after;
  lodash.bind = bind;
  lodash.bindAll = bindAll;
  lodash.chain = chain;
  lodash.clone = clone;
  lodash.compact = compact;
  lodash.compose = compose;
  lodash.contains = contains;
  lodash.countBy = countBy;
  lodash.debounce = debounce;
  lodash.defaults = defaults;
  lodash.defer = defer;
  lodash.delay = delay;
  lodash.difference = difference;
  lodash.escape = escape;
  lodash.every = every;
  lodash.extend = extend;
  lodash.filter = filter;
  lodash.find = find;
  lodash.first = first;
  lodash.flatten = flatten;
  lodash.forEach = forEach;
  lodash.forIn = forIn;
  lodash.forOwn = forOwn;
  lodash.functions = functions;
  lodash.groupBy = groupBy;
  lodash.has = has;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.initial = initial;
  lodash.intersection = intersection;
  lodash.invert = invert;
  lodash.invoke = invoke;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isBoolean = isBoolean;
  lodash.isDate = isDate;
  lodash.isElement = isElement;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFinite = isFinite;
  lodash.isFunction = isFunction;
  lodash.isNaN = isNaN;
  lodash.isNull = isNull;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isPlainObject = isPlainObject;
  lodash.isRegExp = isRegExp;
  lodash.isString = isString;
  lodash.isUndefined = isUndefined;
  lodash.keys = keys;
  lodash.last = last;
  lodash.lastIndexOf = lastIndexOf;
  lodash.lateBind = lateBind;
  lodash.map = map;
  lodash.max = max;
  lodash.memoize = memoize;
  lodash.merge = merge;
  lodash.min = min;
  lodash.mixin = mixin;
  lodash.noConflict = noConflict;
  lodash.object = object;
  lodash.omit = omit;
  lodash.once = once;
  lodash.pairs = pairs;
  lodash.partial = partial;
  lodash.pick = pick;
  lodash.pluck = pluck;
  lodash.random = random;
  lodash.range = range;
  lodash.reduce = reduce;
  lodash.reduceRight = reduceRight;
  lodash.reject = reject;
  lodash.rest = rest;
  lodash.result = result;
  lodash.shuffle = shuffle;
  lodash.size = size;
  lodash.some = some;
  lodash.sortBy = sortBy;
  lodash.sortedIndex = sortedIndex;
  lodash.tap = tap;
  lodash.template = template;
  lodash.throttle = throttle;
  lodash.times = times;
  lodash.toArray = toArray;
  lodash.unescape = unescape;
  lodash.union = union;
  lodash.uniq = uniq;
  lodash.uniqueId = uniqueId;
  lodash.values = values;
  lodash.where = where;
  lodash.without = without;
  lodash.wrap = wrap;
  lodash.zip = zip;

  // assign aliases
  lodash.all = every;
  lodash.any = some;
  lodash.collect = map;
  lodash.detect = find;
  lodash.drop = rest;
  lodash.each = forEach;
  lodash.foldl = reduce;
  lodash.foldr = reduceRight;
  lodash.head = first;
  lodash.include = contains;
  lodash.inject = reduce;
  lodash.methods = functions;
  lodash.select = filter;
  lodash.tail = rest;
  lodash.take = first;
  lodash.unique = uniq;

  // add pseudo private properties used and removed during the build process
  lodash._iteratorTemplate = iteratorTemplate;
  lodash._shimKeys = shimKeys;

  /*--------------------------------------------------------------------------*/

  // add all static functions to `lodash.prototype`
  mixin(lodash);

  // add `lodash.prototype.chain` after calling `mixin()` to avoid overwriting
  // it with the wrapped `lodash.chain`
  lodash.prototype.chain = wrapperChain;
  lodash.prototype.value = wrapperValue;

  // add all mutator Array functions to the wrapper.
  forEach(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = ArrayProto[methodName];

    lodash.prototype[methodName] = function() {
      var value = this.__wrapped__;
      func.apply(value, arguments);

      // avoid array-like object bugs with `Array#shift` and `Array#splice` in
      // Firefox < 10 and IE < 9
      if (hasObjectSpliceBug && value.length === 0) {
        delete value[0];
      }
      if (this.__chain__) {
        value = new lodash(value);
        value.__chain__ = true;
      }
      return value;
    };
  });

  // add all accessor Array functions to the wrapper.
  forEach(['concat', 'join', 'slice'], function(methodName) {
    var func = ArrayProto[methodName];

    lodash.prototype[methodName] = function() {
      var value = this.__wrapped__,
          result = func.apply(value, arguments);

      if (this.__chain__) {
        result = new lodash(result);
        result.__chain__ = true;
      }
      return result;
    };
  });

  /*--------------------------------------------------------------------------*/

  // expose Lo-Dash
  // some AMD build optimizers, like r.js, check for specific condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose Lo-Dash to the global object even when an AMD loader is present in
    // case Lo-Dash was injected by a third-party script and not intended to be
    // loaded as a module. The global assignment can be reverted in the Lo-Dash
    // module via its `noConflict()` method.
    window._ = lodash;

    // define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module
    define(function() {
      return lodash;
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports) {
    // in Node.js or RingoJS v0.8.0+
    if (typeof module == 'object' && module && module.exports == freeExports) {
      (module.exports = lodash)._ = lodash;
    }
    // in Narwhal or RingoJS v0.7.0-
    else {
      freeExports._ = lodash;
    }
  }
  else {
    // in a browser or Rhino
    window._ = lodash;
  }
}(this));
// lib/handlebars/base.js

/*jshint eqnull:true*/
this.Handlebars = {};

(function(Handlebars) {

Handlebars.VERSION = "1.0.rc.1";

Handlebars.helpers  = {};
Handlebars.partials = {};

Handlebars.registerHelper = function(name, fn, inverse) {
  if(inverse) { fn.not = inverse; }
  this.helpers[name] = fn;
};

Handlebars.registerPartial = function(name, str) {
  this.partials[name] = str;
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Could not find property '" + arg + "'");
  }
});

var toString = Object.prototype.toString, functionType = "[object Function]";

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;


  var ret = "";
  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var ret = "", data;

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      if (data) { data.index = i; }
      ret = ret + fn(context[i], { data: data });
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

Handlebars.registerHelper('if', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if(!context || Handlebars.Utils.isEmpty(context)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  options.fn = inverse;
  options.inverse = fn;

  return Handlebars.helpers['if'].call(this, context, options);
});

Handlebars.registerHelper('with', function(context, options) {
  return options.fn(context);
});

Handlebars.registerHelper('log', function(context) {
  Handlebars.log(context);
});

}(this.Handlebars));
;
// lib/handlebars/compiler/parser.js
/* Jison generated parser */
var handlebars = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"root":3,"program":4,"EOF":5,"statements":6,"simpleInverse":7,"statement":8,"openInverse":9,"closeBlock":10,"openBlock":11,"mustache":12,"partial":13,"CONTENT":14,"COMMENT":15,"OPEN_BLOCK":16,"inMustache":17,"CLOSE":18,"OPEN_INVERSE":19,"OPEN_ENDBLOCK":20,"path":21,"OPEN":22,"OPEN_UNESCAPED":23,"OPEN_PARTIAL":24,"params":25,"hash":26,"DATA":27,"param":28,"STRING":29,"INTEGER":30,"BOOLEAN":31,"hashSegments":32,"hashSegment":33,"ID":34,"EQUALS":35,"pathSegments":36,"SEP":37,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"OPEN_PARTIAL",27:"DATA",29:"STRING",30:"INTEGER",31:"BOOLEAN",34:"ID",35:"EQUALS",37:"SEP"},
productions_: [0,[3,2],[4,3],[4,1],[4,0],[6,1],[6,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,3],[13,4],[7,2],[17,3],[17,2],[17,2],[17,1],[17,1],[25,2],[25,1],[28,1],[28,1],[28,1],[28,1],[28,1],[26,1],[32,2],[32,1],[33,3],[33,3],[33,3],[33,3],[33,3],[21,1],[36,3],[36,1]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$,_$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1: return $$[$0-1]; 
break;
case 2: this.$ = new yy.ProgramNode($$[$0-2], $$[$0]); 
break;
case 3: this.$ = new yy.ProgramNode($$[$0]); 
break;
case 4: this.$ = new yy.ProgramNode([]); 
break;
case 5: this.$ = [$$[$0]]; 
break;
case 6: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 7: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1].inverse, $$[$0-1], $$[$0]); 
break;
case 8: this.$ = new yy.BlockNode($$[$0-2], $$[$0-1], $$[$0-1].inverse, $$[$0]); 
break;
case 9: this.$ = $$[$0]; 
break;
case 10: this.$ = $$[$0]; 
break;
case 11: this.$ = new yy.ContentNode($$[$0]); 
break;
case 12: this.$ = new yy.CommentNode($$[$0]); 
break;
case 13: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 14: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 15: this.$ = $$[$0-1]; 
break;
case 16: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1]); 
break;
case 17: this.$ = new yy.MustacheNode($$[$0-1][0], $$[$0-1][1], true); 
break;
case 18: this.$ = new yy.PartialNode($$[$0-1]); 
break;
case 19: this.$ = new yy.PartialNode($$[$0-2], $$[$0-1]); 
break;
case 20: 
break;
case 21: this.$ = [[$$[$0-2]].concat($$[$0-1]), $$[$0]]; 
break;
case 22: this.$ = [[$$[$0-1]].concat($$[$0]), null]; 
break;
case 23: this.$ = [[$$[$0-1]], $$[$0]]; 
break;
case 24: this.$ = [[$$[$0]], null]; 
break;
case 25: this.$ = [[new yy.DataNode($$[$0])], null]; 
break;
case 26: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 27: this.$ = [$$[$0]]; 
break;
case 28: this.$ = $$[$0]; 
break;
case 29: this.$ = new yy.StringNode($$[$0]); 
break;
case 30: this.$ = new yy.IntegerNode($$[$0]); 
break;
case 31: this.$ = new yy.BooleanNode($$[$0]); 
break;
case 32: this.$ = new yy.DataNode($$[$0]); 
break;
case 33: this.$ = new yy.HashNode($$[$0]); 
break;
case 34: $$[$0-1].push($$[$0]); this.$ = $$[$0-1]; 
break;
case 35: this.$ = [$$[$0]]; 
break;
case 36: this.$ = [$$[$0-2], $$[$0]]; 
break;
case 37: this.$ = [$$[$0-2], new yy.StringNode($$[$0])]; 
break;
case 38: this.$ = [$$[$0-2], new yy.IntegerNode($$[$0])]; 
break;
case 39: this.$ = [$$[$0-2], new yy.BooleanNode($$[$0])]; 
break;
case 40: this.$ = [$$[$0-2], new yy.DataNode($$[$0])]; 
break;
case 41: this.$ = new yy.IdNode($$[$0]); 
break;
case 42: $$[$0-2].push($$[$0]); this.$ = $$[$0-2]; 
break;
case 43: this.$ = [$$[$0]]; 
break;
}
},
table: [{3:1,4:2,5:[2,4],6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],24:[1,15]},{1:[3]},{5:[1,16]},{5:[2,3],7:17,8:18,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,19],20:[2,3],22:[1,13],23:[1,14],24:[1,15]},{5:[2,5],14:[2,5],15:[2,5],16:[2,5],19:[2,5],20:[2,5],22:[2,5],23:[2,5],24:[2,5]},{4:20,6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],24:[1,15]},{4:21,6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],24:[1,15]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],24:[2,9]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],24:[2,10]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],24:[2,11]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],24:[2,12]},{17:22,21:23,27:[1,24],34:[1,26],36:25},{17:27,21:23,27:[1,24],34:[1,26],36:25},{17:28,21:23,27:[1,24],34:[1,26],36:25},{17:29,21:23,27:[1,24],34:[1,26],36:25},{21:30,34:[1,26],36:25},{1:[2,1]},{6:31,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],24:[1,15]},{5:[2,6],14:[2,6],15:[2,6],16:[2,6],19:[2,6],20:[2,6],22:[2,6],23:[2,6],24:[2,6]},{17:22,18:[1,32],21:23,27:[1,24],34:[1,26],36:25},{10:33,20:[1,34]},{10:35,20:[1,34]},{18:[1,36]},{18:[2,24],21:41,25:37,26:38,27:[1,45],28:39,29:[1,42],30:[1,43],31:[1,44],32:40,33:46,34:[1,47],36:25},{18:[2,25]},{18:[2,41],27:[2,41],29:[2,41],30:[2,41],31:[2,41],34:[2,41],37:[1,48]},{18:[2,43],27:[2,43],29:[2,43],30:[2,43],31:[2,43],34:[2,43],37:[2,43]},{18:[1,49]},{18:[1,50]},{18:[1,51]},{18:[1,52],21:53,34:[1,26],36:25},{5:[2,2],8:18,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,2],22:[1,13],23:[1,14],24:[1,15]},{14:[2,20],15:[2,20],16:[2,20],19:[2,20],22:[2,20],23:[2,20],24:[2,20]},{5:[2,7],14:[2,7],15:[2,7],16:[2,7],19:[2,7],20:[2,7],22:[2,7],23:[2,7],24:[2,7]},{21:54,34:[1,26],36:25},{5:[2,8],14:[2,8],15:[2,8],16:[2,8],19:[2,8],20:[2,8],22:[2,8],23:[2,8],24:[2,8]},{14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],24:[2,14]},{18:[2,22],21:41,26:55,27:[1,45],28:56,29:[1,42],30:[1,43],31:[1,44],32:40,33:46,34:[1,47],36:25},{18:[2,23]},{18:[2,27],27:[2,27],29:[2,27],30:[2,27],31:[2,27],34:[2,27]},{18:[2,33],33:57,34:[1,58]},{18:[2,28],27:[2,28],29:[2,28],30:[2,28],31:[2,28],34:[2,28]},{18:[2,29],27:[2,29],29:[2,29],30:[2,29],31:[2,29],34:[2,29]},{18:[2,30],27:[2,30],29:[2,30],30:[2,30],31:[2,30],34:[2,30]},{18:[2,31],27:[2,31],29:[2,31],30:[2,31],31:[2,31],34:[2,31]},{18:[2,32],27:[2,32],29:[2,32],30:[2,32],31:[2,32],34:[2,32]},{18:[2,35],34:[2,35]},{18:[2,43],27:[2,43],29:[2,43],30:[2,43],31:[2,43],34:[2,43],35:[1,59],37:[2,43]},{34:[1,60]},{14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],24:[2,13]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],24:[2,16]},{5:[2,17],14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],24:[2,17]},{5:[2,18],14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],24:[2,18]},{18:[1,61]},{18:[1,62]},{18:[2,21]},{18:[2,26],27:[2,26],29:[2,26],30:[2,26],31:[2,26],34:[2,26]},{18:[2,34],34:[2,34]},{35:[1,59]},{21:63,27:[1,67],29:[1,64],30:[1,65],31:[1,66],34:[1,26],36:25},{18:[2,42],27:[2,42],29:[2,42],30:[2,42],31:[2,42],34:[2,42],37:[2,42]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],24:[2,19]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],24:[2,15]},{18:[2,36],34:[2,36]},{18:[2,37],34:[2,37]},{18:[2,38],34:[2,38]},{18:[2,39],34:[2,39]},{18:[2,40],34:[2,40]}],
defaultActions: {16:[2,1],24:[2,25],38:[2,23],55:[2,21]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;
    this.yy.parser = this;
    if (typeof this.lexer.yylloc == "undefined")
        this.lexer.yylloc = {};
    var yyloc = this.lexer.yylloc;
    lstack.push(yyloc);
    var ranges = this.lexer.options && this.lexer.options.ranges;
    if (typeof this.yy.parseError === "function")
        this.parseError = this.yy.parseError;
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    function lex() {
        var token;
        token = self.lexer.lex() || 1;
        if (typeof token !== "number") {
            token = self.symbols_[token] || token;
        }
        return token;
    }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == "undefined") {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
            var errStr = "";
            if (!recovering) {
                expected = [];
                for (p in table[state])
                    if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                    }
                if (this.lexer.showPosition) {
                    errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                } else {
                    errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1?"end of input":"'" + (this.terminals_[symbol] || symbol) + "'");
                }
                this.parseError(errStr, {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected});
            }
        }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(this.lexer.yytext);
            lstack.push(this.lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                yyloc = this.lexer.yylloc;
                if (recovering > 0)
                    recovering--;
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column};
            if (ranges) {
                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
            }
            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
            if (typeof r !== "undefined") {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}
};
/* Jison generated lexer */
var lexer = (function(){
var lexer = ({EOF:1,
parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },
setInput:function (input) {
        this._input = input;
        this._more = this._less = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {first_line:1,first_column:0,last_line:1,last_column:0};
        if (this.options.ranges) this.yylloc.range = [0,0];
        this.offset = 0;
        return this;
    },
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) this.yylloc.range[1]++;

        this._input = this._input.slice(1);
        return ch;
    },
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length-len-1);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length-1);
        this.matched = this.matched.substr(0, this.matched.length-1);

        if (lines.length-1) this.yylineno -= lines.length-1;
        var r = this.yylloc.range;

        this.yylloc = {first_line: this.yylloc.first_line,
          last_line: this.yylineno+1,
          first_column: this.yylloc.first_column,
          last_column: lines ?
              (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length:
              this.yylloc.first_column - len
          };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        return this;
    },
more:function () {
        this._more = true;
        return this;
    },
less:function (n) {
        this.unput(this.match.slice(n));
    },
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20)+(next.length > 20 ? '...':'')).replace(/\n/g, "");
    },
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c+"^";
    },
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) this.done = true;

        var token,
            match,
            tempMatch,
            index,
            col,
            lines;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i=0;i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (!this.options.flex) break;
            }
        }
        if (match) {
            lines = match[0].match(/(?:\r\n?|\n).*/g);
            if (lines) this.yylineno += lines.length;
            this.yylloc = {first_line: this.yylloc.last_line,
                           last_line: this.yylineno+1,
                           first_column: this.yylloc.last_column,
                           last_column: lines ? lines[lines.length-1].length-lines[lines.length-1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length};
            this.yytext += match[0];
            this.match += match[0];
            this.matches = match;
            this.yyleng = this.yytext.length;
            if (this.options.ranges) {
                this.yylloc.range = [this.offset, this.offset += this.yyleng];
            }
            this._more = false;
            this._input = this._input.slice(match[0].length);
            this.matched += match[0];
            token = this.performAction.call(this, this.yy, this, rules[index],this.conditionStack[this.conditionStack.length-1]);
            if (this.done && this._input) this.done = false;
            if (token) return token;
            else return;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line '+(this.yylineno+1)+'. Unrecognized text.\n'+this.showPosition(),
                    {text: "", token: null, line: this.yylineno});
        }
    },
lex:function lex() {
        var r = this.next();
        if (typeof r !== 'undefined') {
            return r;
        } else {
            return this.lex();
        }
    },
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },
popState:function popState() {
        return this.conditionStack.pop();
    },
_currentRules:function _currentRules() {
        return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules;
    },
topState:function () {
        return this.conditionStack[this.conditionStack.length-2];
    },
pushState:function begin(condition) {
        this.begin(condition);
    }});
lexer.options = {};
lexer.performAction = function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {

var YYSTATE=YY_START
switch($avoiding_name_collisions) {
case 0:
                                   if(yy_.yytext.slice(-1) !== "\\") this.begin("mu");
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1), this.begin("emu");
                                   if(yy_.yytext) return 14;
                                 
break;
case 1: return 14; 
break;
case 2:
                                   if(yy_.yytext.slice(-1) !== "\\") this.popState();
                                   if(yy_.yytext.slice(-1) === "\\") yy_.yytext = yy_.yytext.substr(0,yy_.yyleng-1);
                                   return 14;
                                 
break;
case 3: return 24; 
break;
case 4: return 16; 
break;
case 5: return 20; 
break;
case 6: return 19; 
break;
case 7: return 19; 
break;
case 8: return 23; 
break;
case 9: return 23; 
break;
case 10: yy_.yytext = yy_.yytext.substr(3,yy_.yyleng-5); this.popState(); return 15; 
break;
case 11: return 22; 
break;
case 12: return 35; 
break;
case 13: return 34; 
break;
case 14: return 34; 
break;
case 15: return 37; 
break;
case 16: /*ignore whitespace*/ 
break;
case 17: this.popState(); return 18; 
break;
case 18: this.popState(); return 18; 
break;
case 19: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\"/g,'"'); return 29; 
break;
case 20: yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2).replace(/\\"/g,'"'); return 29; 
break;
case 21: yy_.yytext = yy_.yytext.substr(1); return 27; 
break;
case 22: return 31; 
break;
case 23: return 31; 
break;
case 24: return 30; 
break;
case 25: return 34; 
break;
case 26: yy_.yytext = yy_.yytext.substr(1, yy_.yyleng-2); return 34; 
break;
case 27: return 'INVALID'; 
break;
case 28: return 5; 
break;
}
};
lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|$)))/,/^(?:\{\{>)/,/^(?:\{\{#)/,/^(?:\{\{\/)/,/^(?:\{\{\^)/,/^(?:\{\{\s*else\b)/,/^(?:\{\{\{)/,/^(?:\{\{&)/,/^(?:\{\{![\s\S]*?\}\})/,/^(?:\{\{)/,/^(?:=)/,/^(?:\.(?=[} ]))/,/^(?:\.\.)/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}\}\})/,/^(?:\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@[a-zA-Z]+)/,/^(?:true(?=[}\s]))/,/^(?:false(?=[}\s]))/,/^(?:[0-9]+(?=[}\s]))/,/^(?:[a-zA-Z0-9_$-]+(?=[=}\s\/.]))/,/^(?:\[[^\]]*\])/,/^(?:.)/,/^(?:$)/];
lexer.conditions = {"mu":{"rules":[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28],"inclusive":false},"emu":{"rules":[2],"inclusive":false},"INITIAL":{"rules":[0,1,28],"inclusive":true}};
return lexer;})()
parser.lexer = lexer;
function Parser () { this.yy = {}; }Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();
if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = handlebars;
exports.Parser = handlebars.Parser;
exports.parse = function () { return handlebars.parse.apply(handlebars, arguments); }
exports.main = function commonjsMain(args) {
    if (!args[1])
        throw new Error('Usage: '+args[0]+' FILE');
    var source, cwd;
    if (typeof process !== 'undefined') {
        source = require('fs').readFileSync(require('path').resolve(args[1]), "utf8");
    } else {
        source = require("file").path(require("file").cwd()).join(args[1]).read({charset: "utf-8"});
    }
    return exports.parser.parse(source);
}
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(typeof process !== 'undefined' ? process.argv.slice(1) : require("system").args);
}
};
;
// lib/handlebars/compiler/base.js
Handlebars.Parser = handlebars;

Handlebars.parse = function(string) {
  Handlebars.Parser.yy = Handlebars.AST;
  return Handlebars.Parser.parse(string);
};

Handlebars.print = function(ast) {
  return new Handlebars.PrintVisitor().accept(ast);
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  // override in the host environment
  log: function(level, str) {}
};

Handlebars.log = function(level, str) { Handlebars.logger.log(level, str); };
;
// lib/handlebars/compiler/ast.js
(function() {

  Handlebars.AST = {};

  Handlebars.AST.ProgramNode = function(statements, inverse) {
    this.type = "program";
    this.statements = statements;
    if(inverse) { this.inverse = new Handlebars.AST.ProgramNode(inverse); }
  };

  Handlebars.AST.MustacheNode = function(rawParams, hash, unescaped) {
    this.type = "mustache";
    this.escaped = !unescaped;
    this.hash = hash;

    var id = this.id = rawParams[0];
    var params = this.params = rawParams.slice(1);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var eligibleHelper = this.eligibleHelper = id.isSimple;

    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    this.isHelper = eligibleHelper && (params.length || hash);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
  };

  Handlebars.AST.PartialNode = function(id, context) {
    this.type    = "partial";

    // TODO: disallow complex IDs

    this.id      = id;
    this.context = context;
  };

  var verifyMatch = function(open, close) {
    if(open.original !== close.original) {
      throw new Handlebars.Exception(open.original + " doesn't match " + close.original);
    }
  };

  Handlebars.AST.BlockNode = function(mustache, program, inverse, close) {
    verifyMatch(mustache.id, close);
    this.type = "block";
    this.mustache = mustache;
    this.program  = program;
    this.inverse  = inverse;

    if (this.inverse && !this.program) {
      this.isInverse = true;
    }
  };

  Handlebars.AST.ContentNode = function(string) {
    this.type = "content";
    this.string = string;
  };

  Handlebars.AST.HashNode = function(pairs) {
    this.type = "hash";
    this.pairs = pairs;
  };

  Handlebars.AST.IdNode = function(parts) {
    this.type = "ID";
    this.original = parts.join(".");

    var dig = [], depth = 0;

    for(var i=0,l=parts.length; i<l; i++) {
      var part = parts[i];

      if(part === "..") { depth++; }
      else if(part === "." || part === "this") { this.isScoped = true; }
      else { dig.push(part); }
    }

    this.parts    = dig;
    this.string   = dig.join('.');
    this.depth    = depth;

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    this.isSimple = parts.length === 1 && !this.isScoped && depth === 0;
  };

  Handlebars.AST.DataNode = function(id) {
    this.type = "DATA";
    this.id = id;
  };

  Handlebars.AST.StringNode = function(string) {
    this.type = "STRING";
    this.string = string;
  };

  Handlebars.AST.IntegerNode = function(integer) {
    this.type = "INTEGER";
    this.integer = integer;
  };

  Handlebars.AST.BooleanNode = function(bool) {
    this.type = "BOOLEAN";
    this.bool = bool;
  };

  Handlebars.AST.CommentNode = function(comment) {
    this.type = "comment";
    this.comment = comment;
  };

})();;
// lib/handlebars/utils.js
Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  for (var p in tmp) {
    if (tmp.hasOwnProperty(p)) { this[p] = tmp[p]; }
  }

  this.message = tmp.message;
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

(function() {
  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  var escapeChar = function(chr) {
    return escape[chr] || "&amp;";
  };

  Handlebars.Utils = {
    escapeExpression: function(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof Handlebars.SafeString) {
        return string.toString();
      } else if (string == null || string === false) {
        return "";
      }

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    },

    isEmpty: function(value) {
      if (typeof value === "undefined") {
        return true;
      } else if (value === null) {
        return true;
      } else if (value === false) {
        return true;
      } else if(Object.prototype.toString.call(value) === "[object Array]" && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }
  };
})();;
// lib/handlebars/compiler/compiler.js

/*jshint eqnull:true*/
Handlebars.Compiler = function() {};
Handlebars.JavaScriptCompiler = function() {};

(function(Compiler, JavaScriptCompiler) {
  // the foundHelper register will disambiguate helper lookup from finding a
  // function in a context. This is necessary for mustache compatibility, which
  // requires that context functions in blocks are evaluated by blockHelperMissing,
  // and then proceed as if the resulting value was provided to blockHelperMissing.

  Compiler.prototype = {
    compiler: Compiler,

    disassemble: function() {
      var opcodes = this.opcodes, opcode, out = [], params, param;

      for (var i=0, l=opcodes.length; i<l; i++) {
        opcode = opcodes[i];

        if (opcode.opcode === 'DECLARE') {
          out.push("DECLARE " + opcode.name + "=" + opcode.value);
        } else {
          params = [];
          for (var j=0; j<opcode.args.length; j++) {
            param = opcode.args[j];
            if (typeof param === "string") {
              param = "\"" + param.replace("\n", "\\n") + "\"";
            }
            params.push(param);
          }
          out.push(opcode.opcode + " " + params.join(" "));
        }
      }

      return out.join("\n");
    },

    guid: 0,

    compile: function(program, options) {
      this.children = [];
      this.depths = {list: []};
      this.options = options;

      // These changes will propagate to the other compiler components
      var knownHelpers = this.options.knownHelpers;
      this.options.knownHelpers = {
        'helperMissing': true,
        'blockHelperMissing': true,
        'each': true,
        'if': true,
        'unless': true,
        'with': true,
        'log': true
      };
      if (knownHelpers) {
        for (var name in knownHelpers) {
          this.options.knownHelpers[name] = knownHelpers[name];
        }
      }

      return this.program(program);
    },

    accept: function(node) {
      return this[node.type](node);
    },

    program: function(program) {
      var statements = program.statements, statement;
      this.opcodes = [];

      for(var i=0, l=statements.length; i<l; i++) {
        statement = statements[i];
        this[statement.type](statement);
      }
      this.isSimple = l === 1;

      this.depths.list = this.depths.list.sort(function(a, b) {
        return a - b;
      });

      return this;
    },

    compileProgram: function(program) {
      var result = new this.compiler().compile(program, this.options);
      var guid = this.guid++, depth;

      this.usePartial = this.usePartial || result.usePartial;

      this.children[guid] = result;

      for(var i=0, l=result.depths.list.length; i<l; i++) {
        depth = result.depths.list[i];

        if(depth < 2) { continue; }
        else { this.addDepth(depth - 1); }
      }

      return guid;
    },

    block: function(block) {
      var mustache = block.mustache,
          program = block.program,
          inverse = block.inverse;

      if (program) {
        program = this.compileProgram(program);
      }

      if (inverse) {
        inverse = this.compileProgram(inverse);
      }

      var type = this.classifyMustache(mustache);

      if (type === "helper") {
        this.helperMustache(mustache, program, inverse);
      } else if (type === "simple") {
        this.simpleMustache(mustache);

        // now that the simple mustache is resolved, we need to
        // evaluate it by executing `blockHelperMissing`
        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);
        this.opcode('pushLiteral', '{}');
        this.opcode('blockValue');
      } else {
        this.ambiguousMustache(mustache, program, inverse);

        // now that the simple mustache is resolved, we need to
        // evaluate it by executing `blockHelperMissing`
        this.opcode('pushProgram', program);
        this.opcode('pushProgram', inverse);
        this.opcode('pushLiteral', '{}');
        this.opcode('ambiguousBlockValue');
      }

      this.opcode('append');
    },

    hash: function(hash) {
      var pairs = hash.pairs, pair, val;

      this.opcode('push', '{}');

      for(var i=0, l=pairs.length; i<l; i++) {
        pair = pairs[i];
        val  = pair[1];

        this.accept(val);
        this.opcode('assignToHash', pair[0]);
      }
    },

    partial: function(partial) {
      var id = partial.id;
      this.usePartial = true;

      if(partial.context) {
        this.ID(partial.context);
      } else {
        this.opcode('push', 'depth0');
      }

      this.opcode('invokePartial', id.original);
      this.opcode('append');
    },

    content: function(content) {
      this.opcode('appendContent', content.string);
    },

    mustache: function(mustache) {
      var options = this.options;
      var type = this.classifyMustache(mustache);

      if (type === "simple") {
        this.simpleMustache(mustache);
      } else if (type === "helper") {
        this.helperMustache(mustache);
      } else {
        this.ambiguousMustache(mustache);
      }

      if(mustache.escaped && !options.noEscape) {
        this.opcode('appendEscaped');
      } else {
        this.opcode('append');
      }
    },

    ambiguousMustache: function(mustache, program, inverse) {
      var id = mustache.id, name = id.parts[0];

      this.opcode('getContext', id.depth);

      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);

      this.opcode('invokeAmbiguous', name);
    },

    simpleMustache: function(mustache, program, inverse) {
      var id = mustache.id;

      if (id.type === 'DATA') {
        this.DATA(id);
      } else if (id.parts.length) {
        this.ID(id);
      } else {
        // Simplified ID for `this`
        this.addDepth(id.depth);
        this.opcode('getContext', id.depth);
        this.opcode('pushContext');
      }

      this.opcode('resolvePossibleLambda');
    },

    helperMustache: function(mustache, program, inverse) {
      var params = this.setupFullMustacheParams(mustache, program, inverse),
          name = mustache.id.parts[0];

      if (this.options.knownHelpers[name]) {
        this.opcode('invokeKnownHelper', params.length, name);
      } else if (this.knownHelpersOnly) {
        throw new Error("You specified knownHelpersOnly, but used the unknown helper " + name);
      } else {
        this.opcode('invokeHelper', params.length, name);
      }
    },

    ID: function(id) {
      this.addDepth(id.depth);
      this.opcode('getContext', id.depth);

      var name = id.parts[0];
      if (!name) {
        this.opcode('pushContext');
      } else {
        this.opcode('lookupOnContext', id.parts[0]);
      }

      for(var i=1, l=id.parts.length; i<l; i++) {
        this.opcode('lookup', id.parts[i]);
      }
    },

    DATA: function(data) {
      this.options.data = true;
      this.opcode('lookupData', data.id);
    },

    STRING: function(string) {
      this.opcode('pushString', string.string);
    },

    INTEGER: function(integer) {
      this.opcode('pushLiteral', integer.integer);
    },

    BOOLEAN: function(bool) {
      this.opcode('pushLiteral', bool.bool);
    },

    comment: function() {},

    // HELPERS
    opcode: function(name) {
      this.opcodes.push({ opcode: name, args: [].slice.call(arguments, 1) });
    },

    declare: function(name, value) {
      this.opcodes.push({ opcode: 'DECLARE', name: name, value: value });
    },

    addDepth: function(depth) {
      if(isNaN(depth)) { throw new Error("EWOT"); }
      if(depth === 0) { return; }

      if(!this.depths[depth]) {
        this.depths[depth] = true;
        this.depths.list.push(depth);
      }
    },

    classifyMustache: function(mustache) {
      var isHelper   = mustache.isHelper;
      var isEligible = mustache.eligibleHelper;
      var options    = this.options;

      // if ambiguous, we can possibly resolve the ambiguity now
      if (isEligible && !isHelper) {
        var name = mustache.id.parts[0];

        if (options.knownHelpers[name]) {
          isHelper = true;
        } else if (options.knownHelpersOnly) {
          isEligible = false;
        }
      }

      if (isHelper) { return "helper"; }
      else if (isEligible) { return "ambiguous"; }
      else { return "simple"; }
    },

    pushParams: function(params) {
      var i = params.length, param;

      while(i--) {
        param = params[i];

        if(this.options.stringParams) {
          if(param.depth) {
            this.addDepth(param.depth);
          }

          this.opcode('getContext', param.depth || 0);
          this.opcode('pushStringParam', param.string);
        } else {
          this[param.type](param);
        }
      }
    },

    setupMustacheParams: function(mustache) {
      var params = mustache.params;
      this.pushParams(params);

      if(mustache.hash) {
        this.hash(mustache.hash);
      } else {
        this.opcode('pushLiteral', '{}');
      }

      return params;
    },

    // this will replace setupMustacheParams when we're done
    setupFullMustacheParams: function(mustache, program, inverse) {
      var params = mustache.params;
      this.pushParams(params);

      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);

      if(mustache.hash) {
        this.hash(mustache.hash);
      } else {
        this.opcode('pushLiteral', '{}');
      }

      return params;
    }
  };

  var Literal = function(value) {
    this.value = value;
  };

  JavaScriptCompiler.prototype = {
    // PUBLIC API: You can override these methods in a subclass to provide
    // alternative compiled forms for name lookup and buffering semantics
    nameLookup: function(parent, name, type) {
      if (/^[0-9]+$/.test(name)) {
        return parent + "[" + name + "]";
      } else if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
        return parent + "." + name;
      }
      else {
        return parent + "['" + name + "']";
      }
    },

    appendToBuffer: function(string) {
      if (this.environment.isSimple) {
        return "return " + string + ";";
      } else {
        return "buffer += " + string + ";";
      }
    },

    initializeBuffer: function() {
      return this.quotedString("");
    },

    namespace: "Handlebars",
    // END PUBLIC API

    compile: function(environment, options, context, asObject) {
      this.environment = environment;
      this.options = options || {};

      Handlebars.log(Handlebars.logger.DEBUG, this.environment.disassemble() + "\n\n");

      this.name = this.environment.name;
      this.isChild = !!context;
      this.context = context || {
        programs: [],
        aliases: { }
      };

      this.preamble();

      this.stackSlot = 0;
      this.stackVars = [];
      this.registers = { list: [] };
      this.compileStack = [];

      this.compileChildren(environment, options);

      var opcodes = environment.opcodes, opcode;

      this.i = 0;

      for(l=opcodes.length; this.i<l; this.i++) {
        opcode = opcodes[this.i];

        if(opcode.opcode === 'DECLARE') {
          this[opcode.name] = opcode.value;
        } else {
          this[opcode.opcode].apply(this, opcode.args);
        }
      }

      return this.createFunctionContext(asObject);
    },

    nextOpcode: function() {
      var opcodes = this.environment.opcodes, opcode = opcodes[this.i + 1];
      return opcodes[this.i + 1];
    },

    eat: function(opcode) {
      this.i = this.i + 1;
    },

    preamble: function() {
      var out = [];

      if (!this.isChild) {
        var namespace = this.namespace;
        var copies = "helpers = helpers || " + namespace + ".helpers;";
        if (this.environment.usePartial) { copies = copies + " partials = partials || " + namespace + ".partials;"; }
        if (this.options.data) { copies = copies + " data = data || {};"; }
        out.push(copies);
      } else {
        out.push('');
      }

      if (!this.environment.isSimple) {
        out.push(", buffer = " + this.initializeBuffer());
      } else {
        out.push("");
      }

      // track the last context pushed into place to allow skipping the
      // getContext opcode when it would be a noop
      this.lastContext = 0;
      this.source = out;
    },

    createFunctionContext: function(asObject) {
      var locals = this.stackVars.concat(this.registers.list);

      if(locals.length > 0) {
        this.source[1] = this.source[1] + ", " + locals.join(", ");
      }

      // Generate minimizer alias mappings
      if (!this.isChild) {
        var aliases = [];
        for (var alias in this.context.aliases) {
          this.source[1] = this.source[1] + ', ' + alias + '=' + this.context.aliases[alias];
        }
      }

      if (this.source[1]) {
        this.source[1] = "var " + this.source[1].substring(2) + ";";
      }

      // Merge children
      if (!this.isChild) {
        this.source[1] += '\n' + this.context.programs.join('\n') + '\n';
      }

      if (!this.environment.isSimple) {
        this.source.push("return buffer;");
      }

      var params = this.isChild ? ["depth0", "data"] : ["Handlebars", "depth0", "helpers", "partials", "data"];

      for(var i=0, l=this.environment.depths.list.length; i<l; i++) {
        params.push("depth" + this.environment.depths.list[i]);
      }

      if (asObject) {
        params.push(this.source.join("\n  "));

        return Function.apply(this, params);
      } else {
        var functionSource = 'function ' + (this.name || '') + '(' + params.join(',') + ') {\n  ' + this.source.join("\n  ") + '}';
        Handlebars.log(Handlebars.logger.DEBUG, functionSource + "\n\n");
        return functionSource;
      }
    },

    // [blockValue]
    //
    // On stack, before: hash, inverse, program, value
    // On stack, after: return value of blockHelperMissing
    //
    // The purpose of this opcode is to take a block of the form
    // `{{#foo}}...{{/foo}}`, resolve the value of `foo`, and
    // replace it on the stack with the result of properly
    // invoking blockHelperMissing.
    blockValue: function() {
      this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

      var params = ["depth0"];
      this.setupParams(0, params);

      this.replaceStack(function(current) {
        params.splice(1, 0, current);
        return current + " = blockHelperMissing.call(" + params.join(", ") + ")";
      });
    },

    // [ambiguousBlockValue]
    //
    // On stack, before: hash, inverse, program, value
    // Compiler value, before: lastHelper=value of last found helper, if any
    // On stack, after, if no lastHelper: same as [blockValue]
    // On stack, after, if lastHelper: value
    ambiguousBlockValue: function() {
      this.context.aliases.blockHelperMissing = 'helpers.blockHelperMissing';

      var params = ["depth0"];
      this.setupParams(0, params);

      var current = this.topStack();
      params.splice(1, 0, current);

      this.source.push("if (!" + this.lastHelper + ") { " + current + " = blockHelperMissing.call(" + params.join(", ") + "); }");
    },

    // [appendContent]
    //
    // On stack, before: ...
    // On stack, after: ...
    //
    // Appends the string value of `content` to the current buffer
    appendContent: function(content) {
      this.source.push(this.appendToBuffer(this.quotedString(content)));
    },

    // [append]
    //
    // On stack, before: value, ...
    // On stack, after: ...
    //
    // Coerces `value` to a String and appends it to the current buffer.
    //
    // If `value` is truthy, or 0, it is coerced into a string and appended
    // Otherwise, the empty string is appended
    append: function() {
      var local = this.popStack();
      this.source.push("if(" + local + " || " + local + " === 0) { " + this.appendToBuffer(local) + " }");
      if (this.environment.isSimple) {
        this.source.push("else { " + this.appendToBuffer("''") + " }");
      }
    },

    // [appendEscaped]
    //
    // On stack, before: value, ...
    // On stack, after: ...
    //
    // Escape `value` and append it to the buffer
    appendEscaped: function() {
      var opcode = this.nextOpcode(), extra = "";
      this.context.aliases.escapeExpression = 'this.escapeExpression';

      if(opcode && opcode.opcode === 'appendContent') {
        extra = " + " + this.quotedString(opcode.args[0]);
        this.eat(opcode);
      }

      this.source.push(this.appendToBuffer("escapeExpression(" + this.popStack() + ")" + extra));
    },

    // [getContext]
    //
    // On stack, before: ...
    // On stack, after: ...
    // Compiler value, after: lastContext=depth
    //
    // Set the value of the `lastContext` compiler value to the depth
    getContext: function(depth) {
      if(this.lastContext !== depth) {
        this.lastContext = depth;
      }
    },

    // [lookupOnContext]
    //
    // On stack, before: ...
    // On stack, after: currentContext[name], ...
    //
    // Looks up the value of `name` on the current context and pushes
    // it onto the stack.
    lookupOnContext: function(name) {
      this.pushStack(this.nameLookup('depth' + this.lastContext, name, 'context'));
    },

    // [pushContext]
    //
    // On stack, before: ...
    // On stack, after: currentContext, ...
    //
    // Pushes the value of the current context onto the stack.
    pushContext: function() {
      this.pushStackLiteral('depth' + this.lastContext);
    },

    // [resolvePossibleLambda]
    //
    // On stack, before: value, ...
    // On stack, after: resolved value, ...
    //
    // If the `value` is a lambda, replace it on the stack by
    // the return value of the lambda
    resolvePossibleLambda: function() {
      this.context.aliases.functionType = '"function"';

      this.replaceStack(function(current) {
        return "typeof " + current + " === functionType ? " + current + "() : " + current;
      });
    },

    // [lookup]
    //
    // On stack, before: value, ...
    // On stack, after: value[name], ...
    //
    // Replace the value on the stack with the result of looking
    // up `name` on `value`
    lookup: function(name) {
      this.replaceStack(function(current) {
        return current + " == null || " + current + " === false ? " + current + " : " + this.nameLookup(current, name, 'context');
      });
    },

    // [lookupData]
    //
    // On stack, before: ...
    // On stack, after: data[id], ...
    //
    // Push the result of looking up `id` on the current data
    lookupData: function(id) {
      this.pushStack(this.nameLookup('data', id, 'data'));
    },

    // [pushStringParam]
    //
    // On stack, before: ...
    // On stack, after: string, currentContext, ...
    //
    // This opcode is designed for use in string mode, which
    // provides the string value of a parameter along with its
    // depth rather than resolving it immediately.
    pushStringParam: function(string) {
      this.pushStackLiteral('depth' + this.lastContext);
      this.pushString(string);
    },

    // [pushString]
    //
    // On stack, before: ...
    // On stack, after: quotedString(string), ...
    //
    // Push a quoted version of `string` onto the stack
    pushString: function(string) {
      this.pushStackLiteral(this.quotedString(string));
    },

    // [push]
    //
    // On stack, before: ...
    // On stack, after: expr, ...
    //
    // Push an expression onto the stack
    push: function(expr) {
      this.pushStack(expr);
    },

    // [pushLiteral]
    //
    // On stack, before: ...
    // On stack, after: value, ...
    //
    // Pushes a value onto the stack. This operation prevents
    // the compiler from creating a temporary variable to hold
    // it.
    pushLiteral: function(value) {
      this.pushStackLiteral(value);
    },

    // [pushProgram]
    //
    // On stack, before: ...
    // On stack, after: program(guid), ...
    //
    // Push a program expression onto the stack. This takes
    // a compile-time guid and converts it into a runtime-accessible
    // expression.
    pushProgram: function(guid) {
      if (guid != null) {
        this.pushStackLiteral(this.programExpression(guid));
      } else {
        this.pushStackLiteral(null);
      }
    },

    // [invokeHelper]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of helper invocation
    //
    // Pops off the helper's parameters, invokes the helper,
    // and pushes the helper's return value onto the stack.
    //
    // If the helper is not found, `helperMissing` is called.
    invokeHelper: function(paramSize, name) {
      this.context.aliases.helperMissing = 'helpers.helperMissing';

      var helper = this.lastHelper = this.setupHelper(paramSize, name);
      this.register('foundHelper', helper.name);

      this.pushStack("foundHelper ? foundHelper.call(" +
        helper.callParams + ") " + ": helperMissing.call(" +
        helper.helperMissingParams + ")");
    },

    // [invokeKnownHelper]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of helper invocation
    //
    // This operation is used when the helper is known to exist,
    // so a `helperMissing` fallback is not required.
    invokeKnownHelper: function(paramSize, name) {
      var helper = this.setupHelper(paramSize, name);
      this.pushStack(helper.name + ".call(" + helper.callParams + ")");
    },

    // [invokeAmbiguous]
    //
    // On stack, before: hash, inverse, program, params..., ...
    // On stack, after: result of disambiguation
    //
    // This operation is used when an expression like `{{foo}}`
    // is provided, but we don't know at compile-time whether it
    // is a helper or a path.
    //
    // This operation emits more code than the other options,
    // and can be avoided by passing the `knownHelpers` and
    // `knownHelpersOnly` flags at compile-time.
    invokeAmbiguous: function(name) {
      this.context.aliases.functionType = '"function"';

      this.pushStackLiteral('{}');
      var helper = this.setupHelper(0, name);

      var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');
      this.register('foundHelper', helperName);

      var nonHelper = this.nameLookup('depth' + this.lastContext, name, 'context');
      var nextStack = this.nextStack();

      this.source.push('if (foundHelper) { ' + nextStack + ' = foundHelper.call(' + helper.callParams + '); }');
      this.source.push('else { ' + nextStack + ' = ' + nonHelper + '; ' + nextStack + ' = typeof ' + nextStack + ' === functionType ? ' + nextStack + '() : ' + nextStack + '; }');
    },

    // [invokePartial]
    //
    // On stack, before: context, ...
    // On stack after: result of partial invocation
    //
    // This operation pops off a context, invokes a partial with that context,
    // and pushes the result of the invocation back.
    invokePartial: function(name) {
      var params = [this.nameLookup('partials', name, 'partial'), "'" + name + "'", this.popStack(), "helpers", "partials"];

      if (this.options.data) {
        params.push("data");
      }

      this.context.aliases.self = "this";
      this.pushStack("self.invokePartial(" + params.join(", ") + ");");
    },

    // [assignToHash]
    //
    // On stack, before: value, hash, ...
    // On stack, after: hash, ...
    //
    // Pops a value and hash off the stack, assigns `hash[key] = value`
    // and pushes the hash back onto the stack.
    assignToHash: function(key) {
      var value = this.popStack();
      var hash = this.topStack();

      this.source.push(hash + "['" + key + "'] = " + value + ";");
    },

    // HELPERS

    compiler: JavaScriptCompiler,

    compileChildren: function(environment, options) {
      var children = environment.children, child, compiler;

      for(var i=0, l=children.length; i<l; i++) {
        child = children[i];
        compiler = new this.compiler();

        this.context.programs.push('');     // Placeholder to prevent name conflicts for nested children
        var index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context);
      }
    },

    programExpression: function(guid) {
      this.context.aliases.self = "this";

      if(guid == null) {
        return "self.noop";
      }

      var child = this.environment.children[guid],
          depths = child.depths.list, depth;

      var programParams = [child.index, child.name, "data"];

      for(var i=0, l = depths.length; i<l; i++) {
        depth = depths[i];

        if(depth === 1) { programParams.push("depth0"); }
        else { programParams.push("depth" + (depth - 1)); }
      }

      if(depths.length === 0) {
        return "self.program(" + programParams.join(", ") + ")";
      } else {
        programParams.shift();
        return "self.programWithDepth(" + programParams.join(", ") + ")";
      }
    },

    register: function(name, val) {
      this.useRegister(name);
      this.source.push(name + " = " + val + ";");
    },

    useRegister: function(name) {
      if(!this.registers[name]) {
        this.registers[name] = true;
        this.registers.list.push(name);
      }
    },

    pushStackLiteral: function(item) {
      this.compileStack.push(new Literal(item));
      return item;
    },

    pushStack: function(item) {
      this.source.push(this.incrStack() + " = " + item + ";");
      this.compileStack.push("stack" + this.stackSlot);
      return "stack" + this.stackSlot;
    },

    replaceStack: function(callback) {
      var item = callback.call(this, this.topStack());

      this.source.push(this.topStack() + " = " + item + ";");
      return "stack" + this.stackSlot;
    },

    nextStack: function(skipCompileStack) {
      var name = this.incrStack();
      this.compileStack.push("stack" + this.stackSlot);
      return name;
    },

    incrStack: function() {
      this.stackSlot++;
      if(this.stackSlot > this.stackVars.length) { this.stackVars.push("stack" + this.stackSlot); }
      return "stack" + this.stackSlot;
    },

    popStack: function() {
      var item = this.compileStack.pop();

      if (item instanceof Literal) {
        return item.value;
      } else {
        this.stackSlot--;
        return item;
      }
    },

    topStack: function() {
      var item = this.compileStack[this.compileStack.length - 1];

      if (item instanceof Literal) {
        return item.value;
      } else {
        return item;
      }
    },

    quotedString: function(str) {
      return '"' + str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r') + '"';
    },

    setupHelper: function(paramSize, name) {
      var params = [];
      this.setupParams(paramSize, params);
      var foundHelper = this.nameLookup('helpers', name, 'helper');

      return {
        params: params,
        name: foundHelper,
        callParams: ["depth0"].concat(params).join(", "),
        helperMissingParams: ["depth0", this.quotedString(name)].concat(params).join(", ")
      };
    },

    // the params and contexts arguments are passed in arrays
    // to fill in
    setupParams: function(paramSize, params) {
      var options = [], contexts = [], param, inverse, program;

      options.push("hash:" + this.popStack());

      inverse = this.popStack();
      program = this.popStack();

      // Avoid setting fn and inverse if neither are set. This allows
      // helpers to do a check for `if (options.fn)`
      if (program || inverse) {
        if (!program) {
          this.context.aliases.self = "this";
          program = "self.noop";
        }

        if (!inverse) {
         this.context.aliases.self = "this";
          inverse = "self.noop";
        }

        options.push("inverse:" + inverse);
        options.push("fn:" + program);
      }

      for(var i=0; i<paramSize; i++) {
        param = this.popStack();
        params.push(param);

        if(this.options.stringParams) {
          contexts.push(this.popStack());
        }
      }

      if (this.options.stringParams) {
        options.push("contexts:[" + contexts.join(",") + "]");
      }

      if(this.options.data) {
        options.push("data:data");
      }

      params.push("{" + options.join(",") + "}");
      return params.join(", ");
    }
  };

  var reservedWords = (
    "break else new var" +
    " case finally return void" +
    " catch for switch while" +
    " continue function this with" +
    " default if throw" +
    " delete in try" +
    " do instanceof typeof" +
    " abstract enum int short" +
    " boolean export interface static" +
    " byte extends long super" +
    " char final native synchronized" +
    " class float package throws" +
    " const goto private transient" +
    " debugger implements protected volatile" +
    " double import public let yield"
  ).split(" ");

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for(var i=0, l=reservedWords.length; i<l; i++) {
    compilerWords[reservedWords[i]] = true;
  }

  JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
    if(!JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(name)) {
      return true;
    }
    return false;
  };

})(Handlebars.Compiler, Handlebars.JavaScriptCompiler);

Handlebars.precompile = function(string, options) {
  options = options || {};

  var ast = Handlebars.parse(string);
  var environment = new Handlebars.Compiler().compile(ast, options);
  return new Handlebars.JavaScriptCompiler().compile(environment, options);
};

Handlebars.compile = function(string, options) {
  options = options || {};

  var compiled;
  function compile() {
    var ast = Handlebars.parse(string);
    var environment = new Handlebars.Compiler().compile(ast, options);
    var templateSpec = new Handlebars.JavaScriptCompiler().compile(environment, options, undefined, true);
    return Handlebars.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  return function(context, options) {
    if (!compiled) {
      compiled = compile();
    }
    return compiled.call(this, context, options);
  };
};
;
// lib/handlebars/runtime.js
Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          return Handlebars.VM.program(fn, data);
        } else if(programWrapper) {
          return programWrapper;
        } else {
          programWrapper = this.programs[i] = Handlebars.VM.program(fn);
          return programWrapper;
        }
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop
    };

    return function(context, options) {
      options = options || {};
      return templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);
    };
  },

  programWithDepth: function(fn, data, $depth) {
    var args = Array.prototype.slice.call(arguments, 2);

    return function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
  },
  program: function(fn, data) {
    return function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;
;

/*!
 * jQuery JavaScript Library v1.8.2
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: Thu Sep 20 2012 21:13:05 GMT-0400 (Eastern Daylight Time)
 */
(function( window, undefined ) {
var
	// A central reference to the root jQuery(document)
	rootjQuery,

	// The deferred used on DOM ready
	readyList,

	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,
	location = window.location,
	navigator = window.navigator,

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// Save a reference to some core methods
	core_push = Array.prototype.push,
	core_slice = Array.prototype.slice,
	core_indexOf = Array.prototype.indexOf,
	core_toString = Object.prototype.toString,
	core_hasOwn = Object.prototype.hasOwnProperty,
	core_trim = String.prototype.trim,

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Used for matching numbers
	core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,

	// Used for detecting and trimming whitespace
	core_rnotwhite = /\S/,
	core_rspace = /\s+/,

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// The ready event handler and self cleanup method
	DOMContentLoaded = function() {
		if ( document.addEventListener ) {
			document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
			jQuery.ready();
		} else if ( document.readyState === "complete" ) {
			// we're here because readyState === "complete" in oldIE
			// which is good enough for us to call the dom ready!
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	},

	// [[Class]] -> type pairs
	class2type = {};

jQuery.fn = jQuery.prototype = {
	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;

		// Handle $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;
					doc = ( context && context.nodeType ? context.ownerDocument || context : document );

					// scripts is true for back-compat
					selector = jQuery.parseHTML( match[1], doc, true );
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						this.attr.call( selector, context, true );
					}

					return jQuery.merge( this, selector );

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The current version of jQuery being used
	jquery: "1.8.2",

	// The default length of a jQuery object is 0
	length: 0,

	// The number of elements contained in the matched element set
	size: function() {
		return this.length;
	},

	toArray: function() {
		return core_slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( core_slice.apply( this, arguments ),
			"slice", core_slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready, 1 );
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ core_toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!core_hasOwn.call(obj, "constructor") &&
				!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || core_hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	// data: string of html
	// context (optional): If specified, the fragment will be created in this context, defaults to document
	// scripts (optional): If true, will include scripts passed in the html string
	parseHTML: function( data, context, scripts ) {
		var parsed;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			scripts = context;
			context = 0;
		}
		context = context || document;

		// Single tag
		if ( (parsed = rsingleTag.exec( data )) ) {
			return [ context.createElement( parsed[1] ) ];
		}

		parsed = jQuery.buildFragment( [ data ], context, scripts ? null : [] );
		return jQuery.merge( [],
			(parsed.cacheable ? jQuery.clone( parsed.fragment ) : parsed.fragment).childNodes );
	},

	parseJSON: function( data ) {
		if ( !data || typeof data !== "string") {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		var xml, tmp;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && core_rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var name,
			i = 0,
			length = obj.length,
			isObj = length === undefined || jQuery.isFunction( obj );

		if ( args ) {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.apply( obj[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( obj[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jQuery.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( arr ) ) {
				core_push.call( ret, arr );
			} else {
				jQuery.merge( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( core_indexOf ) {
				return core_indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var retVal,
			ret = [],
			i = 0,
			length = elems.length;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key,
			ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = core_slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context, args.concat( core_slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || jQuery.guid++;

		return proxy;
	},

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	}
});

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready, 1 );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" && ( !options.unique || !self.has( arg ) ) ) {
								list.push( arg );
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
jQuery.support = (function() {

	var support,
		all,
		a,
		select,
		opt,
		input,
		fragment,
		eventName,
		i,
		isSupported,
		clickFn,
		div = document.createElement("div");

	// Preliminary tests
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

	all = div.getElementsByTagName("*");
	a = div.getElementsByTagName("a")[ 0 ];
	a.style.cssText = "top:1px;float:left;opacity:.5";

	// Can't get basic test support
	if ( !all || !all.length ) {
		return {};
	}

	// First batch of supports tests
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	support = {
		// IE strips leading whitespace when .innerHTML is used
		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

		// Make sure that tbody elements aren't automatically inserted
		// IE will insert them into empty tables
		tbody: !div.getElementsByTagName("tbody").length,

		// Make sure that link elements get serialized correctly by innerHTML
		// This requires a wrapper element in IE
		htmlSerialize: !!div.getElementsByTagName("link").length,

		// Get the style information from getAttribute
		// (IE uses .cssText instead)
		style: /top/.test( a.getAttribute("style") ),

		// Make sure that URLs aren't manipulated
		// (IE normalizes it by default)
		hrefNormalized: ( a.getAttribute("href") === "/a" ),

		// Make sure that element opacity exists
		// (IE uses filter instead)
		// Use a regex to work around a WebKit issue. See #5145
		opacity: /^0.5/.test( a.style.opacity ),

		// Verify style float existence
		// (IE uses styleFloat instead of cssFloat)
		cssFloat: !!a.style.cssFloat,

		// Make sure that if no value is specified for a checkbox
		// that it defaults to "on".
		// (WebKit defaults to "" instead)
		checkOn: ( input.value === "on" ),

		// Make sure that a selected-by-default option has a working selected property.
		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
		optSelected: opt.selected,

		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
		getSetAttribute: div.className !== "t",

		// Tests for enctype support on a form(#6743)
		enctype: !!document.createElement("form").enctype,

		// Makes sure cloning an html5 element does not cause problems
		// Where outerHTML is undefined, this still works
		html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

		// jQuery.support.boxModel DEPRECATED in 1.8 since we don't support Quirks Mode
		boxModel: ( document.compatMode === "CSS1Compat" ),

		// Will be defined later
		submitBubbles: true,
		changeBubbles: true,
		focusinBubbles: false,
		deleteExpando: true,
		noCloneEvent: true,
		inlineBlockNeedsLayout: false,
		shrinkWrapBlocks: false,
		reliableMarginRight: true,
		boxSizingReliable: true,
		pixelPosition: false
	};

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Test to see if it's possible to delete an expando from an element
	// Fails in Internet Explorer
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
		div.attachEvent( "onclick", clickFn = function() {
			// Cloning a node shouldn't copy over any
			// bound event handlers (IE does this)
			support.noCloneEvent = false;
		});
		div.cloneNode( true ).fireEvent("onclick");
		div.detachEvent( "onclick", clickFn );
	}

	// Check if a radio maintains its value
	// after being appended to the DOM
	input = document.createElement("input");
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";

	input.setAttribute( "checked", "checked" );

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "name", "t" );

	div.appendChild( input );
	fragment = document.createDocumentFragment();
	fragment.appendChild( div.lastChild );

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	fragment.removeChild( input );
	fragment.appendChild( div );

	// Technique from Juriy Zaytsev
	// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	// We only care about the case where non-standard event systems
	// are used, namely in IE. Short-circuiting here helps us to
	// avoid an eval call (in setAttribute) which can cause CSP
	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
	if ( div.attachEvent ) {
		for ( i in {
			submit: true,
			change: true,
			focusin: true
		}) {
			eventName = "on" + i;
			isSupported = ( eventName in div );
			if ( !isSupported ) {
				div.setAttribute( eventName, "return;" );
				isSupported = ( typeof div[ eventName ] === "function" );
			}
			support[ i + "Bubbles" ] = isSupported;
		}
	}

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, div, tds, marginDiv,
			divReset = "padding:0;margin:0;border:0;display:block;overflow:hidden;",
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		container = document.createElement("div");
		container.style.cssText = "visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px";
		body.insertBefore( container, body.firstChild );

		// Construct the test element
		div = document.createElement("div");
		container.appendChild( div );

		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		// (only IE 8 fails this test)
		div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName("td");
		tds[ 0 ].style.cssText = "padding:0;margin:0;border:0;display:none";
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Check if empty table cells still have offsetWidth/Height
		// (IE <= 8 fail this test)
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check box-sizing and margin behavior
		div.innerHTML = "";
		div.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;";
		support.boxSizing = ( div.offsetWidth === 4 );
		support.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== 1 );

		// NOTE: To any future maintainer, we've window.getComputedStyle
		// because jsdom on node.js will break without it.
		if ( window.getComputedStyle ) {
			support.pixelPosition = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
			support.boxSizingReliable = ( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

			// Check if div with explicit width and no margin-right incorrectly
			// gets computed margin-right based on width of container. For more
			// info see bug #3333
			// Fails in WebKit before Feb 2011 nightlies
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			marginDiv = document.createElement("div");
			marginDiv.style.cssText = div.style.cssText = divReset;
			marginDiv.style.marginRight = marginDiv.style.width = "0";
			div.style.width = "1px";
			div.appendChild( marginDiv );
			support.reliableMarginRight =
				!parseFloat( ( window.getComputedStyle( marginDiv, null ) || {} ).marginRight );
		}

		if ( typeof div.style.zoom !== "undefined" ) {
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			// (IE < 8 does this)
			div.innerHTML = "";
			div.style.cssText = divReset + "width:1px;padding:1px;display:inline;zoom:1";
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Check if elements with layout shrink-wrap their children
			// (IE 6 does this)
			div.style.display = "block";
			div.style.overflow = "visible";
			div.innerHTML = "<div></div>";
			div.firstChild.style.width = "5px";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );

			container.style.zoom = 1;
		}

		// Null elements to avoid leaks in IE
		body.removeChild( container );
		container = div = tds = marginDiv = null;
	});

	// Null elements to avoid leaks in IE
	fragment.removeChild( div );
	all = a = select = opt = input = fragment = div = null;

	return support;
})();
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
	rmultiDash = /([A-Z])/g;

jQuery.extend({
	cache: {},

	deletedIds: [],

	// Remove at next major release (1.9/2.0)
	uuid: 0,

	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
			// can't GC object references properly across the DOM-JS boundary
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}

		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			if ( isNode ) {
				elem[ internalKey ] = id = jQuery.deletedIds.pop() || jQuery.guid++;
			} else {
				id = internalKey;
			}
		}

		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		if ( typeof name === "object" || typeof name === "function" ) {
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}

		thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		if ( !pvt ) {
			if ( !thisCache.data ) {
				thisCache.data = {};
			}

			thisCache = thisCache.data;
		}

		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,
			id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split(" ");
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject( cache[ id ] ) ) {
				return;
			}
		}

		// Destroy the cache
		if ( isNode ) {
			jQuery.cleanData( [ elem ], true );

		// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
		} else if ( jQuery.support.deleteExpando || cache != cache.window ) {
			delete cache[ id ];

		// When all else fails, null
		} else {
			cache[ id ] = null;
		}
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			elem = this[0],
			i = 0,
			data = null;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( !name.indexOf( "data-" ) ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {

			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}

			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );

				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				// Only convert to a number if it doesn't change the string
				+data + "" === data ? +data :
				rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}
jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery.removeData( elem, type + "queue", true );
				jQuery.removeData( elem, key, true );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var nodeHook, boolHook, fixSpecified,
	rclass = /[\t\r\n]/g,
	rreturn = /\r/g,
	rtype = /^(?:button|input)$/i,
	rfocusable = /^(?:button|input|object|select|textarea)$/i,
	rclickable = /^a(?:rea|)$/i,
	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classNames, i, l, elem,
			setClass, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call(this, j, this.className) );
			});
		}

		if ( value && typeof value === "string" ) {
			classNames = value.split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 ) {
					if ( !elem.className && classNames.length === 1 ) {
						elem.className = value;

					} else {
						setClass = " " + elem.className + " ";

						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							if ( setClass.indexOf( " " + classNames[ c ] + " " ) < 0 ) {
								setClass += classNames[ c ] + " ";
							}
						}
						elem.className = jQuery.trim( setClass );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var removes, className, elem, c, cl, i, l;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call(this, j, this.className) );
			});
		}
		if ( (value && typeof value === "string") || value === undefined ) {
			removes = ( value || "" ).split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];
				if ( elem.nodeType === 1 && elem.className ) {

					className = (" " + elem.className + " ").replace( rclass, " " );

					// loop over each item in the removal list
					for ( c = 0, cl = removes.length; c < cl; c++ ) {
						// Remove until there is nothing to remove,
						while ( className.indexOf(" " + removes[ c ] + " ") >= 0 ) {
							className = className.replace( " " + removes[ c ] + " " , " " );
						}
					}
					elem.className = value ? jQuery.trim( className ) : "";
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.split( core_rspace );

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			} else if ( type === "undefined" || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// toggle whole className
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) >= 0 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val,
				self = jQuery(this);

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, self.val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// attributes.value is undefined in Blackberry 4.7 but
				// uses .value. See #6932
				var val = elem.attributes.value;
				return !val || val.specified ? elem.value : elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, i, max, option,
					index = elem.selectedIndex,
					values = [],
					options = elem.options,
					one = elem.type === "select-one";

				// Nothing was selected
				if ( index < 0 ) {
					return null;
				}

				// Loop through all the selected options
				i = one ? index : 0;
				max = one ? index + 1 : options.length;
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Don't return options that are disabled or in a disabled optgroup
					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
				if ( one && !values.length && options.length ) {
					return jQuery( options[ index ] ).val();
				}

				return values;
			},

			set: function( elem, value ) {
				var values = jQuery.makeArray( value );

				jQuery(elem).find("option").each(function() {
					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
				});

				if ( !values.length ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	// Unused in 1.8, left in so attrFn-stabbers won't die; remove in 1.9
	attrFn: {},

	attr: function( elem, name, value, pass ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( pass && jQuery.isFunction( jQuery.fn[ name ] ) ) {
			return jQuery( elem )[ name ]( value );
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( notxml ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;

			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, value + "" );
				return value;
			}

		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {

			ret = elem.getAttribute( name );

			// Non-existent attributes return null, we normalize to undefined
			return ret === null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var propName, attrNames, name, isBool,
			i = 0;

		if ( value && elem.nodeType === 1 ) {

			attrNames = value.split( core_rspace );

			for ( ; i < attrNames.length; i++ ) {
				name = attrNames[ i ];

				if ( name ) {
					propName = jQuery.propFix[ name ] || name;
					isBool = rboolean.test( name );

					// See #9699 for explanation of this approach (setting first, then removal)
					// Do not do this for boolean attributes (see #10870)
					if ( !isBool ) {
						jQuery.attr( elem, name, "" );
					}
					elem.removeAttribute( getSetAttribute ? name : propName );

					// Set corresponding property to false for boolean attributes
					if ( isBool && propName in elem ) {
						elem[ propName ] = false;
					}
				}
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				// We can't allow the type property to be changed (since it causes problems in IE)
				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
					jQuery.error( "type property can't be changed" );
				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to it's default in case type is set after value
					// This is for element creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// Use the value property for back compat
		// Use the nodeHook for button elements in IE6/7 (#1954)
		value: {
			get: function( elem, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.get( elem, name );
				}
				return name in elem ?
					elem.value :
					null;
			},
			set: function( elem, value, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.set( elem, value, name );
				}
				// Does not return so that setAttribute is also used
				elem.value = value;
			}
		}
	},

	propFix: {
		tabindex: "tabIndex",
		readonly: "readOnly",
		"for": "htmlFor",
		"class": "className",
		maxlength: "maxLength",
		cellspacing: "cellSpacing",
		cellpadding: "cellPadding",
		rowspan: "rowSpan",
		colspan: "colSpan",
		usemap: "useMap",
		frameborder: "frameBorder",
		contenteditable: "contentEditable"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				return ( elem[ name ] = value );
			}

		} else {
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
				return ret;

			} else {
				return elem[ name ];
			}
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				var attributeNode = elem.getAttributeNode("tabindex");

				return attributeNode && attributeNode.specified ?
					parseInt( attributeNode.value, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						undefined;
			}
		}
	}
});

// Hook for boolean attributes
boolHook = {
	get: function( elem, name ) {
		// Align boolean attributes with corresponding properties
		// Fall back to attribute presence where some booleans are not supported
		var attrNode,
			property = jQuery.prop( elem, name );
		return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
			name.toLowerCase() :
			undefined;
	},
	set: function( elem, value, name ) {
		var propName;
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			// value is true since we know at this point it's type boolean and not false
			// Set boolean attributes to the same name and set the DOM property
			propName = jQuery.propFix[ name ] || name;
			if ( propName in elem ) {
				// Only set the IDL specifically if it already exists on the element
				elem[ propName ] = true;
			}

			elem.setAttribute( name, name.toLowerCase() );
		}
		return name;
	}
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	fixSpecified = {
		name: true,
		id: true,
		coords: true
	};

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret;
			ret = elem.getAttributeNode( name );
			return ret && ( fixSpecified[ name ] ? ret.value !== "" : ret.specified ) ?
				ret.value :
				undefined;
		},
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				ret = document.createAttribute( name );
				elem.setAttributeNode( ret );
			}
			return ( ret.value = value + "" );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		});
	});

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		get: nodeHook.get,
		set: function( elem, value, name ) {
			if ( value === "" ) {
				value = "false";
			}
			nodeHook.set( elem, value, name );
		}
	};
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			get: function( elem ) {
				var ret = elem.getAttribute( name, 2 );
				return ret === null ? undefined : ret;
			}
		});
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Normalize to lowercase since IE uppercases css property names
			return elem.style.cssText.toLowerCase() || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = value + "" );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	});
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
	jQuery.each([ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			get: function( elem ) {
				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
				return elem.getAttribute("value") === null ? "on" : elem.value;
			}
		};
	});
}
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	});
});
var rformElems = /^(?:textarea|input|select)$/i,
	rtypenamespace = /^([^\.]*|)(?:\.(.+)|)$/,
	rhoverHack = /(?:^|\s)hover(\.\S+|)\b/,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	hoverHack = function( events ) {
		return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
	};

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	add: function( elem, types, handler, data, selector ) {

		var elemData, eventHandle, events,
			t, tns, type, namespaces, handleObj,
			handleObjIn, handlers, special;

		// Don't attach events to noData or text/comment nodes (allow plain objects tho)
		if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		events = elemData.events;
		if ( !events ) {
			elemData.events = events = {};
		}
		eventHandle = elemData.handle;
		if ( !eventHandle ) {
			elemData.handle = eventHandle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		// jQuery(...).bind("mouseover mouseout", fn);
		types = jQuery.trim( hoverHack(types) ).split( " " );
		for ( t = 0; t < types.length; t++ ) {

			tns = rtypenamespace.exec( types[t] ) || [];
			type = tns[1];
			namespaces = ( tns[2] || "" ).split( "." ).sort();

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: tns[1],
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			handlers = events[ type ];
			if ( !handlers ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	global: {},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var t, tns, type, origType, namespaces, origCount,
			j, events, special, eventType, handleObj,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
		for ( t = 0; t < types.length; t++ ) {
			tns = rtypenamespace.exec( types[t] ) || [];
			type = origType = tns[1];
			namespaces = tns[2];

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector? special.delegateType : special.bindType ) || type;
			eventType = events[ type ] || [];
			origCount = eventType.length;
			namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

			// Remove matching events
			for ( j = 0; j < eventType.length; j++ ) {
				handleObj = eventType[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					 ( !handler || handler.guid === handleObj.guid ) &&
					 ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
					 ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					eventType.splice( j--, 1 );

					if ( handleObj.selector ) {
						eventType.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( eventType.length === 0 && origCount !== eventType.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery.removeData( elem, "events", true );
		}
	},

	// Events that are safe to short-circuit if no handlers are attached.
	// Native DOM events should not be added, they may have inline handlers.
	customEvent: {
		"getData": true,
		"setData": true,
		"changeData": true
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		// Don't do events on text and comment nodes
		if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
			return;
		}

		// Event object or event type
		var cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType,
			type = event.type || event,
			namespaces = [];

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "!" ) >= 0 ) {
			// Exclusive events trigger only for the exact event (no namespaces)
			type = type.slice(0, -1);
			exclusive = true;
		}

		if ( type.indexOf( "." ) >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
			// No jQuery handlers for this event type, and it can't have inline handlers
			return;
		}

		// Caller can pass in an Event, Object, or just an event type string
		event = typeof event === "object" ?
			// jQuery.Event object
			event[ jQuery.expando ] ? event :
			// Object literal
			new jQuery.Event( type, event ) :
			// Just the event type (string)
			new jQuery.Event( type );

		event.type = type;
		event.isTrigger = true;
		event.exclusive = exclusive;
		event.namespace = namespaces.join( "." );
		event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
		ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

		// Handle a global trigger
		if ( !elem ) {

			// TODO: Stop taunting the data cache; remove global events and always attach to document
			cache = jQuery.cache;
			for ( i in cache ) {
				if ( cache[ i ].events && cache[ i ].events[ type ] ) {
					jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
				}
			}
			return;
		}

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data != null ? jQuery.makeArray( data ) : [];
		data.unshift( event );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		eventPath = [[ elem, special.bindType || type ]];
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
			for ( old = elem; cur; cur = cur.parentNode ) {
				eventPath.push([ cur, bubbleType ]);
				old = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( old === (elem.ownerDocument || document) ) {
				eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
			}
		}

		// Fire handlers on the event path
		for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

			cur = eventPath[i][0];
			event.type = eventPath[i][1];

			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
			// Note that this is a bare JS function and not a jQuery handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				// IE<9 dies on focus/blur to hidden element (#1486)
				if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					old = elem[ ontype ];

					if ( old ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( old ) {
						elem[ ontype ] = old;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event || window.event );

		var i, j, cur, ret, selMatch, matched, matches, handleObj, sel, related,
			handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
			delegateCount = handlers.delegateCount,
			args = core_slice.call( arguments ),
			run_all = !event.exclusive && !event.namespace,
			special = jQuery.event.special[ event.type ] || {},
			handlerQueue = [];

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers that should run if there are delegated events
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && !(event.button && event.type === "click") ) {

			for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

				// Don't process clicks (ONLY) on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					selMatch = {};
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];
						sel = handleObj.selector;

						if ( selMatch[ sel ] === undefined ) {
							selMatch[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) >= 0 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( selMatch[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, matches: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( handlers.length > delegateCount ) {
			handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
		}

		// Run delegates first; they may want to stop propagation beneath us
		for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
			matched = handlerQueue[ i ];
			event.currentTarget = matched.elem;

			for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
				handleObj = matched.matches[ j ];

				// Triggered event must either 1) be non-exclusive and have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

					event.data = handleObj.data;
					event.handleObj = handleObj;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						event.result = ret;
						if ( ret === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	// *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
	props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop,
			originalEvent = event,
			fixHook = jQuery.event.fixHooks[ event.type ] || {},
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = jQuery.Event( originalEvent );

		for ( i = copy.length; i; ) {
			prop = copy[ --i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Target should not be a text node (#504, Safari)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328; IE6/7/8)
		event.metaKey = !!event.metaKey;

		return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},

		focus: {
			delegateType: "focusin"
		},
		blur: {
			delegateType: "focusout"
		},

		beforeunload: {
			setup: function( data, namespaces, eventHandle ) {
				// We only want to do this special case on windows
				if ( jQuery.isWindow( this ) ) {
					this.onbeforeunload = eventHandle;
				}
			},

			teardown: function( namespaces, eventHandle ) {
				if ( this.onbeforeunload === eventHandle ) {
					this.onbeforeunload = null;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{ type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8 –
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === "undefined" ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

function returnFalse() {
	return false;
}
function returnTrue() {
	return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	preventDefault: function() {
		this.isDefaultPrevented = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}

		// if preventDefault exists run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// otherwise set the returnValue property of the original event to false (IE)
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		this.isPropagationStopped = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}
		// if stopPropagation exists run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}
		// otherwise set the cancelBubble property of the original event to true (IE)
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	},
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj,
				selector = handleObj.selector;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "_submit_attached" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "_submit_attached", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "_change_attached" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "_change_attached", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) { // && selector != null
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	live: function( types, data, fn ) {
		jQuery( this.context ).on( types, this.selector, data, fn );
		return this;
	},
	die: function( types, fn ) {
		jQuery( this.context ).off( types, this.selector || "**", fn );
		return this;
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		if ( this[0] ) {
			return jQuery.event.trigger( type, data, this[0], true );
		}
	},

	toggle: function( fn ) {
		// Save reference to arguments for access in closure
		var args = arguments,
			guid = fn.guid || jQuery.guid++,
			i = 0,
			toggler = function( event ) {
				// Figure out which function to execute
				var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
				jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

				// Make sure that clicks stop
				event.preventDefault();

				// and execute the function
				return args[ lastToggle ].apply( this, arguments ) || false;
			};

		// link all the functions, so any of them can unbind this click handler
		toggler.guid = guid;
		while ( i < args.length ) {
			args[ i++ ].guid = guid;
		}

		return this.click( toggler );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		if ( fn == null ) {
			fn = data;
			data = null;
		}

		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};

	if ( rkeyEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
	}

	if ( rmouseEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
	}
});
/*!
 * Sizzle CSS Selector Engine
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://sizzlejs.com/
 */
(function( window, undefined ) {

var cachedruns,
	assertGetIdNotName,
	Expr,
	getText,
	isXML,
	contains,
	compile,
	sortOrder,
	hasDuplicate,
	outermostContext,

	baseHasDuplicate = true,
	strundefined = "undefined",

	expando = ( "sizcache" + Math.random() ).replace( ".", "" ),

	Token = String,
	document = window.document,
	docElem = document.documentElement,
	dirruns = 0,
	done = 0,
	pop = [].pop,
	push = [].push,
	slice = [].slice,
	// Use a stripped-down indexOf if a native one is unavailable
	indexOf = [].indexOf || function( elem ) {
		var i = 0,
			len = this.length;
		for ( ; i < len; i++ ) {
			if ( this[i] === elem ) {
				return i;
			}
		}
		return -1;
	},

	// Augment a function for special use by Sizzle
	markFunction = function( fn, value ) {
		fn[ expando ] = value == null || value;
		return fn;
	},

	createCache = function() {
		var cache = {},
			keys = [];

		return markFunction(function( key, value ) {
			// Only keep the most recent entries
			if ( keys.push( key ) > Expr.cacheLength ) {
				delete cache[ keys.shift() ];
			}

			return (cache[ key ] = value);
		}, cache );
	},

	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),

	// Regex

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier (http://www.w3.org/TR/css3-selectors/#attribute-selectors)
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	operators = "([*^$|!~]?=)",
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:" + operators + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments not in parens/brackets,
	//   then attribute selectors and non-pseudos (denoted by :),
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:" + attributes + ")|[^:]|\\\\.)*|.*))\\)|)",

	// For matchExpr.POS and matchExpr.needsContext
	pos = ":(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
		"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([\\x20\\t\\r\\n\\f>+~])" + whitespace + "*" ),
	rpseudo = new RegExp( pseudos ),

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,

	rnot = /^:not/,
	rsibling = /[\x20\t\r\n\f]*[+~]/,
	rendsWithNot = /:not\($/,

	rheader = /h\d/i,
	rinputs = /input|select|textarea|button/i,

	rbackslash = /\\(?!\\)/g,

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"NAME": new RegExp( "^\\[name=['\"]?(" + characterEncoding + ")['\"]?\\]" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"POS": new RegExp( pos, "i" ),
		"CHILD": new RegExp( "^:(only|nth|first|last)-child(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		// For use in libraries implementing .is()
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|" + pos, "i" )
	},

	// Support

	// Used for testing something on an element
	assert = function( fn ) {
		var div = document.createElement("div");

		try {
			return fn( div );
		} catch (e) {
			return false;
		} finally {
			// release memory in IE
			div = null;
		}
	},

	// Check if getElementsByTagName("*") returns only elements
	assertTagNameNoComments = assert(function( div ) {
		div.appendChild( document.createComment("") );
		return !div.getElementsByTagName("*").length;
	}),

	// Check if getAttribute returns normalized href attributes
	assertHrefNotNormalized = assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild && typeof div.firstChild.getAttribute !== strundefined &&
			div.firstChild.getAttribute("href") === "#";
	}),

	// Check if attributes should be retrieved by attribute nodes
	assertAttributes = assert(function( div ) {
		div.innerHTML = "<select></select>";
		var type = typeof div.lastChild.getAttribute("multiple");
		// IE8 returns a string for some attributes even when not present
		return type !== "boolean" && type !== "string";
	}),

	// Check if getElementsByClassName can be trusted
	assertUsableClassName = assert(function( div ) {
		// Opera can't find a second classname (in 9.6)
		div.innerHTML = "<div class='hidden e'></div><div class='hidden'></div>";
		if ( !div.getElementsByClassName || !div.getElementsByClassName("e").length ) {
			return false;
		}

		// Safari 3.2 caches class attributes and doesn't catch changes
		div.lastChild.className = "e";
		return div.getElementsByClassName("e").length === 2;
	}),

	// Check if getElementById returns elements by name
	// Check if getElementsByName privileges form controls or returns elements by ID
	assertUsableName = assert(function( div ) {
		// Inject content
		div.id = expando + 0;
		div.innerHTML = "<a name='" + expando + "'></a><div name='" + expando + "'></div>";
		docElem.insertBefore( div, docElem.firstChild );

		// Test
		var pass = document.getElementsByName &&
			// buggy browsers will return fewer than the correct 2
			document.getElementsByName( expando ).length === 2 +
			// buggy browsers will return more than the correct 0
			document.getElementsByName( expando + 0 ).length;
		assertGetIdNotName = !document.getElementById( expando );

		// Cleanup
		docElem.removeChild( div );

		return pass;
	});

// If slice is not available, provide a backup
try {
	slice.call( docElem.childNodes, 0 )[0].nodeType;
} catch ( e ) {
	slice = function( i ) {
		var elem,
			results = [];
		for ( ; (elem = this[i]); i++ ) {
			results.push( elem );
		}
		return results;
	};
}

function Sizzle( selector, context, results, seed ) {
	results = results || [];
	context = context || document;
	var match, elem, xml, m,
		nodeType = context.nodeType;

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	if ( nodeType !== 1 && nodeType !== 9 ) {
		return [];
	}

	xml = isXML( context );

	if ( !xml && !seed ) {
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, slice.call(context.getElementsByTagName( selector ), 0) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && assertUsableClassName && context.getElementsByClassName ) {
				push.apply( results, slice.call(context.getElementsByClassName( m ), 0) );
				return results;
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed, xml );
}

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	return Sizzle( expr, null, null, [ elem ] ).length > 0;
};

// Returns a function to use in pseudos for input types
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

// Returns a function to use in pseudos for buttons
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

// Returns a function to use in pseudos for positionals
function createPositionalPseudo( fn ) {
	return markFunction(function( argument ) {
		argument = +argument;
		return markFunction(function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ (j = matchIndexes[i]) ] ) {
					seed[j] = !(matches[j] = seed[j]);
				}
			}
		});
	});
}

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent for elements
			// innerText usage removed for consistency of new lines (see #11153)
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else {
				// Traverse its children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
		// Do not include comment or processing instruction nodes
	} else {

		// If no nodeType, this is expected to be an array
		for ( ; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	}
	return ret;
};

isXML = Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

// Element contains another
contains = Sizzle.contains = docElem.contains ?
	function( a, b ) {
		var adown = a.nodeType === 9 ? a.documentElement : a,
			bup = b && b.parentNode;
		return a === bup || !!( bup && bup.nodeType === 1 && adown.contains && adown.contains(bup) );
	} :
	docElem.compareDocumentPosition ?
	function( a, b ) {
		return b && !!( a.compareDocumentPosition( b ) & 16 );
	} :
	function( a, b ) {
		while ( (b = b.parentNode) ) {
			if ( b === a ) {
				return true;
			}
		}
		return false;
	};

Sizzle.attr = function( elem, name ) {
	var val,
		xml = isXML( elem );

	if ( !xml ) {
		name = name.toLowerCase();
	}
	if ( (val = Expr.attrHandle[ name ]) ) {
		return val( elem );
	}
	if ( xml || assertAttributes ) {
		return elem.getAttribute( name );
	}
	val = elem.getAttributeNode( name );
	return val ?
		typeof elem[ name ] === "boolean" ?
			elem[ name ] ? name : null :
			val.specified ? val.value : null :
		null;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	// IE6/7 return a modified href
	attrHandle: assertHrefNotNormalized ?
		{} :
		{
			"href": function( elem ) {
				return elem.getAttribute( "href", 2 );
			},
			"type": function( elem ) {
				return elem.getAttribute("type");
			}
		},

	find: {
		"ID": assertGetIdNotName ?
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					return m && m.parentNode ? [m] : [];
				}
			} :
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );

					return m ?
						m.id === id || typeof m.getAttributeNode !== strundefined && m.getAttributeNode("id").value === id ?
							[m] :
							undefined :
						[];
				}
			},

		"TAG": assertTagNameNoComments ?
			function( tag, context ) {
				if ( typeof context.getElementsByTagName !== strundefined ) {
					return context.getElementsByTagName( tag );
				}
			} :
			function( tag, context ) {
				var results = context.getElementsByTagName( tag );

				// Filter out possible comments
				if ( tag === "*" ) {
					var elem,
						tmp = [],
						i = 0;

					for ( ; (elem = results[i]); i++ ) {
						if ( elem.nodeType === 1 ) {
							tmp.push( elem );
						}
					}

					return tmp;
				}
				return results;
			},

		"NAME": assertUsableName && function( tag, context ) {
			if ( typeof context.getElementsByName !== strundefined ) {
				return context.getElementsByName( name );
			}
		},

		"CLASS": assertUsableClassName && function( className, context, xml ) {
			if ( typeof context.getElementsByClassName !== strundefined && !xml ) {
				return context.getElementsByClassName( className );
			}
		}
	},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( rbackslash, "" );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( rbackslash, "" );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				3 xn-component of xn+y argument ([+-]?\d*n|)
				4 sign of xn-component
				5 x of xn-component
				6 sign of y-component
				7 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1] === "nth" ) {
				// nth-child requires argument
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[3] = +( match[3] ? match[4] + (match[5] || 1) : 2 * ( match[2] === "even" || match[2] === "odd" ) );
				match[4] = +( ( match[6] + match[7] ) || match[2] === "odd" );

			// other types prohibit arguments
			} else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var unquoted, excess;
			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			if ( match[3] ) {
				match[2] = match[3];
			} else if ( (unquoted = match[4]) ) {
				// Only check arguments that contain a pseudo
				if ( rpseudo.test(unquoted) &&
					// Get excess from tokenize (recursively)
					(excess = tokenize( unquoted, true )) &&
					// advance to the next closing parenthesis
					(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

					// excess is a negative index
					unquoted = unquoted.slice( 0, excess );
					match[0] = match[0].slice( 0, excess );
				}
				match[2] = unquoted;
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {
		"ID": assertGetIdNotName ?
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					return elem.getAttribute("id") === id;
				};
			} :
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
					return node && node.value === id;
				};
			},

		"TAG": function( nodeName ) {
			if ( nodeName === "*" ) {
				return function() { return true; };
			}
			nodeName = nodeName.replace( rbackslash, "" ).toLowerCase();

			return function( elem ) {
				return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
			};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ expando ][ className ];
			if ( !pattern ) {
				pattern = classCache( className, new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)") );
			}
			return function( elem ) {
				return pattern.test( elem.className || (typeof elem.getAttribute !== strundefined && elem.getAttribute("class")) || "" );
			};
		},

		"ATTR": function( name, operator, check ) {
			return function( elem, context ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.substr( result.length - check.length ) === check :
					operator === "~=" ? ( " " + result + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.substr( 0, check.length + 1 ) === check + "-" :
					false;
			};
		},

		"CHILD": function( type, argument, first, last ) {

			if ( type === "nth" ) {
				return function( elem ) {
					var node, diff,
						parent = elem.parentNode;

					if ( first === 1 && last === 0 ) {
						return true;
					}

					if ( parent ) {
						diff = 0;
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								diff++;
								if ( elem === node ) {
									break;
								}
							}
						}
					}

					// Incorporate the offset (or cast to NaN), then check against cycle size
					diff -= last;
					return diff === first || ( diff % first === 0 && diff / first >= 0 );
				};
			}

			return function( elem ) {
				var node = elem;

				switch ( type ) {
					case "only":
					case "first":
						while ( (node = node.previousSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						if ( type === "first" ) {
							return true;
						}

						node = elem;

						/* falls through */
					case "last":
						while ( (node = node.nextSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						return true;
				}
			};
		},

		"PSEUDO": function( pseudo, argument ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction(function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf.call( seed, matched[i] );
							seed[ idx ] = !( matches[ idx ] = matched[i] );
						}
					}) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {
		"not": markFunction(function( selector ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction(function( seed, matches, context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( (elem = unmatched[i]) ) {
							seed[i] = !(matches[i] = elem);
						}
					}
				}) :
				function( elem, context, xml ) {
					input[0] = elem;
					matcher( input, null, xml, results );
					return !results.pop();
				};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
			//   not comment, processing instructions, or others
			// Thanks to Diego Perini for the nodeName shortcut
			//   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
			var nodeType;
			elem = elem.firstChild;
			while ( elem ) {
				if ( elem.nodeName > "@" || (nodeType = elem.nodeType) === 3 || nodeType === 4 ) {
					return false;
				}
				elem = elem.nextSibling;
			}
			return true;
		},

		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"text": function( elem ) {
			var type, attr;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" &&
				(type = elem.type) === "text" &&
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === type );
		},

		// Input types
		"radio": createInputPseudo("radio"),
		"checkbox": createInputPseudo("checkbox"),
		"file": createInputPseudo("file"),
		"password": createInputPseudo("password"),
		"image": createInputPseudo("image"),

		"submit": createButtonPseudo("submit"),
		"reset": createButtonPseudo("reset"),

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"focus": function( elem ) {
			var doc = elem.ownerDocument;
			return elem === doc.activeElement && (!doc.hasFocus || doc.hasFocus()) && !!(elem.type || elem.href);
		},

		"active": function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		},

		// Positional types
		"first": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ 0 ];
		}),

		"last": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ length - 1 ];
		}),

		"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		}),

		"even": createPositionalPseudo(function( matchIndexes, length, argument ) {
			for ( var i = 0; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"odd": createPositionalPseudo(function( matchIndexes, length, argument ) {
			for ( var i = 1; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			for ( var i = argument < 0 ? argument + length : argument; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		}),

		"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
			for ( var i = argument < 0 ? argument + length : argument; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		})
	}
};

function siblingCheck( a, b, ret ) {
	if ( a === b ) {
		return ret;
	}

	var cur = a.nextSibling;

	while ( cur ) {
		if ( cur === b ) {
			return -1;
		}

		cur = cur.nextSibling;
	}

	return 1;
}

sortOrder = docElem.compareDocumentPosition ?
	function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		return ( !a.compareDocumentPosition || !b.compareDocumentPosition ?
			a.compareDocumentPosition :
			a.compareDocumentPosition(b) & 4
		) ? -1 : 1;
	} :
	function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

// Always assume the presence of duplicates if sort doesn't
// pass them to our comparison function (as in Google Chrome).
[0, 0].sort( sortOrder );
baseHasDuplicate = !hasDuplicate;

// Document sorting and removing duplicates
Sizzle.uniqueSort = function( results ) {
	var elem,
		i = 1;

	hasDuplicate = baseHasDuplicate;
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		for ( ; (elem = results[i]); i++ ) {
			if ( elem === results[ i - 1 ] ) {
				results.splice( i--, 1 );
			}
		}
	}

	return results;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

function tokenize( selector, parseOnly ) {
	var matched, match, tokens, type, soFar, groups, preFilters,
		cached = tokenCache[ expando ][ selector ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				soFar = soFar.slice( match[0].length );
			}
			groups.push( tokens = [] );
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			tokens.push( matched = new Token( match.shift() ) );
			soFar = soFar.slice( matched.length );

			// Cast descendant combinators to space
			matched.type = match[0].replace( rtrim, " " );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				// The last two arguments here are (context, xml) for backCompat
				(match = preFilters[ type ]( match, document, true ))) ) {

				tokens.push( matched = new Token( match.shift() ) );
				soFar = soFar.slice( matched.length );
				matched.type = type;
				matched.matches = match;
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		checkNonElements = base && combinator.dir === "parentNode",
		doneName = done++;

	return combinator.first ?
		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( (elem = elem[ dir ]) ) {
				if ( checkNonElements || elem.nodeType === 1  ) {
					return matcher( elem, context, xml );
				}
			}
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			// We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
			if ( !xml ) {
				var cache,
					dirkey = dirruns + " " + doneName + " ",
					cachedkey = dirkey + cachedruns;
				while ( (elem = elem[ dir ]) ) {
					if ( checkNonElements || elem.nodeType === 1 ) {
						if ( (cache = elem[ expando ]) === cachedkey ) {
							return elem.sizset;
						} else if ( typeof cache === "string" && cache.indexOf(dirkey) === 0 ) {
							if ( elem.sizset ) {
								return elem;
							}
						} else {
							elem[ expando ] = cachedkey;
							if ( matcher( elem, context, xml ) ) {
								elem.sizset = true;
								return elem;
							}
							elem.sizset = false;
						}
					}
				}
			} else {
				while ( (elem = elem[ dir ]) ) {
					if ( checkNonElements || elem.nodeType === 1 ) {
						if ( matcher( elem, context, xml ) ) {
							return elem;
						}
					}
				}
			}
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[i]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[0];
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( (elem = unmatched[i]) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction(function( seed, results, context, xml ) {
		// Positional selectors apply to seed elements, so it is invalid to follow them with relative ones
		if ( seed && postFinder ) {
			return;
		}

		var i, elem, postFilterIn,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [], seed ),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?
				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			postFilterIn = condense( matcherOut, postMap );
			postFilter( postFilterIn, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = postFilterIn.length;
			while ( i-- ) {
				if ( (elem = postFilterIn[i]) ) {
					matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
				}
			}
		}

		// Keep seed and results synchronized
		if ( seed ) {
			// Ignore postFinder because it can't coexist with seed
			i = preFilter && matcherOut.length;
			while ( i-- ) {
				if ( (elem = matcherOut[i]) ) {
					seed[ preMap[i] ] = !(results[ preMap[i] ] = elem);
				}
			}
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	});
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[0].type ],
		implicitRelative = leadingRelative || Expr.relative[" "],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf.call( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				(checkContext = context).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );
		} ];

	for ( ; i < len; i++ ) {
		if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			// The concatenated values are (context, xml) for backCompat
			matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {
				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[j].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && tokens.slice( 0, i - 1 ).join("").replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
					j < len && tokens.join("")
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, expandContext ) {
			var elem, j, matcher,
				setMatched = [],
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				outermost = expandContext != null,
				contextBackup = outermostContext,
				// We must always have either seed elements or context
				elems = seed || byElement && Expr.find["TAG"]( "*", expandContext && context.parentNode || context ),
				// Nested matchers should use non-integer dirruns
				dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.E);

			if ( outermost ) {
				outermostContext = context !== document && context;
				cachedruns = superMatcher.el;
			}

			// Add elements passing elementMatchers directly to results
			for ( ; (elem = elems[i]) != null; i++ ) {
				if ( byElement && elem ) {
					for ( j = 0; (matcher = elementMatchers[j]); j++ ) {
						if ( matcher( elem, context, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
						cachedruns = ++superMatcher.el;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {
					// They will have gone through all possible matchers
					if ( (elem = !matcher && elem) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// Apply set filters to unmatched elements
			matchedCount += i;
			if ( bySet && i !== matchedCount ) {
				for ( j = 0; (matcher = setMatchers[j]); j++ ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {
					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !(unmatched[i] || setMatched[i]) ) {
								setMatched[i] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	superMatcher.el = 0;
	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, group /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ expando ][ selector ];

	if ( !cached ) {
		// Generate a function of recursive functions that can be used to check each element
		if ( !group ) {
			group = tokenize( selector );
		}
		i = group.length;
		while ( i-- ) {
			cached = matcherFromTokens( group[i] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );
	}
	return cached;
};

function multipleContexts( selector, contexts, results, seed ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results, seed );
	}
	return results;
}

function select( selector, context, results, seed, xml ) {
	var i, tokens, token, type, find,
		match = tokenize( selector ),
		j = match.length;

	if ( !seed ) {
		// Try to minimize operations if there is only one group
		if ( match.length === 1 ) {

			// Take a shortcut and set the context if the root selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					context.nodeType === 9 && !xml &&
					Expr.relative[ tokens[1].type ] ) {

				context = Expr.find["ID"]( token.matches[0].replace( rbackslash, "" ), context, xml )[0];
				if ( !context ) {
					return results;
				}

				selector = selector.slice( tokens.shift().length );
			}

			// Fetch a seed set for right-to-left matching
			for ( i = matchExpr["POS"].test( selector ) ? -1 : tokens.length - 1; i >= 0; i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( rbackslash, "" ),
						rsibling.test( tokens[0].type ) && context.parentNode || context,
						xml
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && tokens.join("");
						if ( !selector ) {
							push.apply( results, slice.call( seed, 0 ) );
							return results;
						}

						break;
					}
				}
			}
		}
	}

	// Compile and execute a filtering function
	// Provide `match` to avoid retokenization if we modified the selector above
	compile( selector, match )(
		seed,
		context,
		xml,
		results,
		rsibling.test( selector )
	);
	return results;
}

if ( document.querySelectorAll ) {
	(function() {
		var disconnectedMatch,
			oldSelect = select,
			rescape = /'|\\/g,
			rattributeQuotes = /\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,

			// qSa(:focus) reports false when true (Chrome 21),
			// A support test would require too much code (would include document ready)
			rbuggyQSA = [":focus"],

			// matchesSelector(:focus) reports false when true (Chrome 21),
			// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
			// A support test would require too much code (would include document ready)
			// just skip matchesSelector for :active
			rbuggyMatches = [ ":active", ":focus" ],
			matches = docElem.matchesSelector ||
				docElem.mozMatchesSelector ||
				docElem.webkitMatchesSelector ||
				docElem.oMatchesSelector ||
				docElem.msMatchesSelector;

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explictly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select><option selected=''></option></select>";

			// IE8 - Some boolean attributes are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here (do not put tests after this one)
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {

			// Opera 10-12/IE9 - ^= $= *= and empty values
			// Should not select anything
			div.innerHTML = "<p test=''></p>";
			if ( div.querySelectorAll("[test^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\"\"|'')" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here (do not put tests after this one)
			div.innerHTML = "<input type='hidden'/>";
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push(":enabled", ":disabled");
			}
		});

		// rbuggyQSA always contains :focus, so no need for a length check
		rbuggyQSA = /* rbuggyQSA.length && */ new RegExp( rbuggyQSA.join("|") );

		select = function( selector, context, results, seed, xml ) {
			// Only use querySelectorAll when not filtering,
			// when this is not xml,
			// and when no QSA bugs apply
			if ( !seed && !xml && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
				var groups, i,
					old = true,
					nid = expando,
					newContext = context,
					newSelector = context.nodeType === 9 && selector;

				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					groups = tokenize( selector );

					if ( (old = context.getAttribute("id")) ) {
						nid = old.replace( rescape, "\\$&" );
					} else {
						context.setAttribute( "id", nid );
					}
					nid = "[id='" + nid + "'] ";

					i = groups.length;
					while ( i-- ) {
						groups[i] = nid + groups[i].join("");
					}
					newContext = rsibling.test( selector ) && context.parentNode || context;
					newSelector = groups.join(",");
				}

				if ( newSelector ) {
					try {
						push.apply( results, slice.call( newContext.querySelectorAll(
							newSelector
						), 0 ) );
						return results;
					} catch(qsaError) {
					} finally {
						if ( !old ) {
							context.removeAttribute("id");
						}
					}
				}
			}

			return oldSelect( selector, context, results, seed, xml );
		};

		if ( matches ) {
			assert(function( div ) {
				// Check to see if it's possible to do matchesSelector
				// on a disconnected node (IE 9)
				disconnectedMatch = matches.call( div, "div" );

				// This should fail with an exception
				// Gecko does not error, returns false instead
				try {
					matches.call( div, "[test!='']:sizzle" );
					rbuggyMatches.push( "!=", pseudos );
				} catch ( e ) {}
			});

			// rbuggyMatches always contains :active and :focus, so no need for a length check
			rbuggyMatches = /* rbuggyMatches.length && */ new RegExp( rbuggyMatches.join("|") );

			Sizzle.matchesSelector = function( elem, expr ) {
				// Make sure that attribute selectors are quoted
				expr = expr.replace( rattributeQuotes, "='$1']" );

				// rbuggyMatches always contains :active, so no need for an existence check
				if ( !isXML( elem ) && !rbuggyMatches.test( expr ) && (!rbuggyQSA || !rbuggyQSA.test( expr )) ) {
					try {
						var ret = matches.call( elem, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9
								elem.document && elem.document.nodeType !== 11 ) {
							return ret;
						}
					} catch(e) {}
				}

				return Sizzle( expr, null, null, [ elem ] ).length > 0;
			};
		}
	})();
}

// Deprecated
Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Back-compat
function setFilters() {}
Expr.filters = setFilters.prototype = Expr.pseudos;
Expr.setFilters = new setFilters();

// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})( window );
var runtil = /Until$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	isSimple = /^.[^:#\[\.,]*$/,
	rneedsContext = jQuery.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var i, l, length, n, r, ret,
			self = this;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		ret = this.pushStack( "", "find", selector );

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},

	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				rneedsContext.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			ret = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			cur = this[i];

			while ( cur && cur.ownerDocument && cur !== context && cur.nodeType !== 11 ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;
				}
				cur = cur.parentNode;
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( !runtil.test( name ) ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
	safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	rnocache = /<(?:script|object|embed|option|style)/i,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rcheckableType = /^(?:checkbox|radio)$/,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /\/(java|ecma)script/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		area: [ 1, "<map>", "</map>" ],
		_default: [ 0, "", "" ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
// unless wrapped in a div with non-breaking characters in front of it.
if ( !jQuery.support.htmlSerialize ) {
	wrapMap._default = [ 1, "X<div>", "</div>" ];
}

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	},

	append: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.insertBefore( elem, this.firstChild );
			}
		});
	},

	before: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( set, this ), "before", this.selector );
		}
	},

	after: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( this, set ), "after", this.selector );
		}
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
				if ( !keepData && elem.nodeType === 1 ) {
					jQuery.cleanData( elem.getElementsByTagName("*") );
					jQuery.cleanData( [ elem ] );
				}

				if ( elem.parentNode ) {
					elem.parentNode.removeChild( elem );
				}
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( elem.getElementsByTagName("*") );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( elem.getElementsByTagName( "*" ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function( value ) {
		if ( !isDisconnected( this[0] ) ) {
			// Make sure that the elements are removed from the DOM before they are inserted
			// this can help fix replacing a parent with child elements
			if ( jQuery.isFunction( value ) ) {
				return this.each(function(i) {
					var self = jQuery(this), old = self.html();
					self.replaceWith( value.call( this, i, old ) );
				});
			}

			if ( typeof value !== "string" ) {
				value = jQuery( value ).detach();
			}

			return this.each(function() {
				var next = this.nextSibling,
					parent = this.parentNode;

				jQuery( this ).remove();

				if ( next ) {
					jQuery(next).before( value );
				} else {
					jQuery(parent).append( value );
				}
			});
		}

		return this.length ?
			this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
			this;
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, table, callback ) {

		// Flatten any nested arrays
		args = [].concat.apply( [], args );

		var results, first, fragment, iNoClone,
			i = 0,
			value = args[0],
			scripts = [],
			l = this.length;

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( !jQuery.support.checkClone && l > 1 && typeof value === "string" && rchecked.test( value ) ) {
			return this.each(function() {
				jQuery(this).domManip( args, table, callback );
			});
		}

		if ( jQuery.isFunction(value) ) {
			return this.each(function(i) {
				var self = jQuery(this);
				args[0] = value.call( this, i, table ? self.html() : undefined );
				self.domManip( args, table, callback );
			});
		}

		if ( this[0] ) {
			results = jQuery.buildFragment( args, this, scripts );
			fragment = results.fragment;
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				table = table && jQuery.nodeName( first, "tr" );

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				// Fragments from the fragment cache must always be cloned and never used in place.
				for ( iNoClone = results.cacheable || l - 1; i < l; i++ ) {
					callback.call(
						table && jQuery.nodeName( this[i], "table" ) ?
							findOrAppend( this[i], "tbody" ) :
							this[i],
						i === iNoClone ?
							fragment :
							jQuery.clone( fragment, true, true )
					);
				}
			}

			// Fix #11809: Avoid leaking memory
			fragment = first = null;

			if ( scripts.length ) {
				jQuery.each( scripts, function( i, elem ) {
					if ( elem.src ) {
						if ( jQuery.ajax ) {
							jQuery.ajax({
								url: elem.src,
								type: "GET",
								dataType: "script",
								async: false,
								global: false,
								"throws": true
							});
						} else {
							jQuery.error("no ajax");
						}
					} else {
						jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "" ) );
					}

					if ( elem.parentNode ) {
						elem.parentNode.removeChild( elem );
					}
				});
			}
		}

		return this;
	}
});

function findOrAppend( elem, tag ) {
	return elem.getElementsByTagName( tag )[0] || elem.appendChild( elem.ownerDocument.createElement( tag ) );
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function cloneFixAttributes( src, dest ) {
	var nodeName;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	// clearAttributes removes the attributes, which we don't want,
	// but also removes the attachEvent events, which we *do* want
	if ( dest.clearAttributes ) {
		dest.clearAttributes();
	}

	// mergeAttributes, in contrast, only merges back on the
	// original attributes, not the events
	if ( dest.mergeAttributes ) {
		dest.mergeAttributes( src );
	}

	nodeName = dest.nodeName.toLowerCase();

	if ( nodeName === "object" ) {
		// IE6-10 improperly clones children of object elements using classid.
		// IE10 throws NoModificationAllowedError if parent is null, #12132.
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( jQuery.support.html5Clone && (src.innerHTML && !jQuery.trim(dest.innerHTML)) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;

	// IE blanks contents when cloning scripts
	} else if ( nodeName === "script" && dest.text !== src.text ) {
		dest.text = src.text;
	}

	// Event data gets referenced instead of copied if the expando
	// gets copied too
	dest.removeAttribute( jQuery.expando );
}

jQuery.buildFragment = function( args, context, scripts ) {
	var fragment, cacheable, cachehit,
		first = args[ 0 ];

	// Set context from what may come in as undefined or a jQuery collection or a node
	// Updated to fix #12266 where accessing context[0] could throw an exception in IE9/10 &
	// also doubles as fix for #8950 where plain objects caused createDocumentFragment exception
	context = context || document;
	context = !context.nodeType && context[0] || context;
	context = context.ownerDocument || context;

	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
	// Cloning options loses the selected state, so don't cache them
	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
	// Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
	if ( args.length === 1 && typeof first === "string" && first.length < 512 && context === document &&
		first.charAt(0) === "<" && !rnocache.test( first ) &&
		(jQuery.support.checkClone || !rchecked.test( first )) &&
		(jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

		// Mark cacheable and look for a hit
		cacheable = true;
		fragment = jQuery.fragments[ first ];
		cachehit = fragment !== undefined;
	}

	if ( !fragment ) {
		fragment = context.createDocumentFragment();
		jQuery.clean( args, context, fragment, scripts );

		// Update the cache, but only store false
		// unless this is a second parsing of the same content
		if ( cacheable ) {
			jQuery.fragments[ first ] = cachehit && fragment;
		}
	}

	return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			l = insert.length,
			parent = this.length === 1 && this[0].parentNode;

		if ( (parent == null || parent && parent.nodeType === 11 && parent.childNodes.length === 1) && l === 1 ) {
			insert[ original ]( this[0] );
			return this;
		} else {
			for ( ; i < l; i++ ) {
				elems = ( i > 0 ? this.clone(true) : this ).get();
				jQuery( insert[i] )[ original ]( elems );
				ret = ret.concat( elems );
			}

			return this.pushStack( ret, name, insert.selector );
		}
	};
});

function getAll( elem ) {
	if ( typeof elem.getElementsByTagName !== "undefined" ) {
		return elem.getElementsByTagName( "*" );

	} else if ( typeof elem.querySelectorAll !== "undefined" ) {
		return elem.querySelectorAll( "*" );

	} else {
		return [];
	}
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var srcElements,
			destElements,
			i,
			clone;

		if ( jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
			// IE copies events bound via attachEvent when using cloneNode.
			// Calling detachEvent on the clone will also remove the events
			// from the original. In order to get around this, we use some
			// proprietary methods to clear the events. Thanks to MooTools
			// guys for this hotness.

			cloneFixAttributes( elem, clone );

			// Using Sizzle here is crazy slow, so we use getElementsByTagName instead
			srcElements = getAll( elem );
			destElements = getAll( clone );

			// Weird iteration because IE will replace the length property
			// with an element if you are cloning the body and one of the
			// elements on the page has a name or id of "length"
			for ( i = 0; srcElements[i]; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					cloneFixAttributes( srcElements[i], destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			cloneCopyEvent( elem, clone );

			if ( deepDataAndEvents ) {
				srcElements = getAll( elem );
				destElements = getAll( clone );

				for ( i = 0; srcElements[i]; ++i ) {
					cloneCopyEvent( srcElements[i], destElements[i] );
				}
			}
		}

		srcElements = destElements = null;

		// Return the cloned set
		return clone;
	},

	clean: function( elems, context, fragment, scripts ) {
		var i, j, elem, tag, wrap, depth, div, hasBody, tbody, len, handleScript, jsTags,
			safe = context === document && safeFragment,
			ret = [];

		// Ensure that context is a document
		if ( !context || typeof context.createDocumentFragment === "undefined" ) {
			context = document;
		}

		// Use the already-created safe fragment if context permits
		for ( i = 0; (elem = elems[i]) != null; i++ ) {
			if ( typeof elem === "number" ) {
				elem += "";
			}

			if ( !elem ) {
				continue;
			}

			// Convert html string into DOM nodes
			if ( typeof elem === "string" ) {
				if ( !rhtml.test( elem ) ) {
					elem = context.createTextNode( elem );
				} else {
					// Ensure a safe container in which to render the html
					safe = safe || createSafeFragment( context );
					div = context.createElement("div");
					safe.appendChild( div );

					// Fix "XHTML"-style tags in all browsers
					elem = elem.replace(rxhtmlTag, "<$1></$2>");

					// Go to html and back, then peel off extra wrappers
					tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					depth = wrap[0];
					div.innerHTML = wrap[1] + elem + wrap[2];

					// Move to the right depth
					while ( depth-- ) {
						div = div.lastChild;
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						hasBody = rtbody.test(elem);
							tbody = tag === "table" && !hasBody ?
								div.firstChild && div.firstChild.childNodes :

								// String was a bare <thead> or <tfoot>
								wrap[1] === "<table>" && !hasBody ?
									div.childNodes :
									[];

						for ( j = tbody.length - 1; j >= 0 ; --j ) {
							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
								tbody[ j ].parentNode.removeChild( tbody[ j ] );
							}
						}
					}

					// IE completely kills leading whitespace when innerHTML is used
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
					}

					elem = div.childNodes;

					// Take out of fragment container (we need a fresh div each time)
					div.parentNode.removeChild( div );
				}
			}

			if ( elem.nodeType ) {
				ret.push( elem );
			} else {
				jQuery.merge( ret, elem );
			}
		}

		// Fix #11356: Clear elements from safeFragment
		if ( div ) {
			elem = div = safe = null;
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !jQuery.support.appendChecked ) {
			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				if ( jQuery.nodeName( elem, "input" ) ) {
					fixDefaultChecked( elem );
				} else if ( typeof elem.getElementsByTagName !== "undefined" ) {
					jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
				}
			}
		}

		// Append elements to a provided document fragment
		if ( fragment ) {
			// Special handling of each script element
			handleScript = function( elem ) {
				// Check if we consider it executable
				if ( !elem.type || rscriptType.test( elem.type ) ) {
					// Detach the script and store it in the scripts array (if provided) or the fragment
					// Return truthy to indicate that it has been handled
					return scripts ?
						scripts.push( elem.parentNode ? elem.parentNode.removeChild( elem ) : elem ) :
						fragment.appendChild( elem );
				}
			};

			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				// Check if we're done after handling an executable script
				if ( !( jQuery.nodeName( elem, "script" ) && handleScript( elem ) ) ) {
					// Append to fragment and handle embedded scripts
					fragment.appendChild( elem );
					if ( typeof elem.getElementsByTagName !== "undefined" ) {
						// handleScript alters the DOM, so use jQuery.merge to ensure snapshot iteration
						jsTags = jQuery.grep( jQuery.merge( [], elem.getElementsByTagName("script") ), handleScript );

						// Splice the scripts into ret after their former ancestor and advance our index beyond them
						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
						i += jsTags.length;
					}
				}
			}
		}

		return ret;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var data, id, elem, type,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = jQuery.support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( elem.removeAttribute ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						jQuery.deletedIds.push( id );
					}
				}
			}
		}
	}
});
// Limit scope pollution from any deprecated API
(function() {

var matched, browser;

// Use of jQuery.browser is frowned upon.
// More details: http://api.jquery.com/jQuery.browser
// jQuery.uaMatch maintained for back-compat
jQuery.uaMatch = function( ua ) {
	ua = ua.toLowerCase();

	var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
		/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
		/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
		/(msie) ([\w.]+)/.exec( ua ) ||
		ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
		[];

	return {
		browser: match[ 1 ] || "",
		version: match[ 2 ] || "0"
	};
};

matched = jQuery.uaMatch( navigator.userAgent );
browser = {};

if ( matched.browser ) {
	browser[ matched.browser ] = true;
	browser.version = matched.version;
}

// Chrome is Webkit, but Webkit is also Safari.
if ( browser.chrome ) {
	browser.webkit = true;
} else if ( browser.webkit ) {
	browser.safari = true;
}

jQuery.browser = browser;

jQuery.sub = function() {
	function jQuerySub( selector, context ) {
		return new jQuerySub.fn.init( selector, context );
	}
	jQuery.extend( true, jQuerySub, this );
	jQuerySub.superclass = this;
	jQuerySub.fn = jQuerySub.prototype = this();
	jQuerySub.fn.constructor = jQuerySub;
	jQuerySub.sub = this.sub;
	jQuerySub.fn.init = function init( selector, context ) {
		if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
			context = jQuerySub( context );
		}

		return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
	};
	jQuerySub.fn.init.prototype = jQuerySub.fn;
	var rootjQuerySub = jQuerySub(document);
	return jQuerySub;
};

})();
var curCSS, iframe, iframeDoc,
	ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity=([^)]*)/,
	rposition = /^(top|right|bottom|left)$/,
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rmargin = /^margin/,
	rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" ),
	rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" ),
	rrelNum = new RegExp( "^([-+])=(" + core_pnum + ")", "i" ),
	elemdisplay = {},

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssExpand = [ "Top", "Right", "Bottom", "Left" ],
	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],

	eventsToggle = jQuery.fn.toggle;

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name.charAt(0).toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function isHidden( elem, el ) {
	elem = el || elem;
	return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
}

function showHide( elements, show ) {
	var elem, display,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		values[ index ] = jQuery._data( elem, "olddisplay" );
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && elem.style.display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = jQuery._data( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
			}
		} else {
			display = curCSS( elem, "display" );

			if ( !values[ index ] && display !== "none" ) {
				jQuery._data( elem, "olddisplay", display );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.fn.extend({
	css: function( name, value ) {
		return jQuery.access( this, function( elem, name, value ) {
			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state, fn2 ) {
		var bool = typeof state === "boolean";

		if ( jQuery.isFunction( state ) && jQuery.isFunction( fn2 ) ) {
			return eventsToggle.apply( this, arguments );
		}

		return this.each(function() {
			if ( bool ? state : isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;

				}
			}
		}
	},

	// Exclude the following css properties to add px
	cssNumber: {
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, numeric, extra ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( numeric || extra !== undefined ) {
			num = parseFloat( val );
			return numeric || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations
	swap: function( elem, options, callback ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.call( elem );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

// NOTE: To any future maintainer, we've window.getComputedStyle
// because jsdom on node.js will break without it.
if ( window.getComputedStyle ) {
	curCSS = function( elem, name ) {
		var ret, width, minWidth, maxWidth,
			computed = window.getComputedStyle( elem, null ),
			style = elem.style;

		if ( computed ) {

			ret = computed[ name ];
			if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
				ret = jQuery.style( elem, name );
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
			// Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
			// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
			if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret;
	};
} else if ( document.documentElement.currentStyle ) {
	curCSS = function( elem, name ) {
		var left, rsLeft,
			ret = elem.currentStyle && elem.currentStyle[ name ],
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && style[ name ] ) {
			ret = style[ name ];
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		// but not position css attributes, as those are proportional to the parent element instead
		// and we can't measure the parent instead because it might trigger a "stacking dolls" problem
		if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

			// Remember the original values
			left = style.left;
			rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				elem.runtimeStyle.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				elem.runtimeStyle.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
			Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
			value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			// we use jQuery.css instead of curCSS here
			// because of the reliableMarginRight CSS hook!
			val += jQuery.css( elem, extra + cssExpand[ i ], true );
		}

		// From this point on we use curCSS for maximum performance (relevant in animations)
		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		valueIsBorderBox = true,
		isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox
		)
	) + "px";
}


// Try to determine the default display value of an element
function css_defaultDisplay( nodeName ) {
	if ( elemdisplay[ nodeName ] ) {
		return elemdisplay[ nodeName ];
	}

	var elem = jQuery( "<" + nodeName + ">" ).appendTo( document.body ),
		display = elem.css("display");
	elem.remove();

	// If the simple way fails,
	// get element's real default display by attaching it to a temp iframe
	if ( display === "none" || display === "" ) {
		// Use the already-created iframe if possible
		iframe = document.body.appendChild(
			iframe || jQuery.extend( document.createElement("iframe"), {
				frameBorder: 0,
				width: 0,
				height: 0
			})
		);

		// Create a cacheable copy of the iframe document on first call.
		// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
		// document to it; WebKit & Firefox won't allow reusing the iframe document.
		if ( !iframeDoc || !iframe.createElement ) {
			iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
			iframeDoc.write("<!doctype html><html><body>");
			iframeDoc.close();
		}

		elem = iframeDoc.body.appendChild( iframeDoc.createElement(nodeName) );

		display = curCSS( elem, "display" );
		document.body.removeChild( iframe );
	}

	// Store the correct default display
	elemdisplay[ nodeName ] = display;

	return display;
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				if ( elem.offsetWidth === 0 && rdisplayswap.test( curCSS( elem, "display" ) ) ) {
					return jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					});
				} else {
					return getWidthOrHeight( elem, name, extra );
				}
			}
		},

		set: function( elem, value, extra ) {
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box"
				) : 0
			);
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
				style.removeAttribute ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there there is no filter style applied in a css rule, we are done
				if ( currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
jQuery(function() {
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// Work around by temporarily setting element display to inline-block
				return jQuery.swap( elem, { "display": "inline-block" }, function() {
					if ( computed ) {
						return curCSS( elem, "marginRight" );
					}
				});
			}
		};
	}

	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// getComputedStyle returns percent when specified for top/left/bottom/right
	// rather than make the css module depend on the offset module, we just check for it here
	if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
		jQuery.each( [ "top", "left" ], function( i, prop ) {
			jQuery.cssHooks[ prop ] = {
				get: function( elem, computed ) {
					if ( computed ) {
						var ret = curCSS( elem, prop );
						// if curCSS returns percentage, fallback to offset
						return rnumnonpx.test( ret ) ? jQuery( elem ).position()[ prop ] + "px" : ret;
					}
				}
			};
		});
	}

});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || curCSS( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i,

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ],
				expanded = {};

			for ( i = 0; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});
var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	rselectTextarea = /^(?:select|textarea)/i;

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}
var
	// Document location
	ajaxLocParts,
	ajaxLocation,

	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType, list, placeBefore,
			dataTypes = dataTypeExpression.toLowerCase().split( core_rspace ),
			i = 0,
			length = dataTypes.length;

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var selection,
		list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters );

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	// Don't do a request if no elements are being requested
	if ( !this.length ) {
		return this;
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off, url.length );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// Request the remote document
	jQuery.ajax({
		url: url,

		// if "type" variable is undefined, then "GET" method will be used
		type: type,
		dataType: "html",
		data: params,
		complete: function( jqXHR, status ) {
			if ( callback ) {
				self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
			}
		}
	}).done(function( responseText ) {

		// Save response for use in complete callback
		response = arguments;

		// See if a selector was specified
		self.html( selector ?

			// Create a dummy div to hold the results
			jQuery("<div>")

				// inject the contents of the document in, removing the scripts
				// to avoid any 'Permission Denied' errors in IE
				.append( responseText.replace( rscript, "" ) )

				// Locate the specified elements
				.find( selector ) :

			// If not, just inject the full result
			responseText );

	});

	return this;
};

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
		}
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // ifModified key
			ifModifiedKey,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					statusText = statusText || strAbort;
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ ifModifiedKey ] = modified;
					}
					modified = jqXHR.getResponseHeader("Etag");
					if ( modified ) {
						jQuery.etag[ ifModifiedKey ] = modified;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					isSuccess = ajaxConvert( s, response );
					statusText = isSuccess.state;
					success = isSuccess.data;
					error = isSuccess.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.always( tmp );
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( core_rspace );

		// A cross-domain request is in order when we have a protocol:host:port mismatch
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() ) || false;
			s.crossDomain = parts && ( parts.join(":") + ( parts[ 3 ] ? "" : parts[ 1 ] === "http:" ? 80 : 443 ) ) !==
				( ajaxLocParts.join(":") + ( ajaxLocParts[ 3 ] ? "" : ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) );
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already and return
				return jqXHR.abort();

		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	var conv, conv2, current, tmp,
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice(),
		prev = dataTypes[ 0 ],
		converters = {},
		i = 0;

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	// Convert to each sequential dataType, tolerating list modification
	for ( ; (current = dataTypes[++i]); ) {

		// There's only work to do if current dataType is non-auto
		if ( current !== "*" ) {

			// Convert response if prev dataType is non-auto and differs from current
			if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split(" ");
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.splice( i--, 0, current );
								}

								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s["throws"] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}

			// Update prev for next iteration
			prev = current;
		}
	}

	return { state: "success", data: response };
}
var oldCallbacks = [],
	rquestion = /\?/,
	rjsonp = /(=)\?(?=&|$)|\?\?/,
	nonce = jQuery.now();

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		data = s.data,
		url = s.url,
		hasCallback = s.jsonp !== false,
		replaceInUrl = hasCallback && rjsonp.test( url ),
		replaceInData = hasCallback && !replaceInUrl && typeof data === "string" &&
			!( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") &&
			rjsonp.test( data );

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( s.dataTypes[ 0 ] === "jsonp" || replaceInUrl || replaceInData ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;
		overwritten = window[ callbackName ];

		// Insert callback into url or form data
		if ( replaceInUrl ) {
			s.url = url.replace( rjsonp, "$1" + callbackName );
		} else if ( replaceInData ) {
			s.data = data.replace( rjsonp, "$1" + callbackName );
		} else if ( hasCallback ) {
			s.url += ( rquestion.test( url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});
// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /javascript|ecmascript/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement( "script" );

				script.async = "async";

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( head && script.parentNode ) {
							head.removeChild( script );
						}

						// Dereference the script
						script = undefined;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};
				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
				// This arises when a base node is used (#2709 and #4378).
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( 0, 1 );
				}
			}
		};
	}
});
var xhrCallbacks,
	// #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var handle, i,
						xhr = s.xhr();

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occurred
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback, 0 );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}
var fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([-+])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [function( prop, value ) {
			var end, unit,
				tween = this.createTween( prop, value ),
				parts = rfxnum.exec( value ),
				target = tween.cur(),
				start = +target || 0,
				scale = 1,
				maxIterations = 20;

			if ( parts ) {
				end = +parts[2];
				unit = parts[3] || ( jQuery.cssNumber[ prop ] ? "" : "px" );

				// We need to compute starting value
				if ( unit !== "px" && start ) {
					// Iteratively approximate from a nonzero starting point
					// Prefer the current property, because this process will be trivial if it uses the same units
					// Fallback to end or a simple constant
					start = jQuery.css( tween.elem, prop, true ) || end || 1;

					do {
						// If previous iteration zeroed out, double until we get *something*
						// Use a string for doubling factor so we don't accidentally see scale as unchanged below
						scale = scale || ".5";

						// Adjust and apply
						start = start / scale;
						jQuery.style( tween.elem, prop, start + unit );

					// Update scale, tolerating zero or NaN from tween.cur()
					// And breaking the loop if scale is unchanged or perfect, or if we've just had enough
					} while ( scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations );
				}

				tween.unit = unit;
				tween.start = start;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
			}
			return tween;
		}]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	}, 0 );
	return ( fxNow = jQuery.now() );
}

function createTweens( animation, props ) {
	jQuery.each( props, function( prop, value ) {
		var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( collection[ index ].call( animation, prop, value ) ) {

				// we're done with this property
				return;
			}
		}
	});
}

function Animation( elem, properties, options ) {
	var result,
		index = 0,
		tweenerIndex = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				percent = 1 - ( remaining / animation.duration || 0 ),
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end, easing ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;

				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	createTweens( animation, props );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			anim: animation,
			queue: animation.opts.queue,
			elem: elem
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

function defaultPrefilter( elem, props, opts ) {
	var index, prop, value, length, dataShow, tween, hooks, oldfire,
		anim = this,
		style = elem.style,
		orig = {},
		handled = [],
		hidden = elem.nodeType && isHidden( elem );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		if ( jQuery.css( elem, "display" ) === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !jQuery.support.shrinkWrapBlocks ) {
			anim.done(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	for ( index in props ) {
		value = props[ index ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ index ];
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			handled.push( index );
		}
	}

	length = handled.length;
	if ( length ) {
		dataShow = jQuery._data( elem, "fxshow" ) || jQuery._data( elem, "fxshow", {} );
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			jQuery.removeData( elem, "fxshow", true );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( index = 0 ; index < length ; index++ ) {
			prop = handled[ index ];
			tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
			orig[ prop ] = dataShow[ prop ] || jQuery.style( elem, prop );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing any value as a 4th parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, false, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ||
			// special check for .toggle( handler, handler, ... )
			( !i && jQuery.isFunction( speed ) && jQuery.isFunction( easing ) ) ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations resolve immediately
				if ( empty ) {
					anim.stop( true );
				}
			};

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	}
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

jQuery.timers = [];
jQuery.fx = Tween.prototype.init;
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,
		i = 0;

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
};

jQuery.fx.timer = function( timer ) {
	if ( timer() && jQuery.timers.push( timer ) && !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.interval = 13;

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
var rroot = /^(?:body|html)$/i;

jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var docElem, body, win, clientTop, clientLeft, scrollTop, scrollLeft,
		box = { top: 0, left: 0 },
		elem = this[ 0 ],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return;
	}

	if ( (body = doc.body) === elem ) {
		return jQuery.offset.bodyOffset( elem );
	}

	docElem = doc.documentElement;

	// Make sure it's not a disconnected DOM node
	if ( !jQuery.contains( docElem, elem ) ) {
		return box;
	}

	// If we don't have gBCR, just use 0,0 rather than error
	// BlackBerry 5, iOS 3 (original iPhone)
	if ( typeof elem.getBoundingClientRect !== "undefined" ) {
		box = elem.getBoundingClientRect();
	}
	win = getWindow( doc );
	clientTop  = docElem.clientTop  || body.clientTop  || 0;
	clientLeft = docElem.clientLeft || body.clientLeft || 0;
	scrollTop  = win.pageYOffset || docElem.scrollTop;
	scrollLeft = win.pageXOffset || docElem.scrollLeft;
	return {
		top: box.top  + scrollTop  - clientTop,
		left: box.left + scrollLeft - clientLeft
	};
};

jQuery.offset = {

	bodyOffset: function( body ) {
		var top = body.offsetTop,
			left = body.offsetLeft;

		if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
		}

		return { top: top, left: left };
	},

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[0] ) {
			return;
		}

		var elem = this[0],

		// Get *real* offsetParent
		offsetParent = this.offsetParent(),

		// Get correct offsets
		offset       = this.offset(),
		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

		// Subtract element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

		// Add offsetParent borders
		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

		// Subtract the two offsets
		return {
			top:  offset.top  - parentOffset.top,
			left: offset.left - parentOffset.left
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || document.body;
			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || document.body;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					 top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return jQuery.access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, value, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});
// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}

})( window );
/**
 * Cloak Framework Core
 */

/*jshint browser: true, bitwise: false, camelcase: false, eqnull: true, latedef: false,
  plusplus: false, jquery: true, shadow: true, smarttabs: true, loopfunc: true */

/*global Class: true, EventEmitter2: true, _: true, Handlebars: true */

(function() {

	//
	// This is the regex used for parsing placeholders in model URLs
	//
	var urlPlaceholderRegex = /\{([^}]+)\}/;

// -------------------------------------------------------------
//  AppObject Class
	
	var nextId = 1;

	Class('AppObject').Extends(EventEmitter2, {

		//
		// Base constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			console.log('[' + time() + '] Intializing', this.__class__, 'instance');
			EventEmitter2.call(this, {
				wildcard: true,
				delimiter: '.'
			});
			this._uuid = nextId++;
			if (typeof this.initialize === 'function') {
				this.initialize.apply(this, arguments);
			}
		},

		//
		// Override EventEmitter2::emit so that it logs all emitted events. This could
		// (and probably should) be removed from production builds.
		//
		emit: function(event) {
			var ctorName = (this === app) ? 'app' : this.__class__;
			console.log('[' + time() + '] ' + ctorName + ':' + event);
			EventEmitter2.prototype.emit.apply(this, arguments);
		},

		//
		// Adds an extra method to all eventemitter2 objects called emits() that
		// returns an emitter function
		//
		// eg.
		//   var foo = new EventEmitter2({ ... });
		//   var emit = foo.emits('event', 'arg1');
		//   emit('arg2', 'arg3');
		//
		emits: function() {
			var args = _.toArray(arguments);
			args.unshift(this);
			args.unshift(this.emit);
			return _.bind.apply(_, args);
		},

		//
		// Adds an extra method to all eventemitter2 objects called reemit()
		// that causes all emitted events by one ee2 to be re-emitted by another.
		//
		// eg.
		//   var eeA = new EventEmitter2({ ... });
		//   var eeB = new EventEmitter2({ ... });
		//   
		//   eeA.on('foo', eeB.reemit());
		//   eeA.onAny(eeB.reemit());
		//   eeA.onAny(eeB.reemit('.fromA'));
		//   eeA.onAny(eeB.reemit(null, 'arg1', 'arg2'));
		//
		reemit: function(eventModifier) {
			var self = this;
			var boundArgs = _.toArray(arguments).slice(1);

			return function() {
				var event = this.event;
				var args = boundArgs.concat(_.toArray(arguments));

				// Allow events to be remapped to other event names
				//
				// eg.
				//   a.on('foo', b.reemit('.bar')) => 'foo.bar'
				//   a.on('foo', b.reemit('bar')) => 'bar'
				//
				if (eventModifier) {
					if (eventModifier[0] === '.') {
						event += eventModifier;
					} else {
						event = eventModifier;
					}
				}

				args.unshift(event);
				self.emit.apply(self, args);
			};
		}

	});

// -------------------------------------------------------------
//  Create the core namespace

	// Create the core application object
	var app = window.app = new AppObject();

	// Set the app object as the default class namespace
	Class.namespace(app);

	// Bind AppObject onto app
	app.AppObject = AppObject; delete window.AppObject;

	// This is where application config will be defined. These settings
	// should not be changed in place. To configure your app, create a
	// separate config file and include it after the app core.
	app.config = {

		// Should HTTP Basic auth be used, and if so, with what
		// credentials {user: String, pass: String}
		httpAuth: false,

		// What HTTP methods, if any, should be faked using the
		// x-http-method-override header
		httpMethodOverride: [ 'PUT', 'DELETE', 'PATCH' ],

		// URL to your API server
		apiUrl: location.protocol + '//' + location.host,

		// The property name used for passing model ids to and from
		// the server
		idKey: 'id',

		// Should id values be automatically copied over to models after
		// a GET request?
		autoAssignId: true,

		// Should the traditional config value be set on $.ajax calls?
		ajaxQueryParamsTraditional: true
	};

	// Expose a logging utility
	if (window.console && console.log) {
		app.log = function(value) {
			console.log('[' + time() + ']', value);
		};	
	} else {
		app.log = function() { };
	}

	// Expose easy access to window/document jQuery objects
	app.$win = $(window);
	app.$doc = $(document);

	// Runs when the DOM is ready
	app.$doc.ready(app.emits('ready'));

// -------------------------------------------------------------
//  Model Class

	Class('Model').Extends('AppObject', {

		//
		// Base model constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			// All model instances have their own XHR queue. This may not seem
			// very efficient in some ways, but there is actually very little
			// memory waste and it makes sure that everything is quick and
			// correct.
			this._xhr = new app.XhrQueue();

			// We use this for every xhr, so bind it now to save processing
			_.bindAll(this, '_parseUrlPlaceholders');

			var attributes = { };
			var scope = this.constructor;
			var scopeAttributes;

			// Work our way up the inheritence chain, building an initial attributes
			// object. Each level can be either an object, a function which returns
			// an object, or undefined/null.
			do {
				scopeAttributes = scope.prototype.attributes;
				if (scopeAttributes) {
					if (typeof scopeAttributes === 'function') {
						scopeAttributes = scopeAttributes.call(this);
					} else {
						scopeAttributes = _.clone(scopeAttributes);
					}
					attributes = _.extend(scopeAttributes, attributes);
				}
			} while (scope = scope.parent);
			
			this.attributes = attributes;

			// Build the URL parsing regex
			var url = this.url.replace('{@.id}', '([a-zA-Z0-9]+)');
			this._urlRegex = new RegExp('^' + app.config.apiUrl + url, 'i');

			this.construct.parentApply(this, arguments);
		},

	// -------------------------------------------------------------

		get: function(attr) {
			return this.attributes[attr];
		},

		set: function(attr, value) {
			var old = this.attributes[attr];
			if (old !== value) {
				this.attributes[attr] = value;
				this.emit('change.' + attr, value, old);
			}
		},

	// -------------------------------------------------------------

		//
		// Returns a simple object containing all of the attribtues
		//
		toObject: function() {
			return _.clone(this.attributes, true);
		},

		//
		// Converts the object into a JSON string
		//
		toJson: function() {
			return JSON.stringify(this.toObject());
		},

	// -------------------------------------------------------------

		//
		// Used to convert the model to JSON for POST/PUT/PATCH XHR calls
		//
		toXhr: function() {
			return this.toObject();
		},

		//
		// Used to convert XHR GET JSON back into model format
		//
		fromXhr: function(data) {
			_.extend(this.attributes, data);
		},
		//
		// Queue an XHR on the model's XhrQueue object
		//
		xhr: function(method, url, body, options) {
			url = url.replace(urlPlaceholderRegex, this._parseUrlPlaceholders);
			return this._xhr.request(method, url, body, options);
		},

		//
		// Parses {value} placeholders in URLs
		//
		_parseUrlPlaceholders: function(match, $1) {
			var levels = $1.split('.');
			var value;
			if (levels[0] === 'this') {
				levels.shift();
				value = this;
			} else if (levels[0] === '@') {
				levels.shift();
				value = this.attributes;
			} else {
				value = window;
			}
			for (var i = 0, c = levels.length; i < c; i++) {
				value = value[levels[i]] || '';
			}
			// If the placeholder value was found and is a function,
			// call the function and return its result.
			if (typeof value === 'function') {
				value = value.call(this);
			}
			return value;
		},

	// -------------------------------------------------------------

		//
		// Perform a GET request and update the model instance with the
		// retrieved data
		//
		load: function(properties) {
			if (arguments.length && ! _.isArray(properties)) {
				properties = _.toArray(arguments);
			}
			return this.xhr('GET', this.url, null, {properties: properties})
				.on('error', _.bind(this.onLoadError, this))
				.on('success', _.bind(this.onLoadSuccess, this));
		},

		//
		// Exactly the same as {Model::load} above, except that multiple
		// of these can be called at a time and only the minimum needed
		// XHRs will actually be made. For example, if the following code
		// was run:
		//
		//   var foo = new FooModel();
		//
		//   foo.loadLazy().on('ready', callback1);
		//   foo.loadLazy().on('ready', callback2);
		//   foo.loadLazy().on('ready', callback3);
		//
		// Only the first call would fire an XHR. The others would recognize
		// that a GET is already running and just wait for that first one
		// to finish before firing their callback.
		//
		loadLazy: function() {
			if (this._loadLazyRequest) {
				return this._loadLazyRequest;
			}
			return this._loadLazyRequest = this.xhr('GET', this.url, null)
				.on('error', _.bind(this.onLoadError, this))
				.on('success', _.bind(this.onLoadSuccess, this))
				.on('done', _.bind(this.onLoadLazyDone, this));
		},

		//
		// Runs when an error occurs on a GET request
		//
		onLoadError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a GET request comes back successfully
		//
		onLoadSuccess: function(req) {
			// Automatically assign the correct ID to requested objects
			if (app.config.autoAssignId && req.json && req.json[app.config.idKey]) {
				this[app.config.idKey] = req.json[app.config.idKey];
			}
			// Call the model's xhr data loader
			try {
				this.fromXhr(req.json, callback);
			} catch (err) {
				return callback(err);
			}
			if (this.fromXhr.length < 2) {
				callback();	
			}
			function callback(err) {
				if (err) {
					return req.emit('error.build', err);
				}
				req.emit.apply(req, _.extend(_.toArray(arguments), ['ready']));
			}
		},

		//
		// Runs when a {Model::getLazy} request finishes in any way; Just
		// does clean up
		//
		onLoadLazyDone: function() {
			this._loadLazyRequest = null;
		},

	// -------------------------------------------------------------

		//
		// Saves the model to the server. Selects the request method automatically
		// based on whether or not an ID property already exists.
		//
		save: function() {
			var method = (this.attributes[app.config.idKey] ? 'PUT' : 'POST');
			return this.xhr(method, this.url, this.toXhr())
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this));
		},

		//
		// Selectively saves specific properties back to the server using
		// a PATCH request.
		//
		// eg.
		//   foo.patch('propertyName');
		//   foo.patch('property1', 'property2');
		//   foo.patch([ 'property1', 'property2' ]);
		//
		patch: function(arg1) {
			var keys = _.isArray(arg1) ? arg1 : _.toArray(arguments);
			var data = _.pick.apply(_, [this.toXhr()].concat(keys));
			return this.xhr('PATCH', this.url, data)
				.on('error', _.bind(this.onSaveError, this))
				.on('success', _.bind(this.onSaveSuccess, this));
		},

		//
		// Runs when an error occurs on a POST/PUT/PATCH request
		//
		onSaveError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a POST/PUT/PATCH request comes back successfully
		//
		onSaveSuccess: function(req) {
			// If we just did a POST and recieved a 201 CREATED response,
			// fetch the Location header and parse it for our new id and
			// resource URI. 
			if (req.xhr.status === 201) {
				// Fetch the Location header for the new object
				var url = req.xhr.getResponseHeader('Location');

				// If there is no Location header, throw an error
				if (url === null) {
					throw new Error('No Location header sent from server; This is most likely ' +
						'a CORS error (http://bugs.jquery.com/ticket/11455#comment:1)');
				}

				// Parse the header to get the object ID
				var match = this._urlRegex.exec(url);

				// If there is no match, throw an error
				if (! match) {
					throw new Error('The server returned an invalid Location header');
				}

				// Store the object ID  on the model
				this.attributes[app.config.idKey] = match[1];
			}

			req.emit('ready', req);
		},

	// -------------------------------------------------------------

		//
		// Remove the resource from the server with a DELETE request
		//
		del: function() {
			// Don't allow deleting without an ID to avoid accidental deletion
			// of entire list routes
			if (this.attributes[app.config.idKey]) {
				return this.xhr('DELETE', this.url)
					.on('error', _.bind(this.onDelError, this))
					.on('success', _.bind(this.onDelSuccess, this));
			}
			throw new Error('Cannot make a DELETE request on a model with no ID');
		},

		//
		// Runs when an error occurs on a DELETE request
		//
		onDelError: function(req) {
			throw new app.XhrError(req);
		},

		//
		// Runs when a DELETE request comes back successfully
		//
		onDelSuccess: function(req) {
			if (this.destroy) {
				this.destroy();
			}
		},

	// -------------------------------------------------------------

		//
		// Prepare the object for garbage collection by nulling out
		// all property values
		//
		destroy: function() {
			if (typeof this.teardown === 'function') {
				this.teardown();
			}
			for (var i in this) {
				if (this.hasOwnProperty(this)) {
					this[i] = null;
				}
			}
		}

	});

// -------------------------------------------------------------
//  Collection Class
	
	Class('Collection').Extends('AppObject', {

		// ...

	});

// -------------------------------------------------------------
//  View Class

	Class('View').Extends('AppObject', {

		$elem: null,
		template: null,

		//
		// Base view constructor. All inheriting classes that override this
		// method MUST call this with this.construct.parent(this) in the
		// overriding method.
		//
		construct: function() {
			this.construct.parentApply(this, arguments);
		},

		//
		// Query for elements under the view's main $elem node
		//
		$: function(query) {
			return this.$elem.find(query);
		},

		//
		// Render the view's associated template with the given data
		//
		render: function(data, templateProperty) {
			data = _.extend({ _uuid: this._uuid }, data || { });

			this.emit('render', data);

			templateProperty = templateProperty || 'template';

			// If the template has not been used yet, compile it
			if (typeof this[templateProperty] === 'string') {
				this[templateProperty] = Handlebars.compile(this[templateProperty]);
			}
			
			// Render the compiled template
			if (typeof this[templateProperty] === 'function') {
				// This is a precompiled template which must be run through the
				// method Handlebars.template() first
				if (this[templateProperty].length === 5) {
					this[templateProperty] = Handlebars.template(this[templateProperty]);
				}
				return this[templateProperty](data);
			}
			
			throw new TypeError('Cannot render view without a valid template');
		},

		//
		// Bind DOM events listed in the events object.
		//
		// If the events object has an `_extends: true` property, then the events
		// object will be merged with the inherited one.
		//
		// If the events object has a `_delegate: true` property, then the events
		// will be delegated so that new elements added to the DOM will automatically
		// be bound to the new events.
		//
		// The `events` argument is used internally and should not be used by
		// application developers.
		//
		bindEvents: function(events) {
			events = _.extend({ }, events || this.events);

			if (events) {
				if (events._extends) {
					this.bindEvents(this._super.events);
				}

				var delegate = events._delegate;

				delete events._extends;
				delete events._delegate;

				_.forOwn(events, _.bind(this._bindEvent, this, delegate));
			}
		},

		//
		// Used internally by View::_bindEvent below
		//
		// Parses an event string for event data, eg.
		//
		//   keystroke{combo:ctrl+s}
		//
		// Becomes:
		//
		//   .on("keystroke", {"combo":"ctrl+s"}, ...)
		//
		_eventDataRegex: /\{([^}]+)\}$/,

		//
		// Used internally by View::bindEvents above
		//
		// Binds a single event from the events object.
		//
		_bindEvent: function(delegate, func, query) {
			var event;

			query = query.split(' ');
			event = query.shift();
			query = query.join(' ');
			func = _.bind(this[func], this);

			// Parse event data out of the event name
			var data = this._eventDataRegex.exec(event);
			if (data) {
				event = event.replace(data[0], '');
				data = data[1].split(',');
				
				var temp = { };
				_.forEach(data, function(item) {
					item = item.split(':');
					temp[item[0]] = item[1];
				});
				data = temp;
			}

			// Namespace the event so we can easily unbind later
			event += '._viewEvents.' + this._uuid;

			// Bind directly to this.$elem
			if (query === '@') {
				this.$elem.off(event);
				this.$elem.on(event, data, func);
			}

			// Bind to the document
			else if (query === '') {
				app.$doc.off(event);
				app.$doc.on(event, data, func);
			}

			// Bind using a delegate
			else if (delegate) {
				this.$elem.off(event, query);
				this.$elem.on(event, query, data, func);
			}

			// Bind directly with a query
			else {
				this.$(query).off(event);
				this.$(query).on(event, data, func);
			}
		},

		//
		// Removes event functions bound above
		//
		unbindEvents: function(events) {
			//
			// TODO doesn't handle the _extends case
			//
			_.forEach(events || _.keys(this.events),
				_.bind(this._unbindEvent, this, this.events._delegate));
		},

		//
		// Used internally by View::unbindEvents above
		//
		// Unbinds a single event from the events object
		//
		_unbindEvent: function(delegate, query) {
			var event;

			query = query.split(' ');
			event = query.shift();
			query = query.join(' ');

			// Parse event data out of the event name
			var data = this._eventDataRegex.exec(event);
			if (data) {
				event = event.replace(data[0], '');
			}

			// Namespace the event so we can easily unbind later
			event += '._viewEvents.' + this._uuid;

			// Bound directly to this.$elem
			if (query === '@') {
				this.$elem.off(event);
			}

			// Bound to the document
			else if (query === '') {
				app.$doc.off(event);
			}

			// Bound using a delegate
			else if (delegate) {
				this.$elem.off(event, query);
			}

			// Bound directly with a query
			else {
				this.$(query).off(event);
			}
		},

		//
		// Cleans up the view for garbage collection by pulling the base element
		// from the DOM, destroying all sub-elements, and nulling all properties
		// of the view instance
		//
		destroy: function() {
			if (typeof this.teardown === 'function') {
				this.teardown();
			}
			if (this.events) {
				this.unbindEvents();
			}
			if (this.$elem) {
				this.$elem.html('');
				this.$elem.remove();
			}
			for (var i in this) {
				if (this.hasOwnProperty(i)) {
					this[i] = null;
				}
			}
		}

	});

// -------------------------------------------------------------
//  XhrQueue Class
	
	Class('XhrQueue').Extends('AppObject', {

		queue: null,
		running: false,

		construct: function() {
			this.construct.parent(this);
			_.bindAll(this);

			this.queue = [ ];

			// This is a hack to avoid thrown duplicate errors because of
			// the below re-emitting of events
			this.on('error', $.noop);
		},

		//
		// Queues up a new XHR
		//
		request: function(method, url, body, options) {
			var req = new app.XhrRequest(method, url, body, options);

			// Also emit events at the XhrQueue level to allow more general listening
			var self = this;
			req.onAny(this.reemit());

			this.queue.push(req);
			this._run();
			return req;
		},

		//
		// Starts running the queue if it is not already running
		//
		_run: function() {
			if (! this.running) {
				this.running = true;

				var req = this.queue.shift();
				req.on('done', this._next);
				req.run();
			}
		},

		//
		// Runs the next request in the queue
		//
		_next: function() {
			this.running = false;
			if (this.queue.length) {
				this._run();
			}
		}

	});

// -------------------------------------------------------------
//  XhrRequest Class
	
	Class('XhrRequest').Extends('AppObject', {

		xhr: null,

		//
		// Prepares to make the request; Does every step except actually sending
		// the request to the server.
		//
		construct: function(method, url, body, options) {
			this.construct.parent(this);
			_.bindAll(this);

			this.method  = method;
			this.url     = url;
			this.body    = body;

			// This is the object that we will pass to jQuery.ajax
			this.config = {
				url:          app.config.apiUrl + url,
				type:         method,
				async:        true,
				cache:        false,
				dataType:     'json',
				contentType:  'application/json',
				complete:     this.oncomplete,
				headers:      { },
				traditional:  !! app.config.ajaxQueryParamsTraditional
			};

			// If needed, use an x-http-method-override header to fake the method
			if (_.indexOf(app.config.httpMethodOverride, method) >= 0) {
				this.config.type = 'POST';
				this.config.headers['X-Http-Method-Override'] = method;
			}

			// If needed, add HTTP Basic auth header
			if (app.config.httpAuth) {
				var auth = app.config.httpAuth;
				if (! auth._compiled) {
					auth._compiled = btoa(auth.user + ':' + auth.pass);
				}
				this.config.headers.Authorization = 'Basic ' + auth._compiled;
			}

			// Add the request body
			if (method === 'GET') {
				this.config.data = body;
			} else {
				this.config.data = JSON.stringify(body);
				this.config.processData = false;
			}

			if (options) {
				if (options.properties) {
					this.properties = options.properties;
					delete options.properties;
				}
				_.extend(this.config, options);
			}
		},

		//
		// Runs the request.
		//
		run: function() {
			console.log('[' + time() + ']', 'XHR:', this.method, this.url, this.config.data);
			this.xhr = $.ajax(this.config);
		},

		//
		// Runs when the request finishes to parse the response and emit
		// events.
		//
		oncomplete: function(xhr, status) {
			try {
				this.json = JSON.parse(xhr.responseText);
			} catch (e) {
				this.json = { };
			}
			if (this.properties) {
				var pickArgs = this.properties.slice(0);
				pickArgs.unshift(this.json);
				_.pick.apply(_, pickArgs);
			}
			this.emit('done');
			this.emit(status, this);
			if (status === 'error' || status === 'success') {
				this.emit(status + '.' + xhr.status, this);
			}
		},

		//
		// Abort the request early
		//
		abort: function() {
			if (this.xhr.abort) {
				this.xhr.abort();
			}
		}

	});

// -------------------------------------------------------------
//  XhrError Class

	Class('XhrError').Extends(Error, {

		construct: function(req) {
			Error.call(this);

			this.req = req;
			this.message = 'XHR Error ' + req.xhr.status + ': ' + req.xhr.statusText +
				' - ' + req.xhr.responseText;
		}

	});

// -------------------------------------------------------------
//  Helpers
	
	//
	// Gets a formatted time string of HH:MM:SS.mmmm
	//
	function time() {
		var now = new Date();
		return now.toLocaleTimeString() + '.' + ('000' + now.getMilliseconds()).slice(-4);
	}

}());
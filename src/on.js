/* UMD.define */ (function (root, factory) {
	if (typeof customLoader === 'function'){ customLoader(factory, 'on'); }else if (typeof define === 'function' && define.amd){ define([], factory); }else if(typeof exports === 'object'){ module.exports = factory(); }else{ root.returnExports = factory(); window.on = factory(); }
}(this, function () {
	// `on` is a simple library for attaching events to nodes. Its primary feature
	// is it returns a handle, from which you can pause, resume and remove the
	// event. Handles are much easier to manipulate than using removeEventListener
	// and recreating (sometimes complex or recursive) function signatures.
	//
	// `on` is touch-friendly and will normalize touch events.
	//
	// `on` also supports a custom `clickoff` event, to detect if you've clicked
	// anywhere in the document other than the passed node
	//
	// USAGE
	//      var handle = on(node, 'clickoff', callback);
	//      //  callback fires if something other than node is clicked
	//
	// USAGE
	//      var handle = on(node, 'mousedown', onStart);
	//      handle.pause();
	//      handle.resume();
	//      handle.remove();
	//
	//  `on` also supports multiple event types at once. The following example is
	//  useful for handling both desktop mouseovers and tablet clicks:
	//
	// USAGE
	//      var handle = on(node, 'mouseover,click', onStart);
	//
	//
	// `on` has an optional context parameter. The fourth argument can be 'this'
	// (or some other object) to conveniently avoid the use of var `self = this;`
	//
	//  USAGE
	//      var handle = on(this.node, 'mousedown', 'onStart', this);
	//
	// `on.multi` allows for connecting multiple events to a node at the same
	// time. Note this requires a context (I think), so it is not applicable for
	// anonymous functions.
	//
	//  USAGE
	//      handle = on.multi(document, {
	//          "touchend":"onEnd",
	//          "touchcancel":"onEnd",
	//          "touchmove":this.method
	//      }, this);
	//
	// `on.bind` is a convenience method for binding context to a method.
	//
	// USAGE
	//      callback = on.bind(this, 'myCallback');
	//
	// `on` supports an optional ID that can be used to track connections to be
	// disposed later.
	//
	// USAGE
	//      on(node, 'click', callback, 'uid-a');
	//      on(node, 'mouseover', callback, 'uid-a');
	//      on(otherNode, 'click', callback, 'uid-a');
	//      on(document, 'load', callback, 'uid-a');
	//      on.remove('uid-a');
	//
	// `on` supports selectors, seperated from the event by a space:
	//
	// USAGE
	//      on(node, 'click div.tab span', callback);
	//

	function hasWheel(){
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return  "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	}

	function has(what){
		switch(what){
			case 'wheel': return hasWheel();
		}
		return false;
	}

	function populateRange(keys, fromChar, toChar){
		for(var i = fromChar.charCodeAt(0), n = toChar.charCodeAt(0); i <= n; ++i){
			keys[i] = String.fromCharCode(i);
		}
	}

	var
		isWin = navigator.userAgent.indexOf('Windows')>-1,
		FACTOR = isWin ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle,
		//numCalls = 0,
		keyCodes = [], // it will be a sparse array to keep alphanumeric ASCII characters
		registry = {};

	populateRange(keyCodes, '0', '9');
	populateRange(keyCodes, 'a', 'z');
	populateRange(keyCodes, 'A', 'Z');

	function normalizeKeyEvent (callback){
		// Add alphanumeric property (the letter typed) to the KeyEvent
		//
		return function(e){
			// 48-57 0-9
			// 65 - 90 a-z
			var value = keyCodes[e.keyCode];
			if(typeof value == 'string'){
				e.alphanumeric = value;
			}
			callback(e);
		};
	}

	function register(id, handle){
		if(!registry[id]){
			registry[id] = [];
		}
		registry[id].push(handle);
	}

	function makeMultiHandle (handles){
		return {
			remove: function(){
				handles.forEach(function(h){
					// allow for a simple function in the list
					if(h.remove) {
						h.remove();
					}else if(typeof h === 'function'){
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function(){};
			},
			pause: function(){
				handles.forEach(function(h){ if(h.pause){ h.pause(); }});
			},
			resume: function(){
				handles.forEach(function(h){ if(h.resume){ h.resume(); }});
			}
		};
	}

	function onClickoff (node, callback){
		var
			isOver = false,
			mHandle,
			handle,
			lHandle = on(node, 'mouseleave', function(){
				isOver = false;
			}),
			eHandle = on(node, 'mouseenter', function(){
				isOver = true;
			}),
			bHandle = on(document.body, 'click', function(event){
				if(!isOver){
					callback(event);
				}
			});

		mHandle = makeMultiHandle([lHandle, eHandle, bHandle]);

		handle = {
			resume: function () {
				setTimeout(function () {
					mHandle.resume();
				}, 100);
			},
			pause: function () {
				isOver = false;
				mHandle.pause();
			},
			remove: function () {
				isOver = false;
				mHandle.remove();
			}
		};

		handle.pause();

		return handle;
	}

	function getNode(str){
		if(typeof str !== 'string'){
			return str;
		}
		var node;
		if(/\#|\.|\s/.test(str)){
			node = document.body.querySelector(str);
		}else{
			node = document.getElementById(str);
		}
		if(!node){
			console.error('localLib/on Could not find:', str);
		}
		return node;
	}

	function normalizeWheelEvent (callback){
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function(e){
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function(){
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function on (node, eventType, callback, optionalContext, id){
		//  USAGE
		//      var handle = on(this.node, 'mousedown', this, 'onStart');
		//      handle.pause();
		//      handle.resume();
		//      handle.remove();
		//
		var
			handles,
			handle,
			targetCallback,
			childTarget = false;

		if(/,/.test(eventType)){
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventType.split(',').forEach(function(eStr){
				handles.push(on(node, eStr.trim(), callback, optionalContext, id));
			});
			return makeMultiHandle(handles);
		}

		if(typeof optionalContext === 'string'){
			// no context. Last argument is handle id
			id = optionalContext;
			optionalContext = null;
		}

		node = getNode(node);
		callback = !!optionalContext ? bind(optionalContext, callback) : callback;

		if(/\s/.test(eventType)){
			// handle child selectors, like:
			// on(node, 'click .tab span', callback);
			//
			childTarget = eventType.substring(eventType.indexOf(' ') + 1, eventType.length);
			eventType = eventType.substring(0, eventType.indexOf(' '));
			targetCallback = callback;
			callback = function(e){
				var i, nodes, parent = on.ancestor(e.target, childTarget);
				if(parent){
					e.selectorTarget = parent;
					targetCallback(e);
				}else{
					nodes = node.querySelectorAll(childTarget);
					for(i = 0; i < nodes.length; i ++){
						if(nodes[i] === e.target || on.isAncestor(nodes[i], e.target)){
							e.selectorTarget = nodes[i];
							targetCallback(e);
							break;
						}
					}
				}
			};

		}

		if(eventType === 'clickoff'){
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if(eventType === 'wheel'){
			// mousewheel events, natch
			if(has('wheel')){
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			}else{
				// old Firefox, old IE, Chrome
				return on.multi(node, {
					DOMMouseScroll:normalizeWheelEvent(callback),
					mousewheel:normalizeWheelEvent(callback)
				}, optionalContext);
			}
		}

		if(eventType.indexOf('key') > -1){
			callback = normalizeKeyEvent(callback);
		}


		node.addEventListener(eventType, callback, false);

		handle = {
			remove: function() {
				node.removeEventListener(eventType, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function(){};
			},
			pause: function(){
				node.removeEventListener(eventType, callback, false);
			},
			resume: function(){
				node.addEventListener(eventType, callback, false);
			}
		};

		if(id){
			// If an ID has been passed, register it so it can be used to
			// remove multiple events by id
			register(id, handle);
		}

		return handle;
	}

	on.multi = function(node, map, context, id){
		//  USAGE
		//      handle = on.multi(document, {
		//          "touchend":"onEnd",
		//          "touchcancel":"onEnd",
		//          "touchmove":this.method
		//      }, this);
		//
		var eventType,
			handles = [];

		for( eventType in map ){
			if(map.hasOwnProperty(eventType)){
				handles.push(on(node, eventType, map[eventType], context, id));
			}
		}

		return makeMultiHandle(handles);
	};

	on.remove = function(handles){
		// convenience function;
		// removes one or more handles;
		// accepts one handle or an array of handles;
		// accepts different types of handles (dispose/remove/topic token)
		//
		var i, h, idHandles;
		if(typeof handles === 'string'){
			idHandles = registry[handles];
			if(idHandles){
				idHandles.forEach(function(h){
					h.remove();
				});
				idHandles = registry[handles] = null;
				delete registry[handles];
			}

			return [];
		}
		handles = Array.isArray(handles) ? handles : [handles];

		for( i = 0; i < handles.length; i++ ){
			h = handles[i];

			if(h){ // check for nulls / already removed handles
				if(h.remove){
					// on handle, or AOP
					h.remove();
				}
				else if(h.dispose){
					// knockout
					h.dispose();
				}
				else if(typeof h === 'function'){
					// custom clean up
					h();
				}
			}
		}
		return [];
	};

	on.ancestor = function(node, selector){
		// gets the ancestor of node based on selector criteria
		// useful for getting the target node when a child node is clicked upon
		//
		// USAGE
		//      on.selector(childNode, '.app.active');
		//      on.selector(childNode, '#thinger');
		//      on.selector(childNode, 'div');
		//	DOES NOT SUPPORT:
		//		combinations of above
		var
			test,
			parent = node;

		if(selector.indexOf('.') === 0){
			// className
			selector = selector.replace('.', ' ').trim();
			test = function(n){
				return n.classList.contains(selector);
			};
		}
		else if(selector.indexOf('#') === 0){
			// node id
			selector = selector.replace('#', '').trim();
			test = function(n){
				return n.id === selector;
			};
		}
		else if(selector.indexOf('[') > -1){
			// attribute
			console.error('attribute selectors are not yet supported');
		}
		else{
			// assuming node name
			selector = selector.toUpperCase();
			test = function(n){
				return n.nodeName === selector;
			};
		}

		while(parent){
			if(parent === document.body || parent === document){ return false; }
			if(test(parent)){ break; }
			parent = parent.parentNode;
		}

		return parent;
	};

	on.isAncestor = function(parent, child){
		// determines if parent is an ancestor of child
		// returns boolean
		//
		if(parent === child){ return false; } // do we always want the same node to be false?
		while(child){
			if(child === parent){
				return true;
			}
			child = child.parentNode;
		}
		return false;
	};

	on.once = function (node, eventType, callback, optionalContext){
		var h = on(node, eventType, function () {
			callback.apply(optionalContext, arguments);
			h.remove();
		});
	};

	on.makeMultiHandle = makeMultiHandle;

	return on;

}));

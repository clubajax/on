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
	// `on` supports selector filters. The targeted element will be in the event
	// as filteredTarget
	//
	// USAGE
	//      on(node, 'click', 'div.tab span', callback);
	//

	'use strict';

	try{
		window.keyboardeventKeyPolyfill.polyfill();
	}catch(e){
		console.error('on/src/key-poly is required for the event.key property');
	}

	function hasWheelTest(){
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return  "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	}

	var
		INVALID_PROPS,
		matches,
		hasWheel = hasWheelTest(),
		isWin = navigator.userAgent.indexOf('Windows')>-1,
		FACTOR = isWin ? 10 : 0.1,
		XLR8 = 0,
		mouseWheelHandle;


	['matches', 'matchesSelector', 'webkit', 'moz', 'ms', 'o'].some(function (name) {
		if (name.length < 7) { // prefix
			name += 'MatchesSelector';
		}
		if (Element.prototype[name]) {
			matches = name;
			return true;
		}
		return false;
	});

	function closest (element, selector, parent) {
		while (element) {
			if (element[matches] && element[matches](selector)) {
				return element;
			}
			if (element === parent) {
				break;
			}
			element = element.parentElement;
		}
		return null;
	}

	function closestFilter (element, selector) {
		return function (e) {
			return closest(e.target, selector, element);
		};
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
		// important note!
		// starts paused
		//
		var
			handle,
			bHandle = on(document.body, 'click', function(event){
				var target = event.target;
				if(target.nodeType !== 1){
					target = target.parentNode;
				}
				if(target && !node.contains(target)) {
					callback(event);
				}
			});

		handle = {
			resume: function () {
				setTimeout(function () {
					bHandle.resume();
				}, 100);
			},
			pause: function () {
				bHandle.pause();
			},
			remove: function () {
				bHandle.remove();
			}
		};

		handle.pause();

		return handle;
	}

	function onImageLoad (img, callback) {
		function onImageLoad (e) {
				var h = setInterval(function () {
					if(img.naturalWidth){
						e.width = img.naturalWidth;
						e.naturalWidth = img.naturalWidth;
						e.height = img.naturalHeight;
						e.naturalHeight = img.naturalHeight;
						callback(e);
						clearInterval(h);
					}
				}, 100);
			img.removeEventListener('load', onImageLoad);
			img.removeEventListener('error', callback);
		}
		img.addEventListener('load', onImageLoad);
		img.addEventListener('error', callback);
		return {
			pause: function () {},
			resume: function () {},
			remove: function () {
				img.removeEventListener('load', onImageLoad);
				img.removeEventListener('error', callback);
			}
		}
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

	function on (node, eventType, filter, handler){
		//  USAGE
		//      var handle = on(this.node, 'mousedown', this, 'onStart');
		//      handle.pause();
		//      handle.resume();
		//      handle.remove();
		//
		var
			callback,
			handles,
			handle;

		if(/,/.test(eventType)){
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventType.split(',').forEach(function(eStr){
				handles.push(on(node, eStr.trim(), filter, handler));
			});
			return makeMultiHandle(handles);
		}

		node = getNode(node);

		if(filter && handler){
			if (typeof filter == 'string') {
				filter = closestFilter(node, filter);
			}
			// else it is a custom function
			callback = function (e) {
				var result = filter(e);
				if (result) {
					e.filteredTarget = result;
					handler(e, result);
				}
			};
		}else{
			callback = filter || handler;
		}

		if(eventType === 'clickoff'){
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if (eventType === 'load' && node.localName === 'img'){
			return onImageLoad(node, callback);
		}

		if(eventType === 'wheel'){
			// mousewheel events, natch
			if(hasWheel){
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			}else{
				// old Firefox, old IE, Chrome
				return makeMultiHandle([
					on(node, 'DOMMouseScroll', normalizeWheelEvent(callback)),
					on(node, 'mousewheel', normalizeWheelEvent(callback))
				]);
			}
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

		return handle;
	}

	on.once = function (node, eventType, filter, callback){
		var h;
		if(filter && callback){
			h = on(node, eventType, filter, function () {
				callback.apply(window, arguments);
				h.remove();
			});
		}else{
			h = on(node, eventType, function () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	INVALID_PROPS = {
		isTrusted:1
	};
	function mix(object, value){
		if(typeof value === 'object') {
			Object.keys(value).forEach(function (key) {
				if(!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			});
		}else{
			object.value = value;
		}
		return object;
	}

	on.emit = function (node, eventName, value) {
		node = getNode(node);
		var event = document.createEvent('HTMLEvents');
		event.initEvent(eventName, true, true); // event type, bubbling, cancelable
		return node.dispatchEvent(mix(event, value));
	};

	on.fire = function (node, eventName, eventDetail, bubbles) {
		var event = document.createEvent('CustomEvent');
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable
		return node.dispatchEvent(event);
	};

	on.isAlphaNumeric = function (str) {
		if(str.length > 1){ return false; }
		if(str === ' '){ return false; }
		if(!isNaN(Number(str))){ return true; }
		var code = str.toLowerCase().charCodeAt(0);
		return code >= 97 && code <= 122;
	};

	on.makeMultiHandle = makeMultiHandle;
	on.closest = closest;
	on.matches = matches;

	return on;

}));

(function (root, factory) {
	if (typeof customLoader === 'function') {
		customLoader(factory, 'on');
	} else if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.returnExports = factory();
		window.on = factory();
	}
}(this, function () {
	'use strict';

	function hasWheelTest () {
		var
			isIE = navigator.userAgent.indexOf('Trident') > -1,
			div = document.createElement('div');
		return "onwheel" in div || "wheel" in div ||
			(isIE && document.implementation.hasFeature("Events.wheel", "3.0")); // IE feature detection
	}

	var
		INVALID_PROPS,
		matches,
		hasWheel = hasWheelTest(),
		isWin = navigator.userAgent.indexOf('Windows') > -1,
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

	function makeMultiHandle (handles) {
		return {
			remove: function () {
				handles.forEach(function (h) {
					// allow for a simple function in the list
					if (h.remove) {
						h.remove();
					} else if (typeof h === 'function') {
						h();
					}
				});
				handles = [];
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function () {
				handles.forEach(function (h) {
					if (h.pause) {
						h.pause();
					}
				});
			},
			resume: function () {
				handles.forEach(function (h) {
					if (h.resume) {
						h.resume();
					}
				});
			}
		};
	}

	function onClickoff (node, callback) {
		// important note!
		// starts paused
		//
		var
			handle,
			bHandle = on(document.body, 'click', function (event) {
				var target = event.target;
				if (target.nodeType !== 1) {
					target = target.parentNode;
				}
				if (target && !node.contains(target)) {
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
				if (img.naturalWidth) {
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

	function getNode (str) {
		if (typeof str !== 'string') {
			return str;
		}
		var node = document.getElementById(str);
		if (!node) {
			console.error('`on` Could not find:', str);
		}
		return node;
	}

	var ieKeys = {
		Up: 'ArrowUp',
		Down: 'ArrowDown',
		Left: 'ArrowLeft',
		Right: 'ArrowRight',
		Esc: 'Escape',
		Spacebar: ' ',
		Win: 'Command',
		Alt: 'Option'
	};

	function normalizeKeyEvent (callback) {
		// IE uses old spec
		return function (e) {
			if (ieKeys[e.key]) {
				e.key = ieKeys[e.key];
			}
			callback(e);
		}
	}

	function normalizeWheelEvent (callback) {
		// normalizes all browsers' events to a standard:
		// delta, wheelY, wheelX
		// also adds acceleration and deceleration to make
		// Mac and Windows behave similarly
		return function (e) {
			XLR8 += FACTOR;
			var
				deltaY = Math.max(-1, Math.min(1, (e.wheelDeltaY || e.deltaY))),
				deltaX = Math.max(-10, Math.min(10, (e.wheelDeltaX || e.deltaX)));

			deltaY = deltaY <= 0 ? deltaY - XLR8 : deltaY + XLR8;

			e.delta = deltaY;
			e.wheelY = deltaY;
			e.wheelX = deltaX;

			clearTimeout(mouseWheelHandle);
			mouseWheelHandle = setTimeout(function () {
				XLR8 = 0;
			}, 300);
			callback(e);
		};
	}

	function isMultiKey (eventName) {
		return /,/.test(eventName) && !/click|mouse|resize|scroll/.test(eventName);
	}

	function keysToRegExp (eventName) {
		return new RegExp(eventName.replace('keydown:', '').replace('keyup:', '').split(',').join('|'));
	}

	function onRWD (queries, callback) {
		// TODO: Should probably be its own library. Dofferent function signature, little used, too big
		// 400, 500, 600
		var mqs = queries.split(',').map(function (str) {
			var width = parseInt(str.trim());
			var query = '(max-width:' + width + 'px)';
			return {
				width: width,
				query: query,
				mq: window.matchMedia(query)
			};
		});

		mqs = mqs.concat(mqs.map(function (mq) {
			var query = mq.query.replace('max', 'min');
			return {
				query: query,
				width: mq.width,
				mq: window.matchMedia(query)
			}
		}));

		mqs.forEach(function (m) {
			m.mq.addListener(onMediaChange);
			onMediaChange({ srcElement: m });
		});

		function get (q) {
			var subOne = /max/.test(q);
			var i;
			for (i = 0; i < mqs.length; i++) {
				if (mqs[i].query === q) {
					if (subOne) {
						if (i - 1 >= 0) {
							return mqs[i - 1];
						} else {
							return null;
						}
					} else {
						return mqs[i];
					}

				}
			}
			return null;
		}

		return {
			remove: function () {
				mqs.forEach(function (m) {
					m.mq.removeListener(onMediaChange);
				});
			}
		};


		function onMediaChange (e) {
			const mq = e.srcElement;
			if (mq.matches) {
				var m = get(mq.media);
				if (m) {
					callback(m.width);
				}
			}
		}
	}

	function on (node, eventName, filter, handler) {
		var
			callback,
			handles,
			handle,
			keyRegExp;

		if (typeof node === 'string' && /rwd:/.test(node)) {
			console.log('RWD!');


		}

		if (isMultiKey(eventName)) {
			keyRegExp = keysToRegExp(eventName);
			callback = function (e) {
				if (keyRegExp.test(e.key)) {
					(handler || filter)(e);
				}
			};
			eventName = /keydown/.test(eventName) ? 'keydown' : 'keyup';
		} else {
			//console.log('NOT');
		}

		if (/,/.test(eventName)) {
			// handle multiple event types, like:
			// on(node, 'mouseup, mousedown', callback);
			//
			handles = [];
			eventName.split(',').forEach(function (eStr) {
				handles.push(on(node, eStr.trim(), filter, handler));
			});
			return makeMultiHandle(handles);
		}

		node = getNode(node);

		if (filter && handler) {
			if (typeof filter === 'string') {
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
		} else if (!callback) {
			callback = filter || handler;
		}

		if (eventName === 'clickoff') {
			// custom - used for popups 'n stuff
			return onClickoff(node, callback);
		}

		if (eventName === 'load' && node.localName === 'img') {
			return onImageLoad(node, callback);
		}

		if (eventName === 'wheel') {
			// mousewheel events, natch
			if (hasWheel) {
				// pass through, but first curry callback to wheel events
				callback = normalizeWheelEvent(callback);
			} else {
				// old Firefox, old IE, Chrome
				return makeMultiHandle([
					on(node, 'DOMMouseScroll', normalizeWheelEvent(callback)),
					on(node, 'mousewheel', normalizeWheelEvent(callback))
				]);
			}
		}

		if (/key/.test(eventName)) {
			callback = normalizeKeyEvent(callback);
		}

		node.addEventListener(eventName, callback, false);

		handle = {
			remove: function () {
				node.removeEventListener(eventName, callback, false);
				node = callback = null;
				this.remove = this.pause = this.resume = function () {};
			},
			pause: function () {
				node.removeEventListener(eventName, callback, false);
			},
			resume: function () {
				node.addEventListener(eventName, callback, false);
			}
		};

		return handle;
	}

	on.once = function (node, eventName, filter, callback) {
		var h;
		if (filter && callback) {
			h = on(node, eventName, filter, function () {
				callback.apply(window, arguments);
				h.remove();
			});
		} else {
			h = on(node, eventName, function () {
				filter.apply(window, arguments);
				h.remove();
			});
		}
		return h;
	};

	INVALID_PROPS = {
		isTrusted: 1
	};
	function mix (object, value) {
		if (!value) {
			return object;
		}
		if (typeof value === 'object') {
			Object.keys(value).forEach(function (key) {
				if (!INVALID_PROPS[key]) {
					object[key] = value[key];
				}
			});
		} else {
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
		event.initCustomEvent(eventName, !!bubbles, true, eventDetail); // event type, bubbling, cancelable, value
		return node.dispatchEvent(event);
	};

	on.isAlphaNumeric = function (str) {
		if (str.length > 1) {
			return false;
		}
		if (str === ' ') {
			return false;
		}
		if (!isNaN(Number(str))) {
			return true;
		}
		var code = str.toLowerCase().charCodeAt(0);
		return code >= 97 && code <= 122;
	};

	on.makeMultiHandle = makeMultiHandle;
	on.closest = closest;
	on.matches = matches;

	return on;

}));

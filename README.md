# on

A library for making it easy to manage DOM Node events.

## Getting Started

To install using bower:

	bower install clubajax/on --save

You may also use `npm` if you prefer. You can also clone the repository with your generic clone commands as a standalone 
repository or submodule.
	  
	git clone git://github.com/clubajax/on.git
                                      
It is recommended that you set the config.path of RequireJS to make `on` accessible as an absolute
path. If using as a global or with Browserify, it is suggested that you use an *NPM run script* to
copy the `on` script to a location more convenient for your project.

`on` has no dependencies.

## Description

`on` is a simple library for handling DOM node events. It has been under development and used in
production for years. The code is very well established, tested, and used in enterprise production apps.

The primary feature is it returns a handle, from which you can pause, resume, and remove the event.
Handles are much easier to manipulate than using `removeEventListener` or jQuery's `off`, which
sometimes necessitates recreating sometimes complex or recursive function signatures.

Think of handles as something like a returned Promise - an object with methods, with which you can
control the event handler.

	 var handle = on(node, 'click', function(event){
		console.log('click event:', event);
	 });
	 handle.pause(); // click event will not fire
	 handle.resume(); // click event fires again
	 handle.remove(); // click event is permanently removed

Events can be handled with any object from which you can attach events.

	on(window, 'resize', onResize);
	on(image, 'load', onImageLoaded);
	on(input, 'keydown', onKey);

`on.remove` is a very common feature, use for cleaning up events when destroying a widget.
`on.pause` is less common - used for turning functionality on and off, like for popups.

## Browser Support

`on` supports all modern browsers IE9 and above. IE8 is not supported, `attachEvent` is not used.

This library uses UMD, meaning it can be consumed with RequireJS, Browserify (CommonJS),
or a standard browser global.

Node.js is not supported since this is a DOM-based library.

## Features

Wheel Events are normalized to a standard:
	
	delta, wheelY, wheelX
	
It also adds acceleration and deceleration to make Mac and Windows scroll wheels behave similarly.

KeyEvents are standard, using the [`key` property](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key), 
which adds the actual letter or number pressed to the event, not just the key code.

The key property is cross browser, thanks to a polyfill by [chris van wiemeersch](https://github.com/cvan/keyboardevent-key-polyfill)
which is included for convenience.

There is also a custom `clickoff` event, to detect if you've clicked anywhere in the document
other than the passed node. Useful for menus and modals.

	 var handle = on(node, 'clickoff', callback);
	 //  callback fires if something other than node is clicked

 There is support for multiple event types at once. The following example is useful for handling
 both desktop mouseovers and tablet clicks:

	 var handle = on(node, 'mouseover,click', onStart);

`on` supports filtered selectors, as an additional parameter:

	 on(node, 'click', '.tab', callback);
	 on(node, 'click', 'div', callback);
	 on(node, 'click', '#main', callback);
	 on(node, 'click', 'div["data-foo"=bar]', callback);

So as not to override the event, the targeted element will be in the event as `filteredTarget` as well as
the second argument in the callback.

## Additional Features

`on.emit`: a convenience function to generate events on nodes:

    on.emit(node, 'click', {value: 'hello'});
    
on does not need to have a node passed to it - you can pass an element ID or CSS selector:

    on('mynode', 'click', callback);
    on('#mynode', 'click', callback);
    on('.myUniqueClass', 'click', callback);

`on.makeMultiHandle`: accepts an array and returns a single handle to operate on all at once:

    var handle = on.makeMultiHandle([
        on(node, 'mousedown', callback1),
        on(node, 'mouseup', callback2)
    ]);
    handle.pause();

`on.once`: Will remove itself after one event has fired:

    on.once(node, 'click', function(){
        console.log('fires only once');
    });
    on.emit(node, 'click');
    on.emit(node, 'click');

## License

This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>
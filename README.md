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

`on` has a dependency on the very well-done [keyboardevent-key-polyfill](https://github.com/cvan/keyboardevent-key-polyfill),
which provides a [`KeyboardEvent.key` property](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) in the event.

## Description

`on` is a library for handling DOM node events in a simple way. It has been under development and used in
production for years. The code is very well established, tested, and used in enterprise apps.

The primary feature is it returns a handle, from which you can pause, resume, and remove the event.
Handles are much easier to manipulate than using `removeEventListener` or jQuery's `off`, which
sometimes necessitates recreating sometimes complex or recursive function signatures.

Think of handles as something like a returned Promise - an object with methods, with which you can
control the event handler.
```jsx harmony
 var handle = on(node, 'click', function(event){
    console.log('click event:', event);
 });
 handle.pause(); // click event will not fire
 handle.resume(); // click event fires again
 handle.remove(); // click event is permanently removed
```
Events can be handled with any object from which you can attach events.
```jsx harmony
on(window, 'resize', onResize);
on(image, 'load', onImageLoaded);
on(input, 'keydown', onKey);
```
`on.remove` is a very common feature, use for cleaning up events when destroying a widget.  
`on.pause` is less common - used for turning functionality on and off, like for popups or mouse tracking.

## Browser Support

`on` supports all modern browsers including IE11. It probably works with IE9-10 but it is not tested.
IE8 is not supported, `attachEvent` is not used.

This library uses UMD, meaning it can be consumed with RequireJS, Browserify (CommonJS),
or a standard browser global.

Node.js is not supported since this is a DOM-based library.

## Features

### The KeyboardEvent Key property
The [KeyboardEvent key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) property standardizes modern browsers 
(Chrome 51+) and IE9-11 (which uses the key property, but from the old spec), 
which adds the actual letter or number pressed to the event, not just the key code.

Because the creator of this library uses a Mac, by opinion, the keys are normalized to a Mac. So 'Win' maps to 'Command'
and 'Alt' maps to 'Option'. All others should be intuitive.

### clickoff
There is a custom `clickoff` event, to detect if you've clicked anywhere in the document
other than the passed node. Useful for menus and modals.
```jsx harmony
 var handle = on(node, 'clickoff', callback);
 handle.resume();
 //  callback fires if something other than node is clicked
```
**NOTE** _a clickoff event starts paused due to potential side effects. You typically don't want the event
to be listened to and fired until some other event has been triggered, like the opening of a modal._

### Multiple Event Types
There is support for multiple event types at once. The following example is useful for handling
both desktop mouseovers and tablet clicks:
```jsx harmony
var handle = on(node, 'mouseover,click', onStart);
```
### Multiple Key Events
A special multi-event can be used to listen for certain key strokes:
```jsx harmony
on(input, 'keyup:Enter,Escape, ,Backspace', handler);
on(input, 'keydown:a,b,c,d,A,B,C,D', handler);
````

### Filters
`on` supports filtered selectors, as an additional parameter:
```jsx harmony
on(node, 'click', '.tab', callback);
on(node, 'click', 'div', callback);
on(node, 'click', '#main', callback);
on(node, 'click', 'div["data-foo"=bar]', callback);

function callback (e, filtered) {
	console.log('target:', e.filteredTarget)
}
````

So as not to override the event, the targeted element will be in the event as `filteredTarget` as well as
the second argument in the callback.

Typically, this technique is used on a node with child elements. The `filteredTarget` will always be the parent, and 
not the child. Under the hood it uses `on.closest`, described below.

### Wheel Events
Wheel events are normalized to a standard:
	
	delta, wheelY, wheelX
	
It also adds acceleration and deceleration to make Mac and Windows scroll wheels behave similarly.

## Additional Features

`on.emit`: a convenience function to generate events on nodes:
```jsx harmony
on.emit(node, 'click', {value: 'hello'});
```
`on.fire`: generates [Custom Events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent):
```jsx harmony
on.fire(node, 'toggle-panel', {value: 'open'});

```
    
on does not need to have a node passed to it - you can pass an element ID:
```jsx harmony
on('mynode', 'click', callback);
```
on.makeMultiHandle`: accepts an array and returns a single handle to operate on all at once:
```jsx harmony
var handle = on.makeMultiHandle([
    on(node, 'mousedown', callback1),
    on(node, 'mouseup', callback2)
]);
handle.pause();
```

`on.once`: Will remove itself after one event has fired:
```jsx harmony
on.once(node, 'click', function(){
    console.log('fires only once');
});
on.emit(node, 'click');
on.emit(node, 'click');
```

`on.closest` is a polyfilled version of [the spec](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest),
 which finds an ascendant element which matches a selector:
```jsx harmony
var correctAscendant =  on.closest(node, '.foo');
```

## License

This uses the [MIT license](./LICENSE). Feel free to use, and redistribute at will.
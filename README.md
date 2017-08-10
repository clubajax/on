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

## Description

`on` is a library for handling DOM node events in a simple way. It has been under development and used in
production for years. The code is very well established, tested, and used in enterprise apps.

The primary feature is it returns a handle, from which you can pause, resume, and remove the event handler.
Handles are much easier to manipulate than using `removeEventListener` or jQuery's `off`, which
sometimes necessitates recreating sometimes complex, bound, or recursive function signatures.

`on()` makes handling events easy, and supports directly several important techniques, like automatic binding
of the same event handler to several events, event delegation, event filtering, and even creating synthetic
events, like `"clickoff"` (user clicked outside of our element, e.g., a modal dialog), gestures, and so on.

Supported signatures:

* `handle = on(node, eventName, handler)`
* `handle = on(node, eventName, filter, handler)`

Following arguments are expected:

* `node` &mdash; a DOM node to attach an event listener to, or its id (as a string).
* `eventName` &mdash; an event name as a string, or a function, with following signature:
  `handle = eventProcessor(domNode, callback)`, where:
  * `domNode` &mdash; a DOM node.
  * `callback` &mdash; an event handler function, which is usually a combination of `filter` and `handler`.
* `filter` &mdash; an optional filter parameter, which can be:
  * simple selector suitable for
  [matches()](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches)
  * function, which an event objects as single parameter, and returns a DOM node, which fits its criteria
  (usually in a parent chain), or `null`, if its criteria was not satisfied.
    * If a match was found it will be added to an event object as `filteredTarget`,
      and additionally passed to an event handler as the second parameter.
* `handler` &mdash; an event handler function, which takes an event object as its first parameter,
  and an optional filtered DOM node as its second parameter.
* `handle` &mdash; a returned object, which allows to control an event flow.

Think of handles as something like a returned Promise - an object with methods, with which you can
control the event handler.

```js
 var handle = on(node, 'click', function(event){
    console.log('click event:', event);
 });
 handle.pause(); // click event will not fire
 handle.resume(); // click event fires again
 handle.remove(); // click event is permanently removed
```

Events can be handled with any object from which you can attach events.

```js
on(window, 'resize', onResize);
on(image, 'load', onImageLoaded);
on(input, 'keydown', onKey);
```

`on.remove` is a very common feature, used for cleaning up events when destroying a widget.
`on.pause` is less common &mdash; used for turning functionality on and off, like for popups or mouse tracking.

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

### Wheel Events

Wheel events are normalized to a standard: `delta`, `wheelY`, `wheelX`.

It also adds acceleration and deceleration to make Mac and Windows scroll wheels behave similarly.

### Filters

`on` supports filtered selectors, as an additional parameter:

```js
on(node, 'click', '.tab', callback);
on(node, 'click', 'div', callback);
on(node, 'click', '#main', callback);
on(node, 'click', 'div["data-foo"=bar]', callback);

function callback (e, filtered) {
	console.log('target:', e.filteredTarget)
}
```

So as not to override the event, the targeted element will be in the event as `filteredTarget` as well as
the second argument in the callback.

Typically, this technique is used on a node with child elements. The `filteredTarget` will always be the parent, and
not the child. Under the hood it uses `on.closest`, described below.

### Multiple Event Types

There is support for multiple event types at once. The following example is useful for handling
both desktop mouseovers and tablet clicks:

```js
var handle = on(node, 'mouseover,click', onStart);
```

### Composite events

Instead of an event name (a string), it is possible to specify a function. All other `on()` arguments
will be normalized, and this function will be called with a DOM node and a callback function
(a possible composite of a filter function described below, and an event handler).

Such composite event functions can be used directly with `on()`, or registered with it using a name.
All you have to do is to add it to a dictionary `on.events`:

```js
function buttonEvent (node, callback) {
  return on.makeMultiHandle([
    on(node, 'click', callback),
    on(node, 'keyup:Enter', callback)
  ]);
}

on.events.button = buttonEvent;

// now we can:

var handle = on(node, 'button', handler);
```

Named synthetic events can be used in multiple event types described above.

The library comes with two synthetic events pre-populated: `"button"`, and `"clickoff"`.

### `clickoff`

There is a custom `clickoff` event, to detect if you've clicked anywhere in the document
other than the passed node. Useful for menus and modals.

```js
 var handle = on(node, 'clickoff', callback);
 handle.resume();
 //  callback fires if something other than node
 // or its children are clicked
```
**NOTE**: _a clickoff event starts paused due to potential side effects. You typically don't want the event
to be listened to and fired until some other event has been triggered, like the opening of a modal._

### Multiple Key Events

A special multi-event can be used to listen for certain key strokes:

```js
on(input, 'keyup:Enter,Escape, ,Backspace', handler);
on(input, 'keydown:a,b,c,d,A,B,C,D', handler);
```

**NOTE**: _multiple key events incompatible with multiple event types described above. Do not use them together._

## Additional Features

`on.emit`: a convenience function to generate events on nodes:

```js
on.emit(node, 'click', {value: 'hello'});
```

`on.fire`: generates [Custom Events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent):

```js
on.fire(node, 'toggle-panel', {value: 'open'});
```

`on()` does not need to have a node passed to it - you can pass an element ID:

```js
on('mynode', 'click', callback);
```

`on.makeMultiHandle`: accepts an array and returns a single handle to operate on all at once:

```js
var handle = on.makeMultiHandle([
    on(node, 'mousedown', callback1),
    on(node, 'mouseup', callback2)
]);
handle.pause();
```

`on.once`: will remove itself after one event has fired:

```js
on.once(node, 'click', function(){
    console.log('fires only once');
});
on.emit(node, 'click'); // fires only once
on.emit(node, 'click'); //
```

It still returns a handle.

`on.closest` is a polyfilled version of [the spec](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest),
 which finds an ascendant element which matches a selector:

```js
var correctAscendant =  on.closest(node, '.foo');
```

`on.matches` is an actual name of [matches()](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches)
function found dynamically in the browser. You can use it for your own needs:

```js
if (node[on.matches]('.header')) {
  // ...
}
```

`on.onDomEvent(node, eventName, callback)` is a simple `on()`-like function,
which unconditionally and without any preprocessing sets an
event handler on a node, and returns a handle. Its parameters:

* `node` &mdash; a valid DOM node.
* `eventName` &mdash; an event name as a string. No synthetic events are allowed.
* `callback` &mdash; a standard event handling function.

This function helps to write synthetic events. It is used to avoid possible loops, and ensures
that standard DOM events can be handled directly.

## License

This uses the [MIT license](./LICENSE). Feel free to use, and redistribute at will.

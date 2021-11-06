# LibJS
A collection of JavaScript libraries. See [this set of demos](https://github.com/personalizedrefrigerator/project) for an example of its capabilities (demo uses an old version of the library set).

# Conversion into a single-file script.
```bash
$ git clone https://github.com/personalizedrefrigerator/LibJS.git
$ cd LibJS
$ python3 Libs/unify.py Libs > LibJS.js
```

**You will probably want to edit `LibJS.js`**. Its contents will be wrapped in a `(function() {` `})();` unless otherwise modified. 

# Example Edits
An example of such an edit might export `SubWindowHelper`:

```js
   ...
    }
};

window.SubWindowHelper = SubWindowHelper;
})();

```

If willing to export everything, remove the `(function() {` ... `})();` wrapping the library. This is done in the included `FullLibJS.js` file.

# Notes
 * This project **does not** have a suite of unit tests! There are probably many, many bugs.
 * This project does not use [ES6 modules](https://hacks.mozilla.org/2015/08/es6-in-depth-modules/)! As such, while including the single-file version of the libaray is not ideal, it is probably easiest! '
 
# Licensing
 * Licensed to you under the BSD-3-Clause License (see [`LICENSE`](LICENSE)) or, at your option, the MIT License (see [`LICENSE_ALTERNATIVE`](LICENSE_ALTERNATIVE)).

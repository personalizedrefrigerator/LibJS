# LibJS
A collection of JavaScript libraries, I have found myself passing between pages.

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

If willing to export everything, remove the `(function() {` ... `})();` wrapping the library.

# Notes
 * Pull requests are welcome!
 * This project **does not** have a suite of unit tests! There are probably many, many bugs.
 * This project does not use [ES6 modules](https://hacks.mozilla.org/2015/08/es6-in-depth-modules/)! As such, while including the single-file version of the libaray is not ideal, it is probably easiest! 

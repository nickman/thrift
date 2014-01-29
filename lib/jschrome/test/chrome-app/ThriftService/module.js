(function () {
"use strict";

var autorequire;
var moduledir;
var scripts = document.getElementsByTagName('script');
for (var i = 0, l = scripts.length; i < l; i++) {
  if (scripts[i].src.match(/module\.js$/)) {
    autorequire = scripts[i].getAttribute('autorequire');
    moduledir = scripts[i].getAttribute('moduledir');
    break;
  }
}

var require = window.require = makeRequire("/");
require.resolve = resolve;
function makeRequire(root) {
function require(path) {
  return realRequire(root, path);
}
function requireAsync(path, callback) {
  realRequireAsync(root, path, function (module) {
    callback(null, module);
  }, callback);
}
require.async = requireAsync;
return require;
}


////////////////////////////////////////////////////////////////////////////////
// Get source files via XHR.
// Protect calls to get to cache and not allow concurrent requests.
// This I/O can be very expensive.
var aliases = {};
var files = {};
var missing = {};
var pendingGet = {};
function get(path, callback, errback) {
  if (path in aliases) path = aliases[path];
  if (path in files) return callback(path, files[path]);
  if (path in missing) return errback(missing[path]);
  if (path in pendingGet) return pendingGet[path].push([callback, errback]);
  pendingGet[path] = [[callback, errback]];
  realGet(path, function (contents) {
    files[path] = contents;
    flush();
  }, function (err) {
    missing[path] = err;
    flush();
  });
  function flush() {
    var pending = pendingGet[path];
    delete pendingGet[path];
    pending.forEach(function (pair) {
      get(path, pair[0], pair[1]);
    });
  }
}
function realGet(path, callback, errback) {
  var request = new XMLHttpRequest();
  request.onload = function () {
    callback(this.responseText);
  };
  request.onerror = function () {
    errback(this);
  };
  request.open("GET", path + "?" + (Math.random() * 0x100000000).toString(36), true);
  request.send();
}
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
// Use a temporary filesystem to write the wrapped js files.
// The writeFile function outputs the url the file that a script tag can use.
var fs;
var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
requestFileSystem(window.TEMPORARY, null, function (fileSystem) {
  fs = fileSystem;
  var scripts = document.getElementsByTagName('script');
  for (var i = 0, l = scripts.length; i < l; i++) {
    if (autorequire) {
      window.require.async(autorequire, onLoad);
    }
  }
}, function (fileError) {
  throw new Error("Unable to create temporary fs for module loader: " + fileError);
});
function onLoad(err) { if (err) throw err; }
function writeFile(path, contents, callback, errback) {
  fs.root.getFile(path, {create: true}, function (fileEntry) {
    fileEntry.createWriter(function (fileWriter) {
      var truncated = false;
      fileWriter.onwriteend = function () {
        if (!truncated) {
          truncated = true;
          this.truncate(this.position);
          return;
        }
        callback(fileEntry.toURL());
      };
      fileWriter.onerror = errback;
      fileWriter.write(new Blob([contents], {type: 'text/plain'}));
    }, errback);
  }, errback);
}
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
// Resolve relative paths to absolute paths.
// Also implements module lookup logic and automatic file extensions.
// Root is always an absolute path starting and ending with a `/`
// path is the actual string used in require.
// If path starts with a `/`, then it's an absolute require.
// If paths starts with a `.`, then it's a relative require.
// Otherwise it's a module path and we must search for it.
// We also want to support optional extensions, loading json files, and
// parsing package.json looking for browser-main or main.
// callback(realPath, contents) or errback(err) are the output.
var mappings = {};
require.mappings = mappings;
require.resolve = resolve;
function resolve(root, path, callback, errback) {
  function success(fullPath, contents) {
    mappings[root + ":" + path] = fullPath;
    callback(fullPath, contents);
  }
  if (path[0] === "/") return find(path, success, errback);
  if (path[0] === ".") return find(realPath(root + path), success, errback);
  if (moduledir) {
    return find(moduledir + path, success, errback);
  }

  var base = root;
  cycle();
  function cycle() {
    base = base.match(/^(.*\/)[^\/]*$/)[1];
    find(base + "node_modules/" + path, success, function () {
      if (base.length > 1) {
        base = base.substr(0, base.length - 1);
        cycle();
      }
      else {
        errback(new Error("Can't find module: " + path + " in " + root));
      }
    });
  }
}
function realPath(path) {
  var match;
  // Remove /./ entries from path
  while (match = path.match(/(\/)\.\//)) {
    path = path.replace(match[0], match[1]);
  }
  // Convert /foo/../ entries from path
  while (match = path.match(/\/[^\/]+\/\.\.\//)) {
    path = path.replace(match[0], "/");
  }
  return path;
}
function find(path, callback, errback) {
  // .js extensions are passed through as-is
  if (/\.js$/.test(path)) return get(path, callback, errback);
  // First look for /index.js
  // Then try looking for /package.json
  // Then try appending the .js extension
  get(path + "/package.json", function (jsonPath, json) {
    // Parse the JSON file
    var doc;
    try { doc = JSON.parse(json); }
    catch (err) { return errback(err); }
    // Abort if main is missing
    if (doc.browser) {
      Object.keys(doc.browser).forEach(function (from) {
        var to = realPath(path + "/" + doc.browser[from]);
        from = realPath(path + "/" + from);
        aliases[from] = to;
      });
    }
    var main = doc.main;
    if (!main) {
      return errback(new Error("Missing main field in " + jsonPath));
    }
    find(realPath(path + "/" + main), callback, errback);
  }, function () {
    get(path + "/index.js", callback, function () {
      get(path + ".js", callback, function () {
        errback(new Error("Unable to find module: " + path));
      });
    });
  });
}
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
// Load loads a module and all it's dependencies, wraps them in AMD and inserts
// them as script tags.
function load(root, path, callback, errback) {
  resolve(root, path, function (realPath, contents) {
    process(realPath, contents, callback, errback);
  }, errback);
}
var defs = {};
require.defs = defs;
var defCallbacks = {};
window.define = define;
function define(path, fn) {
  var def = { path: path, fn: fn };
  defs[path] = def;
  var callback = defCallbacks[path];
  delete defCallbacks[path];
  callback(def);
}
var processPending = {};
function process(path, contents, callback, errback) {
  if (path in defs) return callback(defs[path]);
  if (path in processPending) {
    return processPending[path].push([callback, errback]);
  }
  processPending[path] = [[callback, errback]];
  realProcess(path, contents, function (def) {
    defs[path] = def;
    flush(null, def);
  }, flush);
  function flush(err, def) {
    var pending = processPending[path];
    delete processPending[path];
    pending.forEach(function (pair) {
      if (err) pair[1](err);
      else pair[0](def);
    });
  }
}
function realProcess(path, contents, callback, errback) {
  var failed;
  function fail(err) {
    if (failed) return;
    failed = true;
    errback(err);
  }
  // Scan for dependencies
  var root = path.match(/^(.*\/)[^\/]*$/)[1];
  var matches = mine(contents);
  if (!matches.length) return save();
  // If there are dependencies, load them first.
  var left = matches.length;
  for (var i = 0, l = left; i < l; i++) {
    var match = matches[i];
    resolve(root, match, onResolve, checkFail);
  }
  function onResolve(realPath, contents) {
    process(realPath, contents, check, fail);
  }
  function checkFail(err) {
    console.error(err.toString());
    if (--left) return;
    save();
  }
  function check() {
    if (--left) return;
    save();
  }

  function save() {
    // Wrap and save the file
    var wrappedjs = 'window.define(' + JSON.stringify(path) +
      ', function (module, exports, require, __dirname, __filename) { ' + contents + '});';
    writeFile(path.substr(1).replace(/\//g, "_"), wrappedjs, function (url) {
      defCallbacks[path] = function () {
        console.log("Loaded module", path);
        return callback.apply(this, arguments);
      };
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      document.head.appendChild(script);
    }, errback);
  }
}




// Mine a string for require calls and export the module names
// Extract all require calls using a proper state-machine parser.
function mine(js) {
  var names = [];
  var state = 0;
  var ident;
  var quote;
  var name;

  var isIdent = /[a-z0-9_.]/i;
  var isWhitespace = /[ \r\n\t]/;

  function $start(char) {
    if (char === "/") {
      return $slash;
    }
    if (char === "'" || char === '"') {
      quote = char;
      return $string;
    }
    if (isIdent.test(char)) {
      ident = char;
      return $ident;
    }
    return $start;
  }

  function $ident(char) {
    if (isIdent.test(char)) {
      ident += char;
      return $ident;
    }
    if (char === "(" && ident === "require") {
      ident = undefined;
      return $call;
    }
    return $start(char);
  }

  function $call(char) {
    if (isWhitespace.test(char)) return $call;
    if (char === "'" || char === '"') {
      quote = char;
      name = "";
      return $name;
    }
    return $start(char);
  }

  function $name(char) {
    if (char === quote) {
      return $close;
    }
    name += char;
    return $name;
  }

  function $close(char) {
    if (isWhitespace.test(char)) return $close;
    if (char === ")" || char === ',') {
      names.push(name);
    }
    name = undefined;
    return $start(char);
  }

  function $string(char) {
    if (char === "\\") {
      return $escape;
    }
    if (char === quote) {
      return $start;
    }
    return $string;
  }

  function $escape(char) {
    return $string;
  }

  function $slash(char) {
    if (char === "/") return $lineComment;
    if (char === "*") return $multilineComment;
    return $start(char);
  }

  function $lineComment(char) {
    if (char === "\r" || char === "\n") return $start;
    return $lineComment;
  }

  function $multilineComment(char) {
    if (char === "*") return $multilineEnding;
    return $multilineComment;
  }

  function $multilineEnding(char) {
    if (char === "/") return $start;
    if (char === "*") return $multilingEnding;
    return $multilineComment;
  }

  var state = $start;
  for (var i = 0, l = js.length; i < l; i++) {
    state = state(js[i]);
  }
  return names;
}
////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
var modules = {};
require.modules = modules;
function realRequire(root, path) {
  var realPath = mappings[root + ":" + path];
  if (!realPath) throw new Error("Can't require sync yet: " + path + " in " + root);
  var module = modules[realPath];
  if (module) return module;
  var def = defs[realPath];
  if (!def) throw new Error("Missing definition for: " + realPath);
  return start(def);
}
function realRequireAsync(root, path, callback, errback) {
  load(root, path, function (def) {
    var module;
    try {
      module = start(def);
    }
    catch (err) {
      return errback(err);
    }
    callback(module);
  }, errback);
}

function start(def) {
  var pathname = def.path;
  var exports = modules[pathname];
  if (exports) return exports;
  var dirname = pathname.match(/^(.*\/)[^\/]*$/)[1];
  var require = makeRequire(dirname);
  exports = {};
  var module = {exports: exports};
  delete defs[pathname];
  modules[pathname] = exports;
  def.fn(module, exports, require, dirname, pathname);
  modules[pathname] = module.exports;
  return module.exports;
}

}());
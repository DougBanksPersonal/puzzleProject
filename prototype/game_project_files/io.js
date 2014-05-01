(function() {

/**
 * @fileoverview A library filled with useful functions for I/O.
 * @author Adam Stepinski
 */

// Namespace for the library.
window.common = window.common || {};
window.common.io = window.common.io || {};

var devLogger = common.util.devLogger;

/**
 * @class A class that provides read-only access to a URL.
 * @param {String|undefined} opt_root An optional parameter specifying
 *     the root from which all URLs will be accessed.
 * @constructor
 */
common.io.FileReader = function(opt_root) {
  this.root = opt_root || '';
};

/**
 * @param {String} file The path to the file.
 * @return The URI to access the file.
 * @private
 */
common.io.FileReader.prototype.getURI = function(file) {
  return this.root + '/' + file;
};

/**
 * @param {String} file The path to the file to read.
 * @param {Function} handler The function to call when the file content is
 *    ready. The handler is passed the content of the file as an argument.
 * @param {Boolean|String} opt_dataType An optional datatype. The content
 *    of the file will be coerced into the given file type before being
 *    passed to the handler.
 * @param {undefined|Function} opt_errorHandler Function called if there's
 *    an error handling the file.
 */
common.io.FileReader.prototype.read = function(
    file, handler, opt_dataType, opt_errorHandler) {
  var spec = {
    url: this.getURI(file),
    success: handler
  };

  var modifiedErrorHandler = function() {
    devLogger.log('FileReader.read failed to load ' + spec.url);
    if (opt_errorHandler) {
      opt_errorHandler();
    }
  };
  spec.error = modifiedErrorHandler;

  if (opt_dataType) {
    spec.dataType = opt_dataType;
    devLogger.log('read spec.dataType = ' + spec.dataType);
  }

  devLogger.log('read spec.url = ' + spec.url);

  $.ajax(spec);
};


/**
 * @class A class that provides cached read-only access to a URL.
 *    Files are cached in memory, with no maximum cache size.
 * @param {String|undefined} opt_root An optional parameter specifying
 *     the root from which all URLs will be accessed.
 * @constructor
 */
common.io.CachedFileReader = function(opt_root) {
  common.io.FileReader.call(this, opt_root);
  this.cache = {};
};
common.util.inherits(common.io.CachedFileReader, common.io.FileReader);

/**
 * @param {String} file The path to the file to read.
 * @param {Function} handler The function to call when the file content is
 *    ready. The handler is passed the content of the file as an argument.
 * @param {Boolean|String} opt_dataType An optional datatype. The content
 *    of the file will be coerced into the given file type before being
 *    passed to the handler.
 */
common.io.CachedFileReader.prototype.read = function(
    file, handler, opt_dataType) {
  var that = this;
  var hash = file;
  if (opt_dataType) {
    hash = hash + '/' + opt_dataType;
  }
  if (this.cache[hash]) {
    handler(this.cache[hash]);
  } else {
    this.parent.read.call(this, file, function(data) {
      that.cache[hash] = data;
      handler(data);
    }, opt_dataType);
  }
};


/**
 * @class A MockFileReader returns data from the given in-memory object.
 * @param {Object} data An object mapping urls to data.
 *
 * @constructor
 */
common.io.MockFileReader = function(data) {
  this.data = data;
};

/**
 * Reads data from the given data object. data type is ignored.
 */
common.io.MockFileReader.prototype.read = function(file, handler, opt_dataType) {
  var that = this;
  window.setTimeout(function() {
    var data = that.data[file] || null;
    handler(data);
  }, 0);
};


/**
 * @class A PriorityFileReader will try reading from the first file reader.
 * If it fails, it tries the second provided file reader.
 */
common.io.PriorityFileReader = function(firstFileReader, secondFileReader) {
  this.firstFileReader = firstFileReader;
  this.secondFileReader = secondFileReader;
};

common.io.PriorityFileReader.prototype.read = function(file, handler, opt_dataType) {
  var that = this;
  this.firstFileReader.read(file, function(firstData) {
    if (firstData) {
      handler(firstData);
    } else {
      that.secondFileReader.read(file, function(secondData) {
        handler(secondData);
      }, opt_dataType);
    }
  }, opt_dataType);
};


/**
 * @class A class that provides read/write access to a key/value store.
 * @param {String} namespace Namespace prepended before keys.
 * @param {Object|undefined} opt_storageObject An optional storage object.
 *   If not specified, HTML5 localStorage is used. However, any object with
 *   getItem, setItem, removeItem, and clear methods can be used.
 * @constructor
 */
common.io.KeyValueStore = function(namespace, opt_storageObject) {
  this.namespace = namespace + '/';
  this.store = opt_storageObject || window.localStorage;
};

/**
 * Stores the given string for the given key.
 * @param {String} key The key at which to store the value.
 * @param {String} string The string to store for the key.
 */
common.io.KeyValueStore.prototype.setString = function(key, string) {
  // NOTE(adam): We must remove the item before setting it to avoid
  // a Webkit bug that otherwise causes a "QUOTA_EXCEEDED" exception
  // to be thrown.
  var key = this.namespace + key;
  this.store.removeItem(key);
  this.store.setItem(key, string);
};

/**
 * Return the string for the given key.
 * @param {String} key The key to look up.
 * @return The string value for the key, or undefined if no
 *    value is stored at the key.
 */
common.io.KeyValueStore.prototype.getString = function(key) {
  var key = this.namespace + key;
  var item = this.store.getItem(key);
  return item;
};

common.io.KeyValueStore.prototype.removeKey = function(key) {
  var key = this.namespace + key;
  this.store.removeItem(key);
};

/**
 * Stores the given JSON object for the given key.
 * @param {String} key The key at which to store the value.
 * @param {Object} json The JSON to store for the key.
 */
common.io.KeyValueStore.prototype.setJson = function(key, json) {
  this.setString(key, JSON.stringify(json));
};

/**
 * Return the JSON object for the given key.
 * @param {String} key The key to look up.
 * @param {String|undefined} opt_default The default value to return,
 *    if the key is not found.
 * @return The Object for the key, or opt_default if no
 *    value is stored at the key. If opt_default is not provided,
 *    null is returned instead.
 */
common.io.KeyValueStore.prototype.getJson = function(key, opt_default) {
  var json_string = this.getString(key);
  if (json_string) {
    var parsedJson = JSON.parse(json_string);
    return parsedJson;
  } else {
    return opt_default? opt_default : null;
  }
};

/**
 * Stores the given integer for the given key.
 * @param {String} key The key at which to store the value.
 * @param {Number} integer The number to store for the key.
 */
common.io.KeyValueStore.prototype.setInteger = function(key, integer) {
  this.setString(key, '' + integer);
};

/**
 * Return the integer for the given key.
 * @param {String} key The key to look up.
 * @return The integer value for the key, or 0 if no value is stored at
 *    the key.
 */
common.io.KeyValueStore.prototype.getInteger = function(key) {
  var integer = parseInt(this.getString(key), 10);
  return integer || 0;
};

/**
 * Removes all keys from the namespaced store.
 * NOTE(adam): This might not work if the storage object
 * is not localStorage.
 */
common.io.KeyValueStore.prototype.reset = function() {
  var regExp = new RegExp('^' + this.namespace);
  for (var i = 0, len = this.store.length; i < len; i++) {
    var key = this.store.key(i);
    if (key && key.match(regExp)) {
      this.store.removeItem(key);
    }
  }
};


/**
 * An in-memory Mock localStorage object. Can be used with KeyValueStore.
 * @param {Object|null} opt_data Optional pre-populated storage source. If
 *   provided, this will get modified by storage operations.
 */
common.io.InMemoryStorage = function(opt_data) {
  this.storage = opt_data || {};
};

common.io.InMemoryStorage.prototype.getItem = function(key) {
  return this.storage[key];
};

common.io.InMemoryStorage.prototype.setItem = function(key, value) {
  this.storage[key] = value;
};

common.io.InMemoryStorage.prototype.removeItem = function(key) {
  delete this.storage[key];
};

common.io.InMemoryStorage.prototype.clear = function() {
  this.storage = {};
};

})();

(function() {

/**
 * @fileoverview A library filled with useful utility functions & classes
 *     for structuring code and performing I/O.
 * @author Adam Stepinski
 */

window.common = window.common || {};
window.common.util = window.common.util || {};

/**
 * Text string of all punctuation characters, properly escaped so it
 * can be used in a regular expression.
 */
var JS_PUNCTUATION = "/\.,-\\/#!$%\\^&\\*;:{}=\\-_`~()\\'\\\"";

/**
 * Creates nested namespaces from the given path, with "window" as the parent.
 * The path uses dot notation to describe the namespaces. If a given namespace
 * is not already defined, it is set to an empty object {}
 * @param {String} path A string describing the nested namespaces, using dot
 *   notation. Example: 'wj.models.games'
 * @return The last namespace object described in the path. Useful for creating
 *   namespace shortcuts.
 *   Example: var wjmg = common.util.include('wj.models.games');
 */
common.util.include = function(path) {
  var currentNamespace = window;
  var parts = path.split('.');
  for (var i = 0; i < parts.length; ++i) {
    var part = parts[i];
    var namespace = currentNamespace[part] || {};
    currentNamespace[part] = namespace;
    currentNamespace = namespace;
  }
  return currentNamespace;
}

/**
 * Sets up prototypal inheritance between the child class and the parent class.
 * The property "parent" is added to the child to provide a direct reference to
 * the methods on the parent class. This is useful when the child class
 * overrides properties of the parent but still wishes to access
 * those properties.
 * @param {Function} childClass The constructor of the child class.
 * @param {Function} parentClass The constructor of the parent class.
 */
common.util.inherits = function(childClass, parentClass) {
  if (!parentClass || !parentClass.prototype || !childClass) {
    console.log('bad inherit:' + childClass);
  }
  function tempConstructor() {};
  tempConstructor.prototype = parentClass.prototype;
  childClass.prototype = new tempConstructor;
  childClass.prototype.constructor = childClass;
  childClass.prototype.parent = parentClass.prototype;
};


/**
 * Useful browser-dependent constants. Includes a browser-specific
 * CSS property prefix, the rendering engine, and various event names.
 * These constants should be used in the code to ensure cross-browser
 * compatibility.
 *
 * In cases where different browsers need different code, the condition can
 * be set based on the rendering engine constant.
 */
common.util.BROWSER = {
  init: function() {
    var userAgent = window.navigator.userAgent;
    if (userAgent.indexOf('WebKit') >= 0) {
      // Check for WebKit before Gecko, because WebKit browsers mention
      // Gecko as well.
      if (userAgent.indexOf('Chrome') >= 0) {
        // Chrome checked first, because Chrome UA strings also mention Safari.
        this.BROWSER = 'chrome';
      } else if (userAgent.indexOf('Safari') >= 0) {
        this.BROWSER = 'safari';
      }
      this.ENGINE = 'webkit';
      this.PREFIX = '-webkit-';
      this.TRANSITION_END = 'webkitTransitionEnd';
      this.ANIMATION_END = 'webkitAnimationEnd';
    } else if (userAgent.indexOf('Trident') >= 0) {
      this.browser = 'ie';
      this.ENGINE = 'gecko';
      this.PREFIX = '';
      this.TRANSITION_END = 'transitionend';
      this.ANIMATION_END = 'animationend';
      // IE doesn't support the 'preserve3d' transform style, making
      // nested transforms a real mess.
      this.NO_PRESERVE_3D = true;
      // FIXME(dbanks)
      // I can't get SM2 working on IE, after some amount of trying, debugging,
      // hunting on the web, etc.
      // If we get this working, remove the flag.
      this.NO_SOUNDMANAGER_2 = true;
    } else if (userAgent.indexOf('Gecko') >= 0) {
      // FireFox.
      this.browser = 'firefox';
      this.ENGINE = 'gecko';
      this.PREFIX = '-moz-';
      this.TRANSITION_END = 'transitionend';
      this.ANIMATION_END = 'animationend';
    } else {
      // Unknown browser.
      this.BROWSER = '';
      this.ENGINE = '';
      this.PREFIX = '';
      this.TRANSITION_END = 'transitionend';
      this.ANIMATION_END = 'animationend';
    }
  }
};
common.util.BROWSER.init();

/**
 * Executes the callback for each element in the array.
 */
common.util.forEach = function(array, callback) {
  for (var i = 0; i < array.length; ++i) {
    callback(array[i], i);
  }
};


/**
 * @param dictionary A dictionary object.
 * @return Number of items in a dictionary.
 */
common.util.getDictionarySize = function(dictionary) {
  var count = 0;
  for (var key in dictionary) {
    count++;
  }
  return count;
};

/**
 * @param dictionary A dictionary object.
 * @return Keys of dictionary as an array.
 */
common.util.getDictionaryKeys = function(dictionary) {
  return Object.keys(dictionary);
};

/**
 * @param dictionary A dictionary object.
 * @returns {Array} Values of dictionary as an array.
 */
common.util.getDictionaryValues = function(dictionary) {
  return Object.keys(dictionary).map(function(key){
    return dictionary[key];
  });
};

/**
 * Get a random number, but always the same number for the same seed.
 * @param seed
 * @returns {number}
 */
common.util.seededRandom = function(seed) {
  return (1.0 + Math.sin(seed))/2.0;
};

/**
 * Return the a copy of given array with elements randomly re-ordered.
 * @param {Array} array
 */
common.util.randomizeArray = function(array) {
  return common.util.randomSample(array, array.length);
};

/**
 * Randomized array of ints from 0 to n
 * @param {Integer} n
 */
common.util.randomizedOrder = function(n) {
  var array = common.util.createIntArray(n);
  return common.util.randomizeArray(array);
};


/**
 * Return a random sample of the given array
 */
common.util.randomSample = function(array, sampleSize) {
  var size = Math.min(sampleSize, array.length);

  // Make a copy so we don't step on original array.
  var arrayCopy = array.slice(0);
  var retval = [];

  for (var i = 0; i < size; i++) {
    var randomIndex = Math.floor(Math.random() * arrayCopy.length);
    retval.push(arrayCopy.splice(randomIndex, 1)[0]);
  }
  return retval;
};


/**
 * Return a random item from an array.
 */
common.util.randomArrayItem = function(array) {
  var items = common.util.randomSample(array, 1);
  return items[0];
};

/**
 * Return a random key from a dictionary.
 */
common.util.randomKey = function(obj) {
  var ret;
  var c = 0;
  for (var key in obj)
      if (Math.random() < 1/++c)
         ret = key;
  return ret;
};

/**
 * Get an item from an array.
 * Keep track of recent history, and don't repeat an item that was used recently.
 *
 * @param {Array} itemArray - items to choose from.
 * @param {Array} recentHistory - items that have been recently selected.  This
 *   will be updated to include the new item and discard old items, if history
 *   size gets too long.
 * @param {Nubmer} maxHistoryLength - max size of history.
 */
common.util.randomUnusedItem = function(itemArray, recentHistory, maxHistoryLength) {
  var randomizedArray = common.util.randomizeArray(itemArray);
  var i;
  for (i = 0; i < randomizedArray.length-1; i++) {
    if (!common.util.isInArray(randomizedArray[i], recentHistory)) {
      break;
    }
  }
  var newItem = randomizedArray[i];
  recentHistory.unshift(newItem);
  if (recentHistory.length > maxHistoryLength) {
    recentHistory.pop();
  }

  return newItem;
};

/**
 * Get a random number (not necessarily an int) in the given range.
 *
 * @param {Object} min - min possible value.
 * @param {Object} max - max possible value.
 */
common.util.randomInRange = function(min, max) {
  return min + (max - min) * Math.random();
};

/**
 * Get a random int between min and max, inclusive (so 0, 1 would return 0 or 1)
 *
 * @param {Object} min - min possible value.
 * @param {Object} max - max possible value.
 */
common.util.randomIntInRange = function(min, max) {
  return (Math.floor(Math.random() * (max - min + 1)) + min);
};

/**
 * Create an array of monotonically increasing integers.
 *
 * @param {Integer} max - upper bound on items in the array.  The last item
 *   in the array will be < max and >= max-step.
 * @param {Integer} opt_min - the first value in the array.  Defaults to 0.  If
 *   opt_min > max, return empty array.
 * @param {Integer} opt_step - size of step between array elements.  Defaults
 *   to 1.  If opt_step <= 0, returns empty array.
 */
common.util.createIntArray = function(max, opt_min, opt_step) {
  var min = opt_min || 0;
  var step = opt_step || 1;
  if (step < 1) {
    return [];
  }
  var retval = [];
  for (var i = min; i < max; i += step) {
    retval.push(i);
  }
  return retval;
};

/**
 * Removes the given element from the array, if present.
 * @param {Object} element
 * @param {Array} array
 * @return {Boolean} True if an element was removed.
 */
common.util.removeFromArray = function(element, array) {
  var index = array.indexOf(element);
  if (index >= 0) {
    array.splice(index, 1);
    return true;
  } else {
    return false;
  }
};


/**
 * Returns true if the given element is in the array.
 * Gracefully handles null array.
 */
common.util.isInArray = function(element, array) {
  if (!array) {
    return false;
  }
  return array.indexOf(element) >= 0;
};


/**
 * Copies properties from the given object to a new object. The copies
 * are shallow (references only).
 * @param {Object} object The object to clone from.
 * @param {Array<String>} properties Names of properties to clone.
 * @return Object containing the properties from the source object.
 */
common.util.cloneObjectProperties = function(object, properties) {
  var clone = {};
  _.each(properties, function(property) {
    if (object[property] !== undefined) {
      clone[property] = object[property];
    }
  });
  return clone;
};


/**
 * Dump all fields in the dictionary, recursive, with indent.
 */
common.util.recursiveDump = function(level, maxLevel, dict, opt_ignore) {
  if (level > maxLevel) {
    return;
  }

  var indent_string = "";
  for (var i = 0; i < level; i++) {
    indent_string += "  ";
  }

  if (typeof(dict) == 'object') {
    for (var key in dict) {
      if (opt_ignore && common.util.isInArray(key, opt_ignore)) {
        continue;
      }
      console.log(indent_string + key + " (" + typeof(dict[key]) + '):');
      common.util.recursiveDump(level + 1, maxLevel, dict[key], opt_ignore);
    }
  } else if (typeof(dict) == 'array') {
    console.log(indent_string + "(array)");
    for (var j = 0; j < dict.length; j++) {
      console.log(indent_string + j + ":");
      common.util.recursiveDump(level + 1, maxLevel, dict[j], opt_ignore);
    }
  } else if (typeof(dict) != 'function') {
    console.log(indent_string + dict);
  }
};


/**
 * @class A weighted population is a collection of element/weight pairs.
 * An element can be any object, a weight can be any number. The class provides
 * methods for sampling the collection. The relative weights are used as the
 * probability of sampling the associated element.
 * @constructor
 */
common.util.WeightedPopulation = function() {
  this.weightedElements = [];
  this.ranges = null;
  this.weightTotal = 0;
};

/**
 * Adds the given element to the collection, with the given weight.
 * @param {Object} element
 * @param {Number} weight The weight assigned to the element.
 */
common.util.WeightedPopulation.prototype.addElement = function(
    element, weight) {
  this.weightedElements.push([element, weight]);
  this.weightTotal += weight;
  // Wipe out ranges, need to be recalculated when sample() called.
  this.ranges = null;
};

/**
 * Calculates the range array used to sample the elements. A range array
 * assigns a unique, non-overalpping range of numbers from 0 to 1 for each
 * element in the population. The size of the range is proportional to the
 * weight of each element.
 * @param {Array|undefined} opt_weightedElement If undefined, the entire
 *  population is used to calculate the range array. Otherwise, the given
 *  element/weight pairs are used.
 * @return {Array} An array of numbers. The array has the same length
 *  as the weighted elements array. Each number corresponds to the upper bound
 *  of the range for the element. The lower bound is the previous number in the
 *  array, or 0 for the first element.
 * @private
 */
common.util.WeightedPopulation.prototype.makeRanges = function(
    opt_weightedElements) {
  var that = this;
  var ranges = [];
  var currentProbRange = 0;
  var weightedElements, weightTotal;
  if (opt_weightedElements !== undefined) {
    // Using the given array. Weight total must be calculated from scratch.
    weightedElements = opt_weightedElements;
    weightTotal = 0;
    $.each(weightedElements, function(i, weightedElement) {
      weightTotal += weightedElement[1];
    });
  } else {
    // Using entire array.
    weightedElements = this.weightedElements;
    weightTotal = this.weightTotal;
  }
  $.each(weightedElements, function(i, weightedElement) {
    var probability = weightedElement[1] / weightTotal;
    currentProbRange += probability;
    ranges.push(currentProbRange);
  });
  return ranges;
};

/**
 * Samples one element from the population. The entire population can be
 * sampled, or a subset of the population can be provided.
 * @param {Array|undefined} opt_weightedElement If undefined, the entire
 *  population is sampled. Otherwise, the given element/weight pairs are used.
 * @private
 */
common.util.WeightedPopulation.prototype.sample = function(
    opt_weightedElements) {
  var ranges, weightedElements;
  if (opt_weightedElements === undefined) {
    // Using all elements. Check for cached ranges.
    if (this.ranges === null) {
      // Recalculate ranges for all weighted elements.
      this.ranges = this.makeRanges();
    }
    weightedElements = this.weightedElements;
    ranges = this.ranges;
  } else {
    weightedElements = opt_weightedElements;
    ranges = this.makeRanges(weightedElements);
  }

  var random = Math.random();
  for (var i = 0; i < ranges.length; ++i) {
    var range = ranges[i];
    if (random < range) {
      break;
    }
  }
  return weightedElements[i];
};

/**
 * Samples the population several times. The same element can appear multiple
 * times in the samples. Thus, the array of sampled elements can be larger
 * than the entire population.
 * @param {Number} numToSample The number of elements to sample from
 *   the population.
 * @return {Array.<Object>} An array of the sampled elements.
 */
common.util.WeightedPopulation.prototype.sampleWithReplacement = function(
    numToSample) {
  var samples = [];
  for (var i = 0; i < numToSample; ++i) {
    var sampledElement = this.sample()[0];
    samples.push(sampledElement);
  }
  return samples;
};

/**
 * Samples the population several times. An element can only appear once
 * in the sample. Thus, the array of sampled elements will never be larger
 * than the entire population.
 * @param {Number} numToSample The number of elements to sample from
 *   the population.
 * @return {Array.<Object>} An array of the sampled elements.
 */
common.util.WeightedPopulation.prototype.sampleWithoutReplacement = function(
    numToSample) {
  numToSample = Math.min(numToSample, this.weightedElements.length);
  var samples = [];
  // Make a copy of the weighted elements.
  var weightedElementsCopy = this.weightedElements.slice();
  for (var i = 0; i < numToSample; ++i) {
    var weightedElement = this.sample(weightedElementsCopy);
    samples.push(weightedElement[0]);
    var index = weightedElementsCopy.indexOf(weightedElement);
    if (index >= 0) {
      // Remove the sampled element.
      weightedElementsCopy.splice(index, 1);
    }
  }
  return samples;
};


/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
common.util.cookie = function(name, value, options) {
  if (typeof value != 'undefined') { // name and value given, set cookie
    options = options || {};
    if (value === null) {
      value = '';
      options.expires = -1;
    }
    var expires = '';
    if (options.expires &&
        (typeof options.expires == 'number' || options.expires.toUTCString)) {
      var date;
      if (typeof options.expires == 'number') {
        date = new Date();
        date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
      } else {
        date = options.expires;
      }
      expires = '; expires=' + date.toUTCString();
    }
    // CAUTION: Needed to parenthesize options.path and options.domain
    // in the following expressions, otherwise they evaluate to undefined
    // in the packed version for some reason...
    var path = options.path ? '; path=' + (options.path) : '';
    var domain = options.domain ? '; domain=' + (options.domain) : '';
    var secure = options.secure ? '; secure' : '';
    document.cookie = (
        [name, '=', encodeURIComponent(value),
         expires, path, domain, secure].join(''));
  } else { // only name given, get cookie
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = jQuery.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
};


/**
 * @class A Class that triggers an event when the given font has loaded. This
 * is detected by appending two spans to the body of the document (hidden from
 * the user). One element uses the default serif font, the other element uses
 * the new font with the serif as a fallback. Before the font loads, the two
 * elements will have the same width (because both will be using the serif
 * font). Once the new font loads, the second element's width will change. We
 * keep checking the widths until they are different, at which point an
 * event is triggered.
 * @param {String} fontFamily The name of the font to load.
 *
 * @constructor
 */
common.util.FontWatcher = function(fontFamily, opt_maxWait) {
  var that = this;

  this.text = 'BeSS';
  this.$defaultFontElement = this.createFontElement(['Arial']);

  this.$newFontElement = this.createFontElement(
      ['"' + fontFamily + '"', 'Arial']);
  if (opt_maxWait) {
    window.setTimeout(function() {
      that.timedOut = true;
    }, opt_maxWait);
  }
};

/**
 * If the font has loaded, trigger a 'fontLoaded' event. Otherwise,
 * check again in 100ms.
 */
common.util.FontWatcher.prototype.checkIfLoaded = function() {
  var that = this;
  var defaultFontWidth = this.$defaultFontElement.width();
  var newFontWidth = this.$newFontElement.width();
  if (defaultFontWidth != newFontWidth || this.timedOut) {
    this.$defaultFontElement.remove();
    this.$newFontElement.remove();
    $(this).triggerHandler('fontLoaded');
  } else {
    window.setTimeout(function() {
      that.checkIfLoaded();
    }, 100);
  }
};

/**
 * Creates a new span element and adds it to the document. The element
 * cannot be hidden in order to get its width dimension. Instead, the element
 * is absolute-positioned out of the document so users won't see it.
 * @param fonts {Array} an Array of names to use in the font-family style
 *    attribute.
 */
common.util.FontWatcher.prototype.createFontElement = function(fonts) {
  var $element = $('<span></span>');
  $element.text(this.text);
  $element.css({
    position: 'absolute',
    top: -999,
    width: 'auto',
    height: 'auto',
    margin: 0,
    padding: 0,
    'line-height': 'auto',
    'font-size': 300,
    'font-variant': 'normal',
    'font-family': fonts.join(',')
  });
  $('body').append($element);
  return $element;
};


/**
 * @class Manages preloading resources. Will automatically preload
 * any images in the page's CSS, as well as any fonts explicitly
 * mentioned.
 * @param {Object} opt_audioManager An optional audio manager used
 *   to load sounds. If not provided, NullAudioManager is used.
 * @param {Boolean|undefined} opt_loadImagesInParallel If true,
 *   loads images in parallel, rather than serially.
 * @constructor
 */
common.util.ResourceLoader = function(
    opt_audioManager, opt_loadImagesInParallel, opt_maxFontWait) {
  this.unloaded = 0;
  this.total = 0;
  this.resourceNamesLoaded = {};
  this.fontWatchers = [];
  this.sounds = [];
  this.images = [];
  this.doneLoadining = false;
  this.loadImagesInParallel = opt_loadImagesInParallel || false;
  this.audioManager = opt_audioManager || new common.io.NullAudioManager();
  this.maxFontWait = opt_maxFontWait || 0;
};

/**
 * Add an image to load.
 * @param {String} imageUrl The URL of the image to load.
 */
common.util.ResourceLoader.prototype.addImage = function(imageUrl) {
  if (imageUrl && !common.util.isInArray(imageUrl, this.images)) {
    this.total += 1;
    this.unloaded += 1;
    this.images.push(imageUrl);
    this.resourceNamesLoaded[imageUrl] = 0;
  }
};


/**
 * Adds the given font to the resources that need to be preloaded.
 * @param {String} fontFamily The name of the font to include in loading.
 */
common.util.ResourceLoader.prototype.addFont = function(fontFamily) {
  var that = this;
  this.total += 1;
  this.unloaded += 1;
  this.resourceNamesLoaded[fontFamily] = 0;
  var watcher = new common.util.FontWatcher(fontFamily,
    this.maxFontWait);
  $(watcher).bind('fontLoaded', function() {
    that.loadedResource(fontFamily);
  });
  this.fontWatchers.push(watcher);
};

/**
 * Adds the given sound to the resources that need to be preloaded.
 * @param {String} soundName The name of the sound to include in loading.
 */
common.util.ResourceLoader.prototype.addSound = function(soundName) {
  this.total += 1;
  this.unloaded += 1;
  this.resourceNamesLoaded[soundName] = 0;
  this.sounds.push(soundName);
};

/**
 * Add images referenced in the given stylesheet.
 * @param {String} styleSheetName The name of the style sheet, not including the
 *   '.css' suffix and path.
 */
common.util.ResourceLoader.prototype.addStylesheetImages = function(
    styleSheetName) {
  var styleSheets = document.styleSheets;
  var styleSheet = null;
  var styleSheetMatcher = new RegExp(styleSheetName + '\.css$');
  for (var i = 0, sheet; sheet = styleSheets[i++];) {
    if (sheet.href && sheet.href.match(styleSheetMatcher)) {
      styleSheet = sheet;
      break;
    }
  }
  if (!styleSheet) {
    // No style sheet found with the given name.
    return;
  }
  var styleRules = styleSheet.cssRules || styleSheet.rules || null;
  var cssPile = '';  // Extracted rules that may contain images.
  if (styleRules) {
    for (var i = 0, rule; rule = styleRules[i++];) {
      if (rule.style && rule.style.cssText) {
        var text = rule.style.cssText;
        if (text.toLowerCase().indexOf('url') != -1) {
          cssPile += text;
        }
      }
    }
  }
  var imageUrls = cssPile.match(/[^\("]+\.(gif|jpg|jpeg|png)/g);
  if (imageUrls) {
    for (var i = 0, imageUrl; imageUrl = imageUrls[i++];) {
      this.addImage(imageUrl);
    }
  }
};

/**
 *
 */
common.util.ResourceLoader.prototype.addSelectorImages = function(selector) {
  var styleSheets = document.styleSheets;
  var cssPile = '';  // Extracted rules that may contain images.
  // Match all rules that contain the given string, as long as the
  // string is not a substring in the selector.
  if (common.util.BROWSER.ENGINE == 'webkit') {
    selector = selector.toLowerCase();
  }
  var selectorMatcher = new RegExp(
      '(^|[^a-zA-Z])' +
      // Escape the period in the css selector name.
      selector.replace('.', '\\.') +
      '([^a-zA-Z]|$)');
  // Iterate through every stylesheet.
  for (var i = 0, sheet; sheet = styleSheets[i++];) {
    var styleRules = sheet.cssRules || sheet.rules || null;
    if (styleRules) {
      // Iterate through every stylesheet rule.
      for (var j = 0, rule; rule = styleRules[j++];) {
        if (rule.style && rule.style.cssText &&
            rule.selectorText && rule.selectorText.match(selectorMatcher)) {
          // Rule matches the given selector. Copy any url() rules to
          // the css pile.
          var text = rule.style.cssText;
          if (text.toLowerCase().indexOf('url') != -1) {
            cssPile += text;
          }
        }
      }
    }
  }

  var imageUrls = cssPile.match(/[^\("]+\.(gif|jpg|jpeg|png)/g);
  if (imageUrls) {
    for (var i = 0, imageUrl; imageUrl = imageUrls[i++];) {
      this.addImage(imageUrl);
    }
  }
}

/**
 * Load images, sounds, and stylesheets from a resource manifset.
 * @param {Object} manifest An object containing properties "stylesheets",
 *   "sounds", "images", and "fonts". Each property maps to an array of
 *   strings, which represent the resources to load.
 */
common.util.ResourceLoader.prototype.addResourceManifest = function(manifest) {
  // Load stylesheet images
  var stylesheets = manifest.stylesheets || [];
  for (var i = 0, sheetName; sheetName = stylesheets[i++];) {
    this.addStylesheetImages(sheetName);
  }
  // Load images by CSS selector
  var selectors = manifest.selectors || [];
  for (var i = 0, selector; selector = selectors[i++];) {
    this.addSelectorImages(selector);
  }
  // Load images
  var images = manifest.images || [];
  for (var i = 0, imageUrl; imageUrl = images[i++];) {
    this.addImage(imageUrl);
  }
  // Load fonts
  var fonts = manifest.fonts || [];
  for (var i = 0, fontFamily; fontFamily = fonts[i++];) {
    this.addFont(fontFamily);
  }
  // Load sounds
  var sounds = manifest.sounds || [];
  for (var i = 0, sound; sound = sounds[i++];) {
    this.addSound(sound);
  }
};

/**
 * Start the preloading process. Trigger a 'startingPreload' event.
 */
common.util.ResourceLoader.prototype.load = function() {
  var that = this;
  $(this).triggerHandler('startingPreload');
  this.loadFonts();
  if (this.loadImagesInParallel) {
    this.loadImagesParallel();
  } else {
    this.loadImagesSerial();
  }
  this.audioManager.onReady(function() {
    that.loadSounds();
  });

  if (this.unloaded == 0) {
    this.maybeFinishLoading();
  }
};

/**
 * Function called when the last resource loads. Triggers two events:
 * a progress event at 100%, and a "doneLoading" event. "doneLoading"
 * is guaranteed to fire only once. (In the situation where all of
 * the resources are already preloaded, it's possible that maybeFinishLoading
 * will get called twice.).
 * @private
 */
common.util.ResourceLoader.prototype.maybeFinishLoading = function() {
  $(this).triggerHandler('progress', 100);
  if (!this.doneLoading) {
    this.doneLoading = true;
    $(this).triggerHandler('doneLoading');
  }
};

/**
 * Start checking fonts to see if they've loaded.
 * @private
 */
common.util.ResourceLoader.prototype.loadFonts = function() {
  for (var i = 0, watcher; watcher = this.fontWatchers[i++];) {
    watcher.checkIfLoaded();
  }
};

/**
 * Start loading all sounds added to this loader.
 * @private
 */
common.util.ResourceLoader.prototype.loadSounds = function() {
  var that = this;
  _.each(this.sounds, function(soundName) {
    that.audioManager.preload(soundName, function() {
      that.loadedResource(soundName);
    });
  });
};

/**
 * Load one image at a time.
 * @private
 */
common.util.ResourceLoader.prototype.loadImagesSerial = function() {
  var that = this;
  if (this.images.length > 0) {
    var imageUrl = this.images.pop();
    var image = new Image();
    image.src = imageUrl;
    $(image).bind('error load onreadystatechange', function(e) {
      that.loadedResource(imageUrl);
      that.loadImagesSerial();
    });
  }
};

/**
 * Load all images at the same time.
 * @private
 */
common.util.ResourceLoader.prototype.loadImagesParallel = function() {
  var that = this;
  _.each(this.images, function(imageUrl) {
    var image = new Image();
    image.src = imageUrl;
    $(image).bind('error load onreadystatechange', function() {
      // Defer so we don't screw up the walk through the url array.
      _.defer(function() {
        that.loadedResource(imageUrl);
      });
    });
  });
  for (var i = 0, imageUrl; imageUrl = this.images[i++];) {
  }
};

/**
 * Called when a single resource has loaded. Triggers a 'progress' event
 * with a percentage complete parameter. If all resources are loaded, also
 * triggers a 'doneLoading' event.
 * @private
 */
common.util.ResourceLoader.prototype.loadedResource = function(resourceName) {
  this.resourceNamesLoaded[resourceName] = 1;
  this.unloaded -= 1;
  if (this.unloaded == 0) {
    this.maybeFinishLoading();
  } else {
    var percent = (this.total - this.unloaded) / this.total * 100;
    $(this).triggerHandler('progress', percent);
  }
};

/**
 * A wrapper for ResourceLoader as the number of options is growing, easier
 * to instantiate.
 *
 * @param opt_options
 * @constructor
 */
common.util.ResourceLoader2 = function(opt_options) {
  var options = opt_options || {};
  
  common.util.ResourceLoader.call(this, options.audioManager, 
      options.loadImagesInParallel, options.maxFontWait);
};
common.util.inherits(common.util.ResourceLoader2, common.util.ResourceLoader);


var DEV_LOGGER_IN_MEMORY_BUFFER_SIZE = 50;
/**
 * A utility for development/debug logging.
 * A global instance is instantiated, below.
 * Depending on how global flags are set, logs messages to console and/or
 * in memory.
 */
common.util.DevLogger = function() {
  this.inMemoryArray = [];
};

common.util.devLogger = new common.util.DevLogger();

/**
 * Write a line to the devLogger.

 * When we call 'log' to record some message:
 *   - If FLAGS.devLoggerLogToConsole is set, message is written immediately to
 *     js console.
 *   - If FLAGS.devLoggerLogInMemory is set, keep the message in memory, only
 *     preserving the last N.
 *   - trigger a 'logMessageAdded' event.
 *
 * @param {Object} text
 */
common.util.DevLogger.prototype.log = function(message) {
  if (FLAGS && FLAGS.devLoggerLogInMemory) {
    this.inMemoryArray.push(message);
    if (this.inMemoryArray.length >= DEV_LOGGER_IN_MEMORY_BUFFER_SIZE) {
      this.inMemoryArray.shift();
    }
  }

  if (FLAGS && FLAGS.devLoggerLogToConsole && console && console.log) {
    console.log(message);
  }
  $(this).triggerHandler('logMessageAdded', [message]);
};

common.util.DevLogger.prototype.getRecentHistory = function() {
  return this.inMemoryArray;
};


/**
 * A function to turn an array of strings into a language-friendly
 * enumeration of those strings.
 * [cat] -> cat
 * [cat, dog] -> cat and dog
 * [cat, dog, bird] -> cat, dog, and bird.
 *
 * FIXME(dbanks)
 * Long-term this should be moved into a file for language-specific functions,
 * a-la the i18n files, only it has code and not just data.
 *
 * @param {Object} stringArray
 */
common.util.createEnumerationString = function(stringArray) {
  if (stringArray.length == 0) {
    return "";
  }
  if (stringArray.length == 1) {
    return stringArray[0];
  }
  if (stringArray.length == 2) {
    return stringArray[0] + " and " + stringArray[1];
  }

  var retVal = "";
  for (var i = 0; i < stringArray.length; i++) {
    var string = stringArray[i];
    if (i > 0) {
      retVal += ", ";
    }
    if (i == stringArray.length-1) {
      retVal += " and ";
    }
    retVal += string;
  }
  return string;
}


/**
 * Return the string formatted with given arguments.
 * Translate each arg into a string.
 * For n = 0 to (num args)-1, replace each instance of '$$n$$' in the string
 * with string(args[n])
 *
 * @param {String} string String to be formatted.
 * @param {Array} opt_args Arguments to place in string.
 */
common.util.formatString = function(formatString, opt_args) {
  if (!formatString) {
    console.log('bad formatString');
  }
  args = opt_args || [];
  var retval = formatString.slice(0);
  for (var i = 0; i < args.length; i++) {
    var argStr = '' + args[i];
    var placeholder = new RegExp('\\$\\$' + i + '\\$\\$', 'gi');
    retval = retval.replace(placeholder, argStr);
  }
  return retval;
};


/**
 * Converts an index to letters from the beginning of the alphabet.
 * Uses a one-based index, so 1 -> 'a', 2 -> 'b', etc.
 * @param {Number} index a one-based index.
 * @return A string character.
 */
common.util.mapOneBasedIndexToLetter = function(index) {
  // 65 is the char code for 'a', so we add 64 so that
  // section 1 maps to 'a', 2 maps to 'b', etc.
  return String.fromCharCode(64 + index);
};


/**
 * Add the given cgi params to the given url, return new url.
 *
 * Handles details of whether we need to add a question mark,
 * ampersands, etc.
 *
 * WARNING:
 * Caller *SHOULD NOT* uri encode values passed into params: this
 * function will do it.
 *
 * @param {String} url
 * @param {Object} params - name/value pairs.  We expect the values
 *   are not url encoded.
 */
common.util.addUrlParams = function(url, params) {
  if (url.indexOf('?') == -1) {
    url += '?';
  }
  for (var pkey in params) {
    url = url + '&' + pkey + '=' + encodeURIComponent(params[pkey]);
  }
  return url;
};

/**
 * Replace all instances of substr in str with replacement.
 * Note that substr is NOT a regex, it is an exact match.
 *
 * @param {String} str
 * @param {String} substr
 * @param {String} replacement
 */
common.util.replaceAll = function(str, pattern, replacement) {
  return str.split(pattern).join(replacement);
};

/**
 * True iff dictionary exists and has at least one element in it.
 * @param {Object} dict
 */
common.util.dictionaryHasContents = function(dict){
  if (!dict) {
    return false;
  }
  for (var key in dict) {
    return true;
  }
  return false;
};

/**
 * Standard C++ style strcmp.
 * @param {Object} s1
 * @param {Object} s2
 */
common.util.strcmp = function(s1, s2) {
  return (s1 < s2) ? -1 : (s1 > s2 ? 1 : 0);
};

/**
 * Remove a named param from a url.
 * Copied from
 * http://stackoverflow.com/questions/1634748/how-can-i-delete-a-query-string-parameter-in-javascript
 *
 * @param {Object} url
 * @param {Object} parameter
 */
common.util.removeParameter = function(url, parameter) {
  var urlparts= url.split('?');

  if (urlparts.length>=2) {
    //get first part, and remove from array
    var urlBase=urlparts.shift();
    //join it back up
    var queryString=urlparts.join("?");

    var prefix = encodeURIComponent(parameter)+'=';
    var pars = queryString.split(/[&;]/g);
    for (var i= pars.length; i-->0;) {
      //reverse iteration as may be destructive
      if (pars[i].lastIndexOf(prefix, 0)!==-1) {
        //idiom for string.startsWith
        pars.splice(i, 1);
      }
      url = urlBase+'?'+pars.join('&');
    }
  }
  return url;
};

common.util.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Reg exp that matches a single punctuation character.
 */
var SINGLE_PUNCTUATION_RE = new RegExp('[' + JS_PUNCTUATION + ']', 'g');

common.util.stripPunctuation = function(string) {
  var punctuationless = string.replace(SINGLE_PUNCTUATION_RE ,"");
  return punctuationless.replace(/\s{2,}/g," ");
};


/**
 * Remove whitespace from front and back of string.
 * @param {Object} str
 */
common.util.trimWhitespace = function(str) {
  return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};

/**
 * Return date string in the form yyyy-MM-dd
 * @param date
 * @returns {string}
 */
common.util.dateToString = function(date) {
  var monthString =
      common.util.integerToZeroPaddedString(date.getMonth() + 1, 2);
  var dateString =
      common.util.integerToZeroPaddedString(date.getDate(), 2);
  return date.getFullYear() + '-' + monthString + '-' + dateString;
};

common.util.integerToZeroPaddedString = function(intValue, length) {
  var str = intValue.toString();
  while (str.length < length) {
    str = '0' + str;
  }
  return str;
};


/**
 * Format number with comma separation: 1000000 -> "1,000,000"
 * @param x
 * @returns {string}
 */
common.util.formatNumberWithCommas = function(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};


/**
 * Is Flash installed for this browswer?
 *
 * Cribbed from the internet:
 * http://stackoverflow.com/questions/998245
 */
var FLASH_INSTALLED;
common.util.flashIsIntalled = function() {
  if (FLASH_INSTALLED === undefined) {
    FLASH_INSTALLED = false;
    try {
      var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      if (fo) {
        FLASH_INSTALLED = true;
      }
    } catch(e) {
      if(navigator.mimeTypes ["application/x-shockwave-flash"] != undefined) {
        FLASH_INSTALLED = true;
      }
    }
  }
  return FLASH_INSTALLED;
};



var __tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';
var __tagOrComment = new RegExp(
    '<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + __tagBody + '>[\\s\\S]*?</script\\s*'
    + '|style\\b' + __tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]'
    + __tagBody
    + ')>',
    'gi');

/**
 * Remove any html tags from input string.
 * Useful for sanitizing user-created strings to remove any kind of scripting
 * attacks.
 *
 * From http://stackoverflow.com/questions/295566/sanitize-rewrite-html-on-the-client-side
 *
 * @param html
 * @returns {XML|string|void}
 */
common.util.removeTags = function(html) {
  var oldHtml;
  do {
    oldHtml = html;
    html = html.replace(__tagOrComment, '');
  } while (html !== oldHtml);
  return html.replace(/</g, '&lt;');
}

})();

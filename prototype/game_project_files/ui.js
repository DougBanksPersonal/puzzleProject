(function() {

/**
 * @fileoverview A library filled with useful functions & classes
 *     for designing a UI for mobile touch screen devices. Requires
 *     utils.js.
 * @author Adam Stepinski
 */

window.common = window.common || {};
window.common.ui = window.common.ui || {};

var devLogger = common.util.devLogger;

var STRINGS = window.STRINGS.UI;
var PREFIX = common.util.BROWSER.PREFIX;
var ENGINE = common.util.BROWSER.ENGINE;
var TRANSITION_END = common.util.BROWSER.TRANSITION_END;

/**
 * This function returns a unique number each time it is called.
 * This is useful for creating unique namespaces for instantiated objects.
 */
common.ui.getUniqueNamespace = (function() {
  var id = 0;
  return function() {
    return '' + id++;
  };
})();



/**
 * Binds a handler to an "in place touch" event on a given element.
 * The "in place touch" event fires immediately when the finger lifts off the
 * element. The event won't fire if the finger moves before lifting off the
 * element. This can be used to prevent scroll interactions from accidentally
 * firing events.
 * @param {Object} element The jQuery object listening to the event.
 * @param {Function} handler The function called when the event fires. The
 *    handler is passed the event from the end of the touch.
 * @param {String|undefined} opt_namespace An optional namespace to use
 *    for binding the "fast touch" event.
 */
common.ui.inPlaceTouch = function(element, handler, opt_namespace) {
  var moved = false;

  var namespace = opt_namespace || '';
  element.bind(window.FLAGS.start + namespace, function(e) {
    moved = false;
  });

  element.bind(window.FLAGS.move + namespace, function(e) {
    moved = true;
  });

  element.bind(window.FLAGS.end + namespace, function(e) {
    if (moved) { return; }
    handler(e);
  });
};


/**
 * Binds a handler to a "fast touch" event on a given element.
 * On touch screen devices, the normal "click" event is delayed after
 * the touch on the element. The "in place touch" fires immediately when
 * the finger lifts off the element. The event won't fire if the finger
 * moves outside the element before being lifted.
 * @param {Object} element The jQuery object listening to the event.
 * @param {Function} handler The function called when the event fires. The
 *    handler is passed a native JavaScript event object.  Note this
 *    is not the same as a jquery event object, which has extra methods
 *    and properties.
 * @param {String|undefined} opt_namespace An optional namespace to use
 *    for binding the "fast touch" event.
 */
common.ui.fastTouch = function(element, handler, opt_namespace) {
  var touchingWithinElement;
  var namespace = opt_namespace || '';
  element.bind(window.FLAGS.end + namespace, function(e) {
    if (FLAGS.touchScreen) {
      e = FLAGS.touchScreen ? e.originalEvent : e;
      e = e.changedTouches[0];
    }
    var offset = element.offset();
    var minX = offset.left;
    var minY = offset.top;
    var maxX = offset.left + element.outerWidth();
    var maxY = offset.top + element.outerHeight();
    if (e.clientX >= minX && e.clientX <= maxX &&
        e.clientY >= minY && e.clientY <= maxY) {
      handler(e);
    }
  });
};


/**
 * Binds a handler to the click event on an element. If the UI is being
 * rendered on a touch screen, the handler is bound to the "fast touch" event
 * on the element.
 * @param {Object} element The jQuery object listening to the event.
 * @param {Function} handler The function called when the event fires.
 *     Arguments:
 *       event: a description of the event that triggered the click.
 *         May be a native JavaScript event, or a jQuery event, which is a
 *         wrapper around the native event with extra methods and properties.
 *         If you want to be sure you are getting the jQuery event, use
 *         opt_inPlaceTouch=true.
 * @param {String|undefined} opt_namespace An optional namespace to use
 *    for binding the event.
 * @param {Boolean|undefined} opt_inPlaceTouch An optional flag to indicate that
 *    the handler should not be called if the user's finger moves while the
 *    element is clicked. This only works on touchScreens. Used to prevent
 *    accidental clicks on elements in scrollable views. The movement of the
 *    finger indicates that the user's intent was to scroll instead of press.
 */
common.ui.click = function(element, handler, opt_namespace, opt_inPlaceTouch) {
  var namespace = opt_namespace || '';
  if (!window.FLAGS.touchScreen) {
    element.bind(window.FLAGS.click + namespace, handler);
  } else {
    if (opt_inPlaceTouch) {
      common.ui.inPlaceTouch(element, handler, namespace);
    } else {
      common.ui.fastTouch(element, handler, namespace);
    }
  }
};


/**
 * Bind a handler to the "long touch" event on an element. A long touch
 * event fires when a user keeps her finger on an element for at least 100
 * milliseconds. The event will not fire if the user lifts her finger or
 * moves her finger before the 100ms elapses. This is useful for triggering
 * active states on elements in a scrolling view: The delay in the event
 * prevents it from firing if the user merely meant to scroll the view.
 * @param {Object} element The jQuery object listening to the event.
 * @param {Function} handler The function called when the event fires. The
 *    handler is passed the event from the end of the touch.
 * @param {String|undefined} opt_namespace An optional namespace to use
 *    for binding the "long touch" event.
 * @param {Integer|undefined} opt_timeoutMs By default 'long' = 1 second.
 *    Use opt_timeoutMs to override the delay.
 */
common.ui.longTouch = function(element, handler, opt_namespace, opt_timeoutMs) {
  var touched = false;
  var id = null;
  var namespace = opt_namespace || '';
  var time = opt_timeoutMs || 100;
  element.bind(window.FLAGS.start + namespace, function() {
    touched = true;
    id = window.setTimeout(function(e) {
      if (touched) { handler(e); }
    }, time);
  });

  element.bind(
      window.FLAGS.end + namespace + ' ' +
      window.FLAGS.move + namespace, function() {
    window.clearTimeout(id);
    touched = false;
  });
};


/**
 * @class An abstract representation of a UI element rendered in HTML.
 * A View contains a method that returns the HTML associated with it.
 * Views can also contain children whose HTML is appended to the parent's HTML.
 * Each View has a destroy() method which removes the HTML from the DOM and
 * correctly destroys all child views. The destroy method also unbind any
 * listeners that are bound to by the View. Almost all major UI components
 * should be created as classes inheriting from this object.
 * @constructor
 */
common.ui.View = function() {
  this.viewId = common.ui.getUniqueNamespace();
};

/**
 * Before destroying this view, call this function.
 *
 * @param {Object} callback
 */
common.ui.View.prototype.addDestroyCallback = function(callback) {
  if (!this.destroyCallbacks) {
    this.destroyCallbacks = [];
  }
  this.destroyCallbacks.push(callback);
};

// Static reference count of all instantiated views.
common.ui.View.ALIVE_OBJECTS = 0;
// Static flag indicating if the creation & destruction
// of views should be logged to the console. Useful for debugging
// if there is a possibility of a leak.
common.ui.View.DEBUG = false;

/**
 * Returns the namespace for this view. The namespace is unique
 * for a particular instance of a View. We calculate it the first time
 * this method is accessed, and then we cache it.
 * @return {Number} The namespace for this view.
 */
common.ui.View.prototype.getNamespace = function() {
  if (this.namespace === undefined) {
    this.namespace = common.ui.getUniqueNamespace();
  }
  return this.namespace;
};

/**
 * Binds the handler to the given event on the given object. Performing the
 * binding through this method will ensure that the handler is unbound when
 * this view is destroyed.
 * @param {Object} object The object to bind the handler to.
 * @param {String} eventName The name of the event to bind to.
 * @param {Function} handler The handler for the event.
 */
common.ui.View.prototype.bindToObject = function(object, eventName, handler) {
  this.binders = this.binders || [];
  this.binders.push(object);
  $(object).bind(eventName + '.' + this.getNamespace(), handler);
};

/**
 * Adds a child view to this view. The child view's HTML is added to this
 * view's HTML. Performing this addition through this method ensures that the
 * child view will be destroyed when this view is destroyed.
 * @param {common.ui.View} The child view.
 * @param {Object|undefined} An optional jQuery object to add the child's HTML
 *    to. This object should be part of this view's HTML.
 * @param {Boolean|undefined} An optional flag indicating that the child's HTML
 *    should be prepended to the element, and not appended.
 */
common.ui.View.prototype.addChild = function(child, opt_element, opt_prepend) {
  if (child == null || !child.getWidget) {
    devLogger.log("bad child");
  }
  this.children = this.children || [];
  this.children.push(child);
  var appendElement = opt_element || this.view;
  if (!appendElement) {
    devLogger.log("bad appendElement");
  }
  if (opt_prepend) {
    appendElement.prepend(child.getWidget());
  } else {
    appendElement.append(child.getWidget());
  }
};

/**
 * Returns the HTML for this view.
 * @return A jQuery object containing the HTML for this view.
 */
common.ui.View.prototype.getWidget = function() {
  if (common.ui.View.DEBUG && !this.getWidgetCalled) {
    this.getWidgetCalled = true;
    ++common.ui.View.ALIVE_OBJECTS;
    devLogger.log(
        'creating "' + this.viewId + '": ' + common.ui.View.ALIVE_OBJECTS);
  }
  return this.view;
};

common.ui.View.prototype.destroy = function() {
  if (this.destroyCallbacks) {
    for (var i = 0; i < this.destroyCallbacks.length; i++) {
      this.destroyCallbacks[i]();
    }
    this.destroyCallbacks = null;
  }

  if (common.ui.View.DEBUG) {
    --common.ui.View.ALIVE_OBJECTS;
    devLogger.log(
        'destroying "' + this.viewId + '": ' + common.ui.View.ALIVE_OBJECTS);
    if (this.destroyed) { devLogger.log('  ALREADY DESTROYED!'); }
  }
  this.destroyed = true;
  if (this.binders) {
    for (var i = 0, binder; binder = this.binders[i++];) {
      $(binder).unbind('.' + this.getNamespace());
    }
  }
  if (this.children) {
    for (var j = 0, child; child = this.children[j++];) {
      child.destroy();
    }
  }
  this.view.remove();
};



/**
 * @class A view for a top navigation bar that contains buttons.
 *
 * @constructor
 */
common.ui.ButtonBar = function() {
  this.view = $('<div class="buttonBar"></div>');
};
common.util.inherits(common.ui.ButtonBar, common.ui.View);

/**
 * Add a button to the button bar.
 *
 * @param {Object} label
 * @param {Object} opt_handler
 * @param {Object} opt_buttonElement
 * @param {Object} opt_class
 * @param {Object} opt_prepend
 */
common.ui.ButtonBar.prototype.addButton = function(
    label, opt_handler, opt_buttonElement, opt_class, opt_prepend) {
  var $buttonElement = opt_buttonElement ||
      $('<span class=button>' + label + '</span>');
  var button = new common.ui.Button($buttonElement);

  if (opt_handler) {
    // Small hack to make back button more responsive. Instead of using
    // the button's normal 'click' functionality, we bind to FLAGS.end.
    // This way, the button handler will trigger even if the user moves
    // her finger while touching the button. Since the back button is a small
    // target, this helps with clicking it.
    button.view.bind(FLAGS.end, opt_handler);
  }
  if (opt_class) {
    button.addClass(opt_class);
  }
  this.addChild(button, null, opt_prepend);
};

/**
 * Moves the title bar off the screen to the left.
 */
common.ui.ButtonBar.prototype.slideOutLeft = function() {
  this.view.removeClass('slideOutRight slideIn');
  this.view.addClass('slideOutLeft');
};

/**
 * Moves the title bar off the screen to the right.
 */
common.ui.ButtonBar.prototype.slideOutRight = function() {
  this.view.removeClass('slideOutLeft slideIn');
  this.view.addClass('slideOutRight');
};

/**
 * Moves the title bar into the screen.
 */
common.ui.ButtonBar.prototype.slideIn = function() {
  this.view.removeClass('slideOutRight slideOutLeft');
  this.view.addClass('slideIn');
};

/**
 * Show the title bar immediately (skip the sliding in/out step).
 */
common.ui.ButtonBar.prototype.show = function() {
  var that = this;
  this.view.hide();
  this.view.removeClass('slideOutRight slideOutLeft slideIn');
  window.setTimeout(function() {
    that.view.show();
  }, 0);
};

/**
 * @class A View for a navigation bar with buttons.  There may be a button on
 *    the left, and/or a button on the right.
 * @param {Object} options Contains the properties: leftLabel, leftHandler,
 *    rightLabel, rightHandler, leftButton.
 * @constructor
 */
common.ui.LeftRightButtonBar = function(buttonOptions) {
  if (buttonOptions === undefined) {
    // inheritance guard.
    return;
  }

  common.ui.ButtonBar.call(this);

  if (buttonOptions.leftLabel || buttonOptions.leftButton) {
    this.addButton(
        buttonOptions.leftLabel, buttonOptions.leftHandler, buttonOptions.leftButton, null, true);
  }

  if (buttonOptions.rightLabel || buttonOptions.rightButton) {
    this.addButton(buttonOptions.rightLabel, buttonOptions.rightHandler, buttonOptions.rightButton, 'right', false);
  }
};
common.util.inherits(common.ui.LeftRightButtonBar, common.ui.ButtonBar);

/**
 * @class A View for a navigation bar with buttons.  There may be an arbitrary number of
 *     buttons.  Their layout is determined by styling.
 * @param {Object} buttonConfigs An array of button config statements.  Each contains:
 *    label
 *    handler
 *    buttonElement
 *    class
 * @constructor
 */
common.ui.MultiButtonBar = function(buttonConfigs) {
  common.ui.ButtonBar.call(this);
  this.view.addClass('multiButtonBar');

  for (var i = 0; i < buttonConfigs.length; i++) {
    var buttonConfig = buttonConfigs[i];
    this.addButton(buttonConfig.label, buttonConfig.handler, buttonConfig.buttonElement, buttonConfig.buttonClass);
  }
};
common.util.inherits(common.ui.MultiButtonBar, common.ui.ButtonBar);

/**
 * @class A View for the Navigation bar in a touch screen mobile app.
 *    A TitleBar contains a title, and optionally a back button.
 * @param {String} title The title that appears in the bar.
 * @param {Object} buttonOptions Contains the properties: leftLabel,
 *    leftHandler, rightLabel, rightHandler.
 * @constructor
 */
common.ui.TitleBar = function(title, buttonOptions) {
  common.ui.LeftRightButtonBar.call(this, buttonOptions);
  this.view.addClass('titleBar');
  this.view.prepend($('<h5>' + title + '</h5>'));
};
common.util.inherits(common.ui.TitleBar, common.ui.LeftRightButtonBar);

/**
 * Changes the title
 * @param {String} title The new title.
 */
common.ui.TitleBar.prototype.setTitle = function(newTitle) {
  this.view.find('h5').html(newTitle);
};

/**
 * Fades the title out.
 */
common.ui.TitleBar.prototype.fadeOut = function() {
  this.view.addClass('fadeOut');
};

/**
 * Fades the title in.
 */
common.ui.TitleBar.prototype.fadeIn = function() {
  this.view.removeClass('fadeOut');
};

/**
 * Hide the title bar and fade it in immediately.
 */
common.ui.TitleBar.prototype.hideAndFadeIn = function() {
  var that = this;
  this.view.hide();
  this.view.removeClass('slideOutRight slideOutLeft slideIn');
  this.view.addClass('fadeOut');
  window.setTimeout(function() {
    that.view.show();
    window.setTimeout(function() {
      that.fadeIn();
    }, 0);
  }, 0);
};


/**
 * @class A View that displays content in the space below a title bar on a
 * touch screen phone. A Screen provides methods to replace the content it
 * displays, as well as methods to animate the content sliding in and out
 * of view.
 *
 * @param {Object} content The view to display in this screen.
 * @constructor
 */
common.ui.Screen = function(content) {
  var that = this;
  this.content = content;
  this.view = $('<div class=screen></div>');
  this.view.append(content.getWidget());
  this.view.bind(TRANSITION_END, function(e) {
    $(that).triggerHandler('transitionEnded');
  });
};
common.util.inherits(common.ui.Screen, common.ui.View);


common.ui.Screen.prototype.getId = function() {
  return this.content.getWidget().attr('class');
}

/**
 * Remove this screen and destroy the screen's content.
 */
common.ui.Screen.prototype.destroy = function() {
  this.content.destroy();
  common.ui.View.prototype.destroy.call(this);
};


/**
 * Triggers an event signifying the start of this screen's transition.
 * @private
 */
common.ui.Screen.prototype.startTransition = function() {
  $(this).triggerHandler('transitionStarted');
};

/**
 * Moves the screen out of view to the left.
 */
common.ui.Screen.prototype.slideOutLeft = function() {
  this.view.removeClass('slideOutRight slideIn');
  this.view.addClass('slideOutLeft');
  this.startTransition();
};

/**
 * Moves the screen out of view to the right.
 */
common.ui.Screen.prototype.slideOutRight = function() {
  this.view.removeClass('slideOutLeft slideIn');
  this.view.addClass('slideOutRight');
};

/**
 * If this screen resets when it is shown, call the content's reset method.
 * A View defines reset() if it needs to change it's appearance each
 * time it is displayed to the user. For example, screen A and screen B are
 * added to a screen manager stack. The user clicks the back button, and screen
 * B slides away. reset() is called on screen A before it is shown to the user,
 * in case the UI needs to be modified.
 */
common.ui.Screen.prototype.maybeResetView = function() {
  if (this.content.reset) {
    this.content.reset();
  }
};

/**
 * Activate the content of this screen. This method should be called the first
 * time the screen is added to the document. Views should use activate() to
 * do any computations that rely on HTML & CSS dimension calculations.
 */
common.ui.Screen.prototype.activate = function() {
  if (this.content.activate) {
    this.content.activate();
  }
};

/**
 * Slide the screen content into view.
 */
common.ui.Screen.prototype.slideIn = function() {
  this.maybeResetView();
  this.view.removeClass('slideOutRight slideOutLeft');
  this.view.addClass('slideIn');
  this.startTransition();
};

/**
 * Show the screen content immediately, skip the slide in/out step.
 */
common.ui.Screen.prototype.show = function() {
  var that = this;
  this.view.hide();
  this.view.removeClass('slideOutRight slideOutLeft slideIn');
  this.maybeResetView();
  // If we called show() immediately, hide() and show() would cancel
  // each other out, and we would potentially see sliding animations
  // due to removing the slide CSS classes. By delaying show(), we ensure
  // that the CSS classes are removed while the element is hidden, which
  // prevents the animation from happening.
  window.setTimeout(function() {
    that.view.show();
  }, 0);
};

/**
 * Fades the screen out.
 * @param {Function|undefined} opt_handler Optional callback to call
 *   when the screen finishes fading out.
 */
common.ui.Screen.prototype.fadeOut = function(opt_handler) {
  var that = this;
  if (opt_handler) {
    var endTransitionHandler = function() {
      opt_handler();
      $(that.view).unbind(TRANSITION_END, endTransitionHandler);
    };
    $(this.view).bind(TRANSITION_END, endTransitionHandler);
  }
  if (!this.view.hasClass('fadeOut')) {
    this.view.addClass('fadeOut');
    this.startTransition();
  }
};

/**
 * Fades the screen in.
 */
common.ui.Screen.prototype.fadeIn = function() {
  if (this.view.hasClass('fadeOut')) {
    this.view.addClass('fadeIn');
    this.view.removeClass('fadeOut');
    this.startTransition();
  }
};

/**
 * Hide this screen and fade it in immediately.
 */
common.ui.Screen.prototype.hideAndFadeIn = function() {
  var that = this;
  this.view.hide();
  this.view.removeClass('slideOutRight slideOutLeft slideIn');
  this.view.addClass('fadeOut');
  window.setTimeout(function() {
    that.view.show();
    window.setTimeout(function() {
      that.fadeIn();
    }, 0);
  }, 0);
};


/**
 * Extension of the Screen class which shows a title bar above the view.
 * @param {common.ui.View} content The view to show in the screen.
 * @param {String|undefined} opt_title Optional title to show in the top bar.
 * @param {Object} buttonOptions Options to use for the top bar buttons,
 *   including labels and click handlers.
 * @constructor
 */
common.ui.TopBarScreen = function(content, opt_title, buttonOptions) {
  var that = this;
  common.ui.Screen.call(this, content);
  if (opt_title) {
    this.topBar = new common.ui.TitleBar(opt_title, buttonOptions);
  } else if (buttonOptions.buttonConfigs) {
    this.topBar = new common.ui.MultiButtonBar(buttonOptions.buttonConfigs);
  } else {
    this.topBar = new common.ui.LeftRightButtonBar(buttonOptions);
  }
  this.addChild(this.topBar, null, true);
};
common.util.inherits(common.ui.TopBarScreen, common.ui.Screen);

/**
 * Changes the title of the top bar. Only works if the top bar is a TitleBar,
 * and not a MultiButtonBar or LeftRightButtonBar.
 * @param {String} title The new title.
 */
common.ui.TopBarScreen.prototype.setTitle = function(newTitle) {
  this.topBar.setTitle && this.topBar.setTitle(newTitle);
};


/**
 * @class A StateScreen extends common.ui.TopBarScreen. It always labels the
 * title bar button as 'Back', and clicking back always results
 * in a state transition.
 *
 * @param {common.ui.View} content The view to show in this screen.
 * @param {String} title The title to display above the content.
 * @param {common.games.StateManager} stateManager The state manager attached
 *   to this screen.
 * @param {common.games.State} backState The state to move back to when the
 *   user clicks the back button.
 *
 * @constructor
 */
common.ui.StateManagerScreen = function(
    content, title, stateManager, backState, rightButtonOptions) {
  var buttonOptions = {
    'leftLabel': 'Back',
    'leftHandler': function() {
      stateManager.moveTo(backState);
    }
  };

  if (rightButtonOptions) {
    buttonOptions['rightLabel'] = rightButtonOptions.rightLabel;
    buttonOptions['rightHandler'] = rightButtonOptions.rightHandler;
  }
  common.ui.TopBarScreen.call(this, content, title, buttonOptions);
};
common.util.inherits(common.ui.StateManagerScreen, common.ui.TopBarScreen);


/**
 * @class A class that manages the screens of a mobile application. Screens can
 *    be added to the manager, which pushes them into view and pushes the
 *    the current screen out of view. The manager provides a method for moving
 *    back in the sequence of screens, as well as a method to replace the
 *    content of the current screen.
 *
 * @param {Object} screenContainer The jQuery element that screens should
 *    be added to.
 * @constructor
 */
common.ui.ScreenManager = function(screenContainer) {
  this.namespace = '.' + common.ui.getUniqueNamespace();
  this.screenContainer = screenContainer;
  // Prevents clicks during a transition.
  this.clicksPrevented = false;
  this.screens = [];
};

/**
 * How many screens on the stack?
 */
common.ui.ScreenManager.prototype.getStackDepth = function() {
  return this.screens.length;
};

common.ui.ScreenManager.prototype.getCurrentScreen = function() {
  if (this.screens.length) {
    return this.screens[0];
  }
  return null;
}

/**
 * Adds a new screen to the screen manager. If this is the first screen,
 * show it immediately. Otherwise, slide out the current screen to the left,
 * and slide in the new screen from the right.
 *
 * @param {common.ui.Screen} screen The new screen to show.
 */
common.ui.ScreenManager.prototype.addScreen = function(screen) {
  var that = this;

  this.suppressClicksOnTransition(screen);

  // Gracefully handle multiple new screens added in the same instant.
  // Remember what was the 'current screen' before any new screens were added.
  if (!this.topScreenPriorToAdd) {
    this.topScreenPriorToAdd = this.screens[0];
  }

  // Keep all the new screens added at the same time in an array.
  if (!this.newScreens) {
    this.newScreens = [];
  }
  this.newScreens.push(screen);

  // If this is the nth screen, n > 1, added in the same instant, we're
  // done.
  if (this.timeoutId) {
    return;
  }

  // We have just added a new screen, with possibly others to follow.
  // Wait a second before doing anything else, so we can handle all new
  // screens at once.

  this.timeoutId = window.setTimeout(function() {
    var screenToSlideOut = that.topScreenPriorToAdd;

    var finalScreen;
    // Add all the screens to the document, from first to last.
    for (var i = 0; i < that.newScreens.length; i++) {
      var screen = that.newScreens[i];
      that.screens.unshift(screen);
      that.__displayAddedScreen(screen, i == that.newScreens.length - 1);
      if (i == that.newScreens.length - 1) {
        finalScreen = screen;
      }
    }
    // We are done with all the new screens.
    that.newScreens = null;

    // Animate the screen transition.
    // Since the new screen was just added to the document, we must wait before
    // doing the animation.
    _.defer(function() {
      if (screenToSlideOut) {
        // If we were already looking at a screen, final added screen
        // gets shifted in from the right, and old screen gets shifted out
        // to the left.
        if (common.ui.ScreenManager.audioManager) {
          common.ui.ScreenManager.audioManager.play('slide_short1');
        }
        screenToSlideOut.slideOutLeft();
        finalScreen.slideIn();
      } else {
        // If this is the first screen, fade it in.
        finalScreen.fadeIn();
      }
    });
    // The 'add' is  now resolved.
    that.topScreenPriorToAdd = null;
    that.timeoutId = 0;
  }, 0);
};

common.ui.ScreenManager.prototype.__displayAddedScreen = function(screen,
                                                                  isFinalScreen,
                                                                  onTimeout) {
  // Before adding the screen to the document, we want to initialize its
  // position on screen.
  if (!isFinalScreen) {
    // Anything but the last screen starts slid out to the left.
    screen.slideOutLeft();
  } else {
    // For the last screen, if it's the very first screen in the
    // stack, it starts faded out, else it starts slid out to the right.
    if (!this.topScreenPriorToAdd) {
      screen.fadeOut();
    } else {
      screen.slideOutRight();
    }
  }

  // Add screen to the document.
  this.screenContainer.append(screen.getWidget());
  screen.activate();
};

common.ui.ScreenManager.prototype.suppressClicksOnTransition = function(screen) {
  var that = this;

  $(screen).bind('transitionStarted' + this.namespace, function() {
    that.preventClicks();
  });
  $(screen).bind('transitionEnded' + this.namespace, function() {
    that.allowClicks();
  });
}

/**
 * Destroys the current screen and title bar and moves the previous
 * screen and title bar into view.
 */
common.ui.ScreenManager.prototype.moveBack = function() {
  var that = this;
  var currentScreen = this.screens[0];
  currentScreen.slideOutRight();
  window.setTimeout(function() {
    currentScreen.destroy();
  }, 400);

  this.screens.shift();

  if (this.screens[0]) {
    this.screens[0].slideIn();
  }

  if (common.ui.ScreenManager.audioManager) {
    common.ui.ScreenManager.audioManager.play('slide2');
  }
};

/**
 * Removes all screens other than the first, and immediately
 * jumps to the first screen with no transitions.
 */
common.ui.ScreenManager.prototype.jumpToRoot = function() {
  var that = this;
  var currentScreen = this.screens[0];
  currentScreen.fadeOut(function() {
    while(that.screens.length > 1) {
      var screen = that.screens[0];
      screen.destroy();
      that.screens.shift();
    }
    that.screens[0].hideAndFadeIn();
  });
};

/**
 * Replaces the content of the current screen with the given view.
 * @param {common.ui.Screen} newScreen The screen that should replace
 *   the current screen.
 * @param opt_callback - called when the fade out of the old screen is done.
 */
common.ui.ScreenManager.prototype.replaceCurrentScreen = function(newScreen,
    opt_callback) {
  var that = this;

  this.suppressClicksOnTransition(newScreen);

  // Store and add the new screen.  I need to do this now in case
  // this is the first in a series of adds.
  var currentScreen = this.screens[0];
  this.screens.shift();
  this.screens.unshift(newScreen);
  newScreen.fadeOut();
  this.screenContainer.append(newScreen.getWidget());

  currentScreen.fadeOut(function() {
    // Destroy the current screen
    currentScreen.destroy();

    // Show the new screen iff, after the fade out, it's still
    // the top of the stack.
    if (newScreen == that.screens[0]) {
      _.defer(function() {
        // Notify that old screen is gone.
        if (opt_callback) {
          opt_callback();
        }
        // Pause before proceeding: if the handler responds by adding more
        // screens we want that operation to trump whatever we're doing here.
        _.defer(function() {
          newScreen.fadeIn();
          newScreen.activate();
        });
      });
    }
  });
};

/**
 * A helper method added to events to prevent the event from bubbling.
 * @private
 */
common.ui.ScreenManager.prototype.stopEvent = function(e) {
  e.stopPropagation();
};

/**
 * Block all input events from bubbling by stopping it in the capture phase.
 */
common.ui.ScreenManager.prototype.preventClicks = function() {
  if (this.clicksPrevented) {
    return;
  }
  var element = document;
  element.addEventListener(window.FLAGS.start, this.stopEvent, true);
  element.addEventListener(window.FLAGS.end, this.stopEvent, true);
  element.addEventListener(window.FLAGS.click, this.stopEvent, true);
  this.clicksPrevented = true;
};

/**
 * Allow all input events by unblocking the capture phase.
 */
common.ui.ScreenManager.prototype.allowClicks = function() {
  if (!this.clicksPrevented) {
    return;
  }
  var element = document;
  element.removeEventListener(window.FLAGS.start, this.stopEvent, true);
  element.removeEventListener(window.FLAGS.end, this.stopEvent, true);
  element.removeEventListener(window.FLAGS.click, this.stopEvent, true);
  this.clicksPrevented = false;
};

var DEFAULT_BUTTON_SOUND_FILENAME = 'click1';

common.ui.setDefaultButtonSoundFilename = function(filename) {
  DEFAULT_BUTTON_SOUND_FILENAME = filename;
};

/**
 * @class An HTML button with styles for the click state and disabled state.
 *
 * @param {String|Object} textOrJQueryElement The label on the button, or the
 *     existing HTML element to use as the button. If this is a label, a new
 *     button element is created.
 * @param {Boolean|undefined} opt_options Optional dictionary of flags.
 *    Optional flags include:
 *    supportLongTouch: When present, a "touched" class is added to the button
 *        when the long touch event fires
 *    clickableWhenDisabled: When present, allows the button to be clicked
 *        even when disabled. Useful in situations where we want to show a
 *        message explaining why the button is disabled.
 *    tooltipWhenDisabled: When present, disabled button will
 *        show a tooltip when disabled.  clickableWhenDisabled subsumes this.
 *    inPlaceTouch: When present, the click handler is only called if the user
 *        does not move her finger during the touch.
 *    bindToClickEvent: On touch screen devices, force the button to bind to
 *        the 'click' event, instead of listening to different events to
 *        determine when the button is clicked. One reason to use this option
 *        is if the handler for the click needs to set focus in a text field:
 *        in the iOS browser, a text field can only be modified in response
 *        to a 'click' event, not a 'touchStart' or 'touchEnd'.
 *    soundName: If given, play this sound when the button is clicked.
 * @constructor
 */
common.ui.Button = function(
    textOrJqueryElement, opt_options) {
  var that = this;

  this.options = opt_options || {};
  this.soundName = this.options.soundName || DEFAULT_BUTTON_SOUND_FILENAME;

  this.enabled = true;

  this.namespace = '.' + common.ui.getUniqueNamespace();

  // FIXME(dbanks)
  // Remove this.
  if (textOrJqueryElement == null) {
    alert("BAD BUTTON!");
  }

  if (typeof(textOrJqueryElement) == 'string') {
    this.view = $('<button class=textButton>' + textOrJqueryElement + '</button>');
  } else {
    this.view = textOrJqueryElement;
  }

  if (this.options.classes) {
    this.view.addClass(this.options.classes);
  }

  if (!this.view) {
    devLogger.log('bad button');
  }

  this.view.bind(window.FLAGS.start + this.namespace, function(e) {
    that.view.addClass('clicked');
    if (common.ui.Button.audioManager &&
        !that.options.supportLongTouch) {
      if (that.soundName) {
        common.ui.Button.audioManager.play(that.soundName);
      }
    }
    $(document).bind(window.FLAGS.end + that.namespace, function() {
      that.unclick();
    });
  });

  if (this.options.supportLongTouch) {
    var longTouched = false;
    common.ui.longTouch(this.view, function() {
      longTouched = true;
      that.touch();
    }, this.namespace);
    this.view.bind(
        window.FLAGS.end + this.namespace + ' ' + window.FLAGS.move, function() {
      if (longTouched) { that.untouch(); }
      longTouched = false;
    });
  }
};
common.util.inherits(common.ui.Button, common.ui.View);

/**
 * Play this sound when button is clicked.
 * If sound name is null, no sound will be played.
 *
 * @param {Object} soundName
 */
common.ui.Button.prototype.setSoundName = function(soundName) {
  this.soundName = soundName;
};

/**
 * Sets the text of the button.
 * @param {String} text The new text.
 */
common.ui.Button.prototype.text = function(text) {
  this.view.text(text);
};

/**
 * Adds a class to the button.
 * @param {String} className The class name to add to the button.
 */
common.ui.Button.prototype.addClass = function(className) {
  this.view.addClass(className);
};

/**
 * Removes a class from the button.
 * @param {String} className The class name to add to the button.
 */
common.ui.Button.prototype.removeClass = function(className) {
  this.view.removeClass(className);
};

/**
 * Add css to the button.
 * @param {String} property The CSS property name.
 * @param {Object} value The CSS value.
 */
common.ui.Button.prototype.css = function(property, value) {
  this.view.css(property, value);
};

/**
 * Disables the button.
 */
common.ui.Button.prototype.disable = function() {
  this.enabled = false;
  if (!this.options.clickableWhenDisabled &&
      !this.options.tooltipWhenDisabled) {
    this.view.prop('disabled', 'true');
  }
  this.view.addClass('disabled');
};

/**
 * Enables the button.
 */
common.ui.Button.prototype.enable = function() {
  this.enabled = true;
  this.view.prop('disabled', '');
  this.view.removeClass('disabled');
};

/**
 * Calls the given handler when the button is clicked.
 * @param {Function} handler The handler to call when the button
 *     is clicked.
 */
common.ui.Button.prototype.click = function(handler) {
  var that = this;

  var clickHandler = function(args) {
     if (that.enabled ||
         that.options.clickableWhenDisabled) {
      handler(args);
    }
  };

  if (this.options.bindToClickEvent) {
    // Force the handler to run on the 'click' event.
    this.view.bind(window.FLAGS.click, handler);
  } else {
    // Choose the most responsive method for determining clicks.
    common.ui.click(this.view, clickHandler, null, this.options.inPlaceTouch);
  }
};

/**
 * Called when the user releases a click on this button.
 * The click does not have to be released within the button.
 */
common.ui.Button.prototype.unclick = function() {
  this.view.removeClass('clicked');
  $(document).unbind(this.namespace);
};

/**
 * Called when the user touches this button.
 */
common.ui.Button.prototype.touch = function() {
  this.view.addClass('touched');
};

/**
 * Called when the user ends the touch on this button.
 */
common.ui.Button.prototype.untouch = function() {
  this.view.removeClass('touched');
};

/**
 * Common button rendered with image instead of text.
 * @param {Object} opt_classes
 * @param {Object} opt_text
 * @param {Object} opt_options Options passed to the Button class.
 */
common.ui.ImageButton = function(opt_classes, opt_text, opt_options) {
  if (!opt_text) {
    opt_text = '';
  }
  if (!opt_classes) {
    opt_classes = '';
  }
  common.ui.Button.call(
      this,
      $('<button class="imageButton ' + opt_classes + '">' +
           opt_text +
        '</button>'),
      opt_options);
};
common.util.inherits(common.ui.ImageButton, common.ui.Button);


/**
 * Common button rendered with scaled text.
 * @param {String} text
 * @param {String} opt_classes
 * @param {Object} opt_options Options passed to the Button class.  Plus:
 *   scaledTextOptions if pass these in as scaled text options.
 */
common.ui.ScaledTextButton = function(text, opt_classes, opt_options) {
  common.ui.Button.call(this,
    $('<button class="textButton scaledTextParent"></button>'),
    opt_options);

  var options = opt_options || {};

  if (opt_classes) {
    this.view.addClass(opt_classes);
  }

  this.scaledText = new common.ui.ScaledText(text, options.scaledTextOptions);
  this.addChild(this.scaledText);
};
common.util.inherits(common.ui.ScaledTextButton, common.ui.ImageButton);

common.ui.ScaledTextButton.prototype.activate = function(){
  if (this.scaledText) {
    this.scaledText.activate();
  }
  if (common.ui.Button.prototype.activate) {
    common.ui.Button.prototype.activate.call(this);
  }
};


/**
 * Common button rendered with image and scaled text on top.
 * @param {Object} text
 * @param {Object} opt_classes
 * @param {Object} opt_options Options passed to the ImageButton class.  Plus:
 *   scaledTextOptions if pass these in as scaled text options.
 */
common.ui.ScaledTextImageButton = function(text, opt_classes, opt_options) {
  common.ui.ImageButton.call(this, opt_classes, '', opt_options);

  this.view.addClass('scaledTextParent');

  var options = opt_options || {};

  this.scaledText = new common.ui.ScaledText(text, options.scaledTextOptions);
  this.addChild(this.scaledText);
};
common.util.inherits(common.ui.ScaledTextImageButton, common.ui.ImageButton);

common.ui.ScaledTextImageButton.prototype.activate = function(){
  if (this.scaledText) {
    this.scaledText.activate();
  }
  if (common.ui.ImageButton.prototype.activate) {
    common.ui.ImageButton.prototype.activate.call(this);
  }
};

/**
 * A view the displays a css-styled checkbox with a label. Uses a native
 * checkbox to keep track of the state.
 */
common.ui.Checkbox = function(opt_label) {
  var that = this;
  var id = this.getNamespace();
  var namespace = '.' + id;
  var labelClause = '';
  if (opt_label) {
    labelClause = '<label for="' + id + '">' + opt_label + '</label>';
  }
  this.view = $(
    '<div class=checkbox>' +
      labelClause +
      '<div class=box></div>' +
      '<div class=checkmark>&#x2713;</div>' +
      '<input id="' + id + '" type=checkbox>' +
    '</div>');
  this.$input = this.view.find('#' + id);
  this.$box = this.view.find('.box');

  this.enabled = true;

  // Called when the styled checkbox is clicked. The styled checkbox does
  // not update automatically, so we toggle the state and set the native
  // checkbox.
  common.ui.click(this.$box, function() {
    that.toggleWithEvent();
  });

  this.$box.bind(window.FLAGS.start + namespace, function() {
    that.view.addClass('clicked');
    $(document).bind(window.FLAGS.end + namespace, function() {
      that.view.removeClass('clicked');
      $(document).unbind(namespace);
    });
  });

  // Called when the native checkbox is clicked. Native checkbox
  // state is already updated, so we use the checked value directly.
  this.$input.change(function() {
    var checked = that.get();
    that.updateStyledCheckbox(checked);
    $(that).triggerHandler('checkboxChanged', [checked]);
  });
};
common.util.inherits(common.ui.Checkbox, common.ui.View);

/**
 * @return {Boolean} True if the checkbox is checked.
 */
common.ui.Checkbox.prototype.setEnabled = function(enabled) {
  if (this.enabled == enabled) {
    return;
  }
  this.enabled = enabled;
  if (this.enabled) {
    this.view.removeClass('disabled');
  } else {
    this.view.addClass('disabled');
  }
};

  /**
   * Flip the state and generate an event that things flipped.
   */
common.ui.Checkbox.prototype.toggleWithEvent = function() {
  if (this.enabled ) {
    var checked = !this.get();
    this.set(checked);
    $(this).triggerHandler('checkboxChanged', [checked]);
  }
};


/**
 * @return {Boolean} True if the checkbox is checked.
 */
common.ui.Checkbox.prototype.get = function() {
  return this.$input.prop('checked');
};

/**
 * @param {Boolean} checked Whether the checkbox should be checked.
 */
common.ui.Checkbox.prototype.set = function(checked) {
  this.$input.prop('checked', checked);
  this.updateStyledCheckbox(checked);
};

common.ui.Checkbox.prototype.updateStyledCheckbox = function(checked) {
  if (checked) {
    this.view.addClass('checked');
  } else {
    this.view.removeClass('checked');
  }
};


/**
 * A view that displays a labeled checkbox. The checkbox is bound
 * to a boolean setting in a GameSettings object. On iOS devices,
 * the checkbox renders as a switch.
 * @param {common.GameSettings} settings The GameSettings object.
 * @param {String} settingName The name of the setting reflected by
 *   this checkbox.
 * @param {String} opt_label Optional parameter specifying the label
 *   next to the checkbox. If not provided, settingName is used as the
 *   label.
 */
common.ui.SettingCheckbox = function(settings, settingName, opt_label) {
  var that = this;
  this.settings = settings;
  this.settingName = settingName;
  var label = opt_label || settingName;
  common.ui.Checkbox.call(this, label);

  $(this).bind('checkboxChanged', function(e, checked) {
    settings.set(settingName, checked);
  });

  $(settings).bind('settingChanged', function(e, setting, value) {
    if (setting == settingName) {
      that.render();
    }
  });
  this.render();
};
common.util.inherits(common.ui.SettingCheckbox, common.ui.Checkbox);

/**
 * Sets the checkbox to reflect the value of the setting.
 */
common.ui.SettingCheckbox.prototype.render = function() {
  var currentlyChecked = this.get();
  var newSetting = this.settings.get(this.settingName) ? 1 : 0;
  if (newSetting != currentlyChecked) {
    this.set(newSetting);
  }
};


/**
 * @class A View that displays the given content in a touch screen
 * scroll container.
 *
 * @param {Object} content The content to display in the scroll container.
 * @param {String|undefined} opt_containerClassName An optional class name
 *    assigned to the div that will hold the content. Used for styling
 *    the content & padding at the end of the content.
 * @param {String|undefined} opt_wrapperClassName An optional class name
 *    assigned to the div that will wrap the scroll container. Used for styling
 *    the content.
 * @constructor
 */
common.ui.ScrollContainer = function(
    content, opt_containerClassName, opt_wrapperClassName) {
  this.content = content;
  this.namespace = common.ui.getUniqueNamespace();
  this.scroll = null;
  this.scrollOptions = {
    hScrollBar: false,
    vScrollBar: true,
    desktopCompatibility: true,
  };
  this.id = 'scrollContainer-' + this.namespace;
  this.view = $('<div class=scrollWrapper><div id=' + this.id + '>' +
    '<div class=padding></div></div></div>');
  this.scrollContainer = this.view.find('#' + this.id);
  if (opt_containerClassName) {
    this.scrollContainer.addClass(opt_containerClassName);
  }
  if (opt_wrapperClassName) {
    this.view.addClass(opt_wrapperClassName);
  }
  this.addChild(this.content, this.scrollContainer, true);
};
common.util.inherits(common.ui.ScrollContainer, common.ui.View);

/**
 * Reset the scroll container's content.
 */
common.ui.ScrollContainer.prototype.reset = function() {
  if (this.content.reset) { this.content.reset(); }
};

/**
 * Refreshes iScroll.
 */
common.ui.ScrollContainer.prototype.refresh = function() {
  if (this.scroll) {
    this.scroll.refresh();
  }
};

/**
 * Activate the scrolling UI.
 */
common.ui.ScrollContainer.prototype.activate = function() {
  if (FLAGS.useiScroll) {
    this.scroll = new window.iScroll(this.id, this.scrollOptions);
    this.view.addClass('useIScroll');
  } else {
    this.view.addClass('desktopScroll');
  }
};

/**
 * Destroy the scrolling UI and the View.
 */
common.ui.ScrollContainer.prototype.destroy = function() {
  this.scroll && this.scroll.destroy();
  common.ui.View.prototype.destroy.call(this);
};


/**
 * @class A View that displays a list of items in a touch screen
 *    scrolling container.
 *
 * TODO(adam): This should inherit from scroll container.
 *
 * @param {Array} items The views to display in the list.
 * @param {String|undefined} opt_containerClassName An optional class name
 *    assigned to the div that will hold the content. Used for styling
 *    the content & padding at the end of the content.
 * @param {String|undefined} opt_wrapperClassName An optional class name
 *    assigned to the div that will wrap the scroll container. Used for styling
 *    the content.
 * @constructor
 */
common.ui.ScrollList = function(
    items, opt_containerClassName, opt_wrapperClassName) {
  var that = this;
  this.namespace = common.ui.getUniqueNamespace();
  this.items = [];
  this.scroll = null;
  this.scrollOptions = {
    hScrollBar: false,
    vScrollBar: true,
    desktopCompatibility: true,
  };
  this.id = 'scrollList-' + this.namespace;
  this.view = $('<div class=scrollWrapper><div id=' + this.id + '>' +
      '<div class=items></div><div class=padding></div>' +
    '</div></div>');
  this.scrollContainer = this.view.find('#' + this.id);
  this.itemContainer = this.view.find('.items');
  this.padding = this.view.find('.padding');
  if (opt_containerClassName) {
    this.scrollContainer.addClass(opt_containerClassName);
  }
  if (opt_wrapperClassName) {
    this.view.addClass(opt_wrapperClassName);
  }
  if (items) {
    this.addItems(items);
  }
};
common.util.inherits(common.ui.ScrollList, common.ui.View);

/**
 * Add an item to the end of the scroll list.
 * @param {Object} item the view to add to the scroll list.
 */
common.ui.ScrollList.prototype.appendItem = function(item) {
  this.items.push(item);
  this.itemContainer.append(item.getWidget());
};

/**
 * Add an item to the beginning of the scroll list.
 * @param {Object} item the view to add to the scroll list.
 */
common.ui.ScrollList.prototype.prependItem = function(item) {
  this.items.unshift(item);
  this.itemContainer.prepend(item.getWidget());
};


/**
 * Add an array of items to the end of the scroll list.
 * @param {Object} items The views to append to the end of the scroll list.
 */
common.ui.ScrollList.prototype.addItems = function(items) {
  for (var i = 0, item; item = items[i++];) {
    this.appendItem(item);
  }
};

/**
 * If item is given, remove it from scroll list.
 * Else remove last item in the list.
 *
 * @param {Object} opt_item
 */
common.ui.ScrollList.prototype.removeItem = function(opt_item) {
  if (opt_item) {
    if (common.util.removeFromArray(opt_item, this.items)) {
      opt_item.destroy();
    }
  } else {
    var item = this.items.pop();
    item.destroy();
  }
};

/**
 * Remove all items from this scroll list.
 */
common.ui.ScrollList.prototype.removeAllItems = function() {
  while (this.items.length > 0) {
    this.removeItem();
  }
};


/**
 * Move the scroll region so that the given ypos is at the top of the region.
 *
 * @param {Object} yPos
 * @param {Object} handler
 * @param {Object} msec - Scroll occurs over this amount of time.
 */
common.ui.ScrollList.prototype.scrollTop = function(yPos, handler, msec) {
  if (FLAGS.useiScroll) {
    this.scroll.scrollTo(0, -yPos, msec);
  } else {
    this.view.animate({
      scrollTop: yPos
    }, msec);
  }
  window.setTimeout(handler, msec);
};

common.ui.ScrollList.prototype.scrollBottom = function(handler, msec) {
  // Scroll so that the bottom-most item is showing.
  var contentHeight = this.itemContainer.height();
  var containerHeight = this.view.height();
  if (contentHeight < containerHeight) {
    handler();
    return;
  }
  var amountOffscreen = contentHeight - containerHeight;
  this.scrollTop(amountOffscreen, handler, msec);
};

/**
 * Activate the scrolling UI.
 */
common.ui.ScrollList.prototype.activate = function() {
  if (FLAGS.useiScroll) {
    this.scroll = new window.iScroll(this.id, this.scrollOptions);
  } else {
    this.view.addClass('desktopScroll');
  }
};

/**
 * Refresh the scrollbar.  Some implementations don't need this, but others
 * require this any time contents change.
 *
 * So generally always call this after adding/removing/resizing an element.
 */
common.ui.ScrollList.prototype.refresh = function(){
  var that = this;
  if (FLAGS.useiScroll && this.scroll) {
    window.setTimeout(function(){
      that.scroll.refresh();
    });
  }
};

/**
 * Tweak whether or not scroll list does the standard apple 'bounce' thing.
 * @param {Object} enabled
 */
common.ui.ScrollList.prototype.setBounceEnabled = function(enabled) {
  this.scrollOptions.bounce = enabled;
};

/**
 * Destroy all items added to the scroll list. Also destroy the
 * scrolling UI and the view itself.
 */
common.ui.ScrollList.prototype.destroy = function() {
  for (var i = 0, item; item = this.items[i++];) {
    item.destroy();
  }
  this.scroll && this.scroll.destroy();
  common.ui.View.prototype.destroy.call(this);
};


/**
 * @class A View that displays a list of items in a touch screen
 *    scrolling container. Unlike with ScrollContainer, the items
 *    are not provided up front. Instead, items are loaded
 *    through a loader callback when the user reaches the end of the list.
 *
 * @param {Function} loadHandler The function to call to load more data.
 *    The function takes the index of the last current item,
 *    the max number of elements to load, and an end handler to call when the
 *    data is loaded. The end handler takes the loaded items, and an optional
 *    parameter indicating that no more data will be loaded.
 * @param {Number} The number of items to load with each call to the loader.
 * @param {String|undefined} opt_containerClassName An optional class name
 *    assigned to the div that will hold the content. Used for styling
 *    the content & padding at the end of the content.
 * @param {String|undefined} opt_wrapperClassName An optional class name
 *    assigned to the div that will wrap the scroll container. Used for styling
 *    the content.
 *
 * @constructor
 */
common.ui.DynamicScrollList = function(
    loadHandler, numItemsToLoad,
    opt_containerClassName, opt_wrapperClassName) {
  common.ui.ScrollList.call(
      this, [], opt_containerClassName, opt_wrapperClassName);
  this.loadHandler = loadHandler;
  this.numItemsToLoad = numItemsToLoad;
  this.loadedAllItems = false;
  this.scrollRegExp = new RegExp(/(-?\d+)\)$/);
  this.scrollOptions.checkDOMChanges = true;
  this.$loadMore = $('<div class=loadMore></div>');
  this.scrollContainer.append(this.$loadMore);
  this.load();
};
common.util.inherits(common.ui.DynamicScrollList, common.ui.ScrollList);

/**
 * Load the next set of items, add them to the list when they load.
 */
common.ui.DynamicScrollList.prototype.load = function() {
  var that = this;
  this.loadHandler(this.items.length, this.numItemsToLoad, function(
      items, opt_end) {
    for (var i = 0, item; item = items[i++];) {
      that.appendItem(item);
    }
    if (opt_end || items.length < that.numItemsToLoad) {
      that.loadedAllItems = true;
      that.$loadMore.addClass('loadedAll');
    }
  });
};

/**
 * Reset the dynamic scroll list: drop everything in there,
 * get the first handful again.
 */
common.ui.DynamicScrollList.prototype.reload = function() {
  this.removeAllItems();
  this.loadedAllItems = false;
  this.load();
};

/**
 * Activate the scrolling UI, call load when the user scrolls to the bottom.
 */
common.ui.DynamicScrollList.prototype.activate = function() {
  var that = this;
  common.ui.ScrollList.prototype.activate.call(this);
  if (this.scroll) {
    // Detect when the end of the scroll area is exposed.
    // This branch deals with touch screen devices.
    this.scroll.onScrollEnd = function() {
      var scroll = that.scroll;
      var scrollCss = $(scroll.element).css(PREFIX + 'transform');
      var scrollY = that.scrollRegExp.exec(scrollCss);
      if (scrollY && scrollY[1] <= scroll.maxScrollY + 50) {
        if (!that.loadedAllItems) { that.load(); }
      }
    };
  } else {
    // Detect when the end of the scroll area is exposed.
    // This branch deals with desktop scrolling.
    this.view.scroll(function(e) {
      var scrollBottom = that.view.scrollTop() + that.view.height();
      if (scrollBottom + 1 >= that.scrollContainer.height()) {
        if (!that.loadedAllItems) {
          that.load();
        }
      }
    });
  }
};

/**
 * @class A timer that triggers events on a regular heartbeat up
 *    to a a certain time limit.
 *
 * @param {Number} totalMs How long the timer should run, in milliseconds.
 * @param {Number} opt_eventIntervalMs How often during its run
 *    the timer should trigger the 'timerInterval' event.  If undefined/0,
 *    we fire one event when the total time is up.
 *
 * @constructor
 */
common.ui.Timer = function(totalMs, opt_eventIntervalMs) {
  this.totalMs = totalMs;
  // If bad/missing interval, set up a timer that just triggers
  // at the end of its run.
  if (opt_eventIntervalMs) {
    this.eventIntervalMs = opt_eventIntervalMs;
  } else {
    this.eventIntervalMs = totalMs;
  }
  this.elapsed = 0;
  this.paused = true;
};

/**
 * Starts the timer running in intervals, trigger timerInterval
 * at every step.
 */
common.ui.Timer.prototype.start = function() {
  var that = this;

  // Calling start() on an unpaused timer does nothing.
  if (!this.paused) {
    return;
  }
  this.paused = false;

  this.intervalId = window.setInterval(function () {
    that.elapsed += that.eventIntervalMs;
    // Do we need any more intervals?
    if (that.elapsed >= that.totalMs || that.paused) {
       window.clearInterval(that.intervalId);
    }
    if (that.elapsed <= that.totalMs) {
      $(that).triggerHandler('timerInterval');
    }
  },
  this.eventIntervalMs);
};

/**
 * Pauses the timer.
 */
common.ui.Timer.prototype.pause = function() {
   this.paused = true;
};

/**
 * @return The time remaining on the timer.
 */
common.ui.Timer.prototype.timeRemaining = function() {
   return (this.totalMs - this.elapsed);
};

/**
 * @return The time elapsed on the timer.
 */
common.ui.Timer.prototype.timeElapsed = function() {
  return this.elapsed;
};

/**
 * @return The number of intervals the timer will fire.
 */
common.ui.Timer.prototype.getNumIntervals = function() {
  return this.totalMs / this.eventIntervalMs;
};


/**
 * A view that shows a progress bar. The progress bar can be moved to a new
 * percentage, and will animate between the current percentage and the new one.
 * @param {Number|undefined} opt_startPercent The percentage that the progress
 *     bar starts out at, between 0 and 100.
 * @param {Integer} opt_numBars Defaults to 1.  There can be more than one bar.
 *   Bar n has class bn.
 *   Bar n is in front of bar n+1, z-order wise.
 *
 * @constructor
 */
common.ui.ProgressBar = function(opt_startPercent, opt_vertical, opt_numBars) {
  this.vertical = opt_vertical;

  this.view = $('<div class=progressBar></div>');
  var $boxContainer = $('<div class=boxContainer></div>');
  this.view.append($boxContainer);

  var numBars = opt_numBars || 1;
  if (numBars < 1) {
    numBars = 1;
  }
  this.$bars = [];
  for (var i = 0; i < numBars; i++) {
    var $bar = $('<div class="bar b' + i + '"></div>');
    $bar.css({
      "z-index": numBars-i,
    });
    $boxContainer.append($bar);
    this.$bars.push($bar);
  }

  if (opt_vertical) {
    this.view.addClass('vertical');
  }
  else {
    this.view.addClass('horizontal');
  }
  if (opt_startPercent) {
    this.moveTo(opt_startPercent);
  }
};
common.util.inherits(common.ui.ProgressBar, common.ui.View);

common.ui.ProgressBar.prototype.addBarClass = function(classes, opt_index) {
  var index = opt_index || 0;
  this.$bars[index].addClass(classes);
};

common.ui.ProgressBar.prototype.setBarColor = function(color, opt_index) {
  var index = opt_index || 0;
  this.$bars[index].css({
    'background-color': color
  });
};


/**
 * Animate the progress bar to the new percentage.
 * @param {Number} percent The new percentage, between 0 and 100.
 * @param {Integer} opt_index Which bar to move.
 */
common.ui.ProgressBar.prototype.moveTo = function(percent, opt_index) {
  var coords;
  var index = opt_index || 0;
  if (percent == 0) {
    this.$bars[index].hide();
  } else {
    this.$bars[index].show();
    if (this.vertical) {
      this.$bars[index].height(percent + '%')
    } else {
      this.$bars[index].width(percent + '%')
    }
  }
};

/**
 * Set the duration of the animation to move the progress bar. Overrides
 * any settings in the CSS.
 * @param {Number} durationMs Animation duration in milliseconds.
 */
common.ui.ProgressBar.prototype.setMoveDuration = function(durationMs) {
  this.$bar.css(PREFIX + 'transition-duration', durationMs + 'ms');
};


/**
 * A progress bar view that reflects the elapsed time on a timer.
 * @param {common.ui.Timer} The timer object.
 * @constructor
 */
common.ui.TimerProgressBar = function(timer) {
  var that = this;
  common.ui.ProgressBar.call(this);
  this.view.addClass('timerProgressBar');
  this.$bar.css(
      PREFIX + 'transition-duration', timer.eventIntervalMs + 'ms');
  this.bindToObject(timer, 'timerInterval', function() {
    var percent = 100 * (1 - (timer.timeRemaining() / timer.totalMs));
    that.moveTo(percent);
  });
};
common.util.inherits(common.ui.TimerProgressBar, common.ui.ProgressBar);


/**
 * A View that appears at the bottom of the screen and shows a row of buttons.
 * One button is selected at a time and reflects the content shown in the rest
 * of the screen.
 * @constructor
 */
common.ui.TabBar = function() {
  this.view = $('<div class=tabBar></div>');
  this.buttons = [];
  this.toggledButton = null;
};
common.util.inherits(common.ui.TabBar, common.ui.View);

/**
 * Adds the given tab button to the tab bar.
 * @param {common.ui.TabButton} button
 */
common.ui.TabBar.prototype.addButton = function(button) {
  var that = this;
  $(button.view).bind(FLAGS.start, function() {
    that.toggleButton(button);
  });
  this.buttons.push(button);
  this.addChild(button);
};

/**
 * @return {String} The id of the toggled button, or null if
 *   no button is selected.
 */
common.ui.TabBar.prototype.getToggledButtonId = function() {
  return this.toggledButton ? this.toggledButton.buttonId : null;
};

/**
 * Toggles the given button, untoggles any currently toggled button.
 * A 'toggled' event is triggered, with the id of the toggled button.
 */
common.ui.TabBar.prototype.toggleButton = function(button) {
  if (this.toggledButton == button) {
    return;
  }
  if (this.toggledButton) {
    this.toggledButton.untoggle();
  }
  if (button) {
    this.toggledButton = button;
    this.toggledButton.toggle();
    $(this).triggerHandler('toggled', [this.toggledButton.buttonId]);
  }
};

/**
 * Make all buttons available.
 */
common.ui.TabBar.prototype.enableAll = function() {
  _.each(this.buttons, function(button) {
    button.enable();
  })
};

/**
 * Make all buttons unavailable.
 */
common.ui.TabBar.prototype.disableAll = function() {
  _.each(this.buttons, function(button) {
    button.disable();
  });
};


/**
 * A button used in a Tab Bar. Has methods to toggle and untoggle.
 * Dummy view, all the logic is handled in TabBar.
 */
common.ui.TabButton = function(label, buttonId) {
  common.ui.Button.call(this, label);
  this.addClass('tabButton');
  this.buttonId = buttonId;
};
common.util.inherits(common.ui.TabButton, common.ui.Button);

/**
 * Toggles the button.
 */
common.ui.TabButton.prototype.toggle = function() {
  this.view.addClass('toggled');
};

/**
 * Untoggles the button.
 */
common.ui.TabButton.prototype.untoggle = function() {
  this.view.removeClass('toggled');
};


/**
 * A View that shows a progress bar reflecting how many resources
 * have been preloaded.
 * @param {common.util.ResourceLoader} preloader The loader used to load
 *   resources.
 * @param opt_minTime {Number|undefined} The minimum time that the loading
 *   screen should appear for, in case the preloader finishes preloading
 *   resources too quickly.
 * @constructor
 */
common.ui.LoadingScreen = function(preloader, opt_minTime) {
  var that = this;
  this.minTime = opt_minTime || 400;
  this.view = $(
    '<div class="loadingScreen valignContainer">' +
      '<div class="valignContent"></div>' +
    '</div>');
  this.$content = this.view.find('.valignContent');

  this.progressBar = new common.ui.ProgressBar();
  this.addChild(this.progressBar, this.$content);

  $(preloader).bind('startingPreload', function() {
    that.startTime = new Date();
  });

  $(preloader).bind('progress', function(e, percent) {
    that.progressBar.moveTo(percent);
  });
};
common.util.inherits(common.ui.LoadingScreen, common.ui.View);

/**
 * Fades out the loading screen.
 * @param {Function} handler The function to call when the loading screen
 *   finishes fading out.
 */
common.ui.LoadingScreen.prototype.fadeOut = function(handler) {
  var that = this;
  var fade = function() {
    that.view.addClass('fadeOut');
    that.view.bind(TRANSITION_END, function(e) {
      handler();
    });
  };

  var currentTime = new Date();
  var elapsedTime = currentTime.getTime() - this.startTime.getTime();
  if (elapsedTime >= this.minTime) {
    fade();
  } else {
    window.setTimeout(fade, this.minTime - elapsedTime);
  }
};

/**
 * A class to show views overlayed on top of another UI. Unlike the
 * MessageManager, PopUpManager does not queue up views; it enforces
 * showing only one view at a time. Popup views are registered with
 * the manager and are assigned ids. A popup can then be shown by calling
 * showPopup() with the id. If a popup is already showing, a call to
 * showPopup() will not result in an action. Popups are hidden by calling
 * hideCurrentPopup().
 * @constructor
 */
common.ui.PopupManager = function() {
  this.currentPopupId = null;
  this.popupViews = {};
  this.popupWrappers = {};
  this.view = $('<div class=popupManager></div>');
  this.view.addClass('hidden');
};
common.util.inherits(common.ui.PopupManager, common.ui.View);

/**
 * @param {common.ui.View} popupView The view to add as a popup to
 * @param {undefined|Boolean} opt_noCenter Whether the popup should be
 *   aligned to the top of the viewport, instead of centered vertically.
 * this manager.
 * @return {Number} the popup id.
 */
common.ui.PopupManager.prototype.registerPopup = function(
    popupView, opt_noCenter) {
  var that = this;
  var popupId = common.ui.getUniqueNamespace();
  var $wrapper = $('<div class=wrapper id="' + popupId + '"></div>');
  if (opt_noCenter) {
    // Show the popup at the top of the area, this leaves room for the
    // onsceen keyboard.
    $wrapper.append(popupView.getWidget());
  } else {
    // Center the popup in the middle of the area.
    $wrapper.addClass('valignContainer');
    var $content = $('<div class=valignContent></div>');
    $wrapper.append($content);
    $content.append(popupView.getWidget());
  }

  this.popupViews[popupId] = popupView;
  this.popupWrappers[popupId] = $wrapper;

  this.view.append($wrapper);
  return popupId;
};

/**
 * Show the given view as a popup, if no popup is currently showing.
 * @param {Number} popupId The id of the popup view to show.
 */
common.ui.PopupManager.prototype.showPopup = function(popupId) {
  if (this.currentPopupId !== null) {
    return;
  }
  var view = this.popupViews[popupId];
  var $wrapper = this.popupWrappers[popupId];
  if (view && $wrapper) {
    view.reset && view.reset();
    this.currentPopupId = popupId;
    $wrapper.addClass('showing');
    this.view.removeClass('hidden');
    $(this).triggerHandler('showingPopup');
  }
};

/**
 * Is this the current popup?
 *
 * @param {Number} popupId
 */
common.ui.PopupManager.prototype.isCurrentPopup = function(popupId) {
  return this.currentPopupId == popupId;
};

/**
 * Hides the current popup, if one is showing.
 */
common.ui.PopupManager.prototype.hideCurrentPopup = function() {
  if (this.currentPopupId === null) { return; }
  var $wrapper = this.popupWrappers[this.currentPopupId];
  if ($wrapper) {
    this.view.addClass('hidden');
    $wrapper.removeClass('showing');
    this.currentPopupId = null;
    $(this).triggerHandler('hidingPopup');
  }
};

/**
 * Hide the current popop iff it's the given popup.
 * @param {Number} popupId
 */
common.ui.PopupManager.prototype.hidePopupIfCurrent = function(popupId) {
  if (this.currentPopupId == popupId) {
    this.hideCurrentPopup();
  }
};

/**
 * Removes popups.
 * If given a list, remove those popups. Gracefully handles nulls in the list.
 * Else remove all.
 *
 * @param {Object} opt_popupIds
 */
common.ui.PopupManager.prototype.removePopups = function(opt_popupIds) {
  if (opt_popupIds) {
    for (var i = 0; i < opt_popupIds.length; i++) {
      var id = opt_popupIds[i];
      if (!id) {
        continue;
      }
      if (this.popupViews[id]) {
        this.popupViews[id].destroy();
        delete this.popupViews[id];
      }
      if (this.popupWrappers[id]) {
        this.popupWrappers[id].remove();
        delete this.popupWrappers[id];
      }
    }
  } else {
    for (var id in this.popupViews) {
      this.popupViews[id].destroy();
      this.popupWrappers[id].remove();
    }
    this.popupViews = {};
    this.popupWrappers = {};
    this.currentPopupId = null;
    this.view.addClass('hidden');
  }
};

/**
 * Destroys the view and all popup views added to this manager.
 */
common.ui.PopupManager.prototype.destroy = function() {
  this.removePopups();
  common.ui.View.prototype.destroy.call(this);
};


/**
 * Thin wrapper around a view, that gives subclasses the "popup" class.
 * Used to implement a common look & feel for all popups.
 * @constructor
 */
common.ui.Popup = function() {
  this.view = $('<div class=popup></div>');
};
common.util.inherits(common.ui.Popup, common.ui.View);

/**
 * Shared code for popups that do some kind of text input/submission.
 * You don't instantiate an instance of this, you derive from it to handle some
 * common work.
 *
 * @param {String} description the description to display above the text field.
 * @param {undefined|Object} opt_options Dictionary of options.  May include:
 *   saveString - put this string on the 'yes' button.
 *   cancelString - put this string on the 'no' button.
 */
common.ui.BaseTextInputPopup = function(description, opt_options){
  common.ui.Popup.call(this);

  var options = opt_options || {};

  var that = this;
  this.ignoreBlurs = false;
  this.resetting = false;

  this.view.append($('<h2 class=description>' + description + '</h2>'));

  this.$inputFields = $('<div class=inputFields></div>');
  this.view.append(this.$inputFields);

  this.addCancelSubmitButtons(opt_options);
};
common.util.inherits(common.ui.BaseTextInputPopup, common.ui.Popup);

/**
 * Add buttons to kill the whole thing or to submit the input.
 *
 * @param {undefined|Object} opt_options Dictionary of options.  May include:
 *   email - if true, format the input widget as an email widget.
 *   autocapitalize - first letter of each word will be capitalized.  Only works on iOS
 */
common.ui.BaseTextInputPopup.prototype.addCancelSubmitButtons = function(
    opt_options) {
  var that = this;
  var options = opt_options || {};

  var $buttonContainer = $('<div class=buttonContainer></div>');

  // Don't submit text when the user hits the cancel button.
  var cancelString = options.cancelString || STRINGS.CANCEL;
  var cancelButton = new common.ui.Button(cancelString);
  cancelButton.addClass('cancel');
  cancelButton.click(function() {
    that.ignoreBlurs = true;
    that.blurInputFields();
    $(that).triggerHandler('canceled');
  });

  // Submit text when user hits enter button.
  var saveString = options.saveString || STRINGS.SAVE;
  var enterButton = new common.ui.Button(saveString);
  enterButton.addClass('save');
  enterButton.click(function() {
    that.blurAndSubmit();
  });

  this.view.append($buttonContainer);
  this.addChild(cancelButton, $buttonContainer);
  this.addChild(enterButton, $buttonContainer);
};

/**
 * Set focus on primary input field.  Override this.
 */
common.ui.BaseTextInputPopup.prototype.setFocus = function() {
  // This should be overridden.
};

/**
 * Blur all input fields.  Override this.
 */
common.ui.BaseTextInputPopup.prototype.blurInputFields = function() {
  // This should be overridden.
};

/**
 * Submit user data.  Override this.
 */
common.ui.BaseTextInputPopup.prototype.submit = function() {
  // This should be overridden.
};

/**
 * Initialize all input fields.  Override.
 */
common.ui.BaseTextInputPopup.prototype.initializeInput = function() {
  // This should be overridden.
};

/**
 * Initialize all input fields.  Override.
 */
common.ui.BaseTextInputPopup.prototype.blurAndSubmit = function() {
  this.ignoreBlurs = true;
  this.blurInputFields();
  this.submit();
};

/**
 * Add an input field to this popup.
 *
 * @param {undefined|Object} opt_options Dictionary of options.  May include:
 *   cssClass - add this class to widget.
 *   inputType - input type of widget.
 *   id - id for widget.
 *   returnHandler - what happens when user hits enter.  Default is to submit.
 */
common.ui.BaseTextInputPopup.prototype.addInputField = function(opt_options) {
  var that = this;

  var options = opt_options || {};

  var $input = $('<input>');
  if (options.inputType) {
    $input.attr('type', options.inputType);
  }
  if (options.cssClass) {
    $input.addClass(options.cssClass);
  }
  if (options.id) {
    $input.attr('id', options.id);
  }
  if (options.maxLength) {
    $input.attr('maxlength', options.maxLength);
  }

  var returnHandler = function() {
    if (options.returnHandler) {
      options.returnHandler();
    } else {
      that.blurAndSubmit();
    }
  }

  if (window.FLAGS.touchScreen) {
    // Turn off iOS typing features which would get in the way for
    // text field input. jQuery does not support settings these attributes
    // using attr(), so we access the native DOM element directly.
    if (options.autocapitalize) {
      $input[0].setAttribute('autocapitalize', 'on');
    } else {
      $input[0].setAttribute('autocapitalize', 'off');
    }
    $input[0].setAttribute('autocorrect', 'off');
    $input[0].setAttribute('autocomplete', 'off');

    // On an iOS device, the input field gets blurred in one of two ways:
    // the user presses cancel or save, or the user hits the "done" button
    // on the on-screen keyboard. In the latter case, we treat this action
    // as though the user has pressed "Save".
    $input.blur(function() {
      if (!that.ignoreBlurs) {
        returnHandler();
      }
    });

    // On an iOS device, the input field may get focused when the user hits
    // next/previous on the on-screen keyboard. In this case, we want to
    // trigger an event in case we need to show or hide part of the UI
    // when this happens.
    $input.focus(function() {
      if (that.resetting) {
        that.resetting = false;
      } else {
        $(that).triggerHandler('focused');
      }
    });
  }


  // Submit when user hits enter on keyboard.
  $input.keypress(function(e) {
    if (e.keyCode == 13) {
      returnHandler();
    }
  });

  this.$inputFields.append($input);

  return $input;
}


/**
 * Clears and focuses the input field.
 */
common.ui.BaseTextInputPopup.prototype.reset = function() {
  var that = this;

  this.resetting = true;
  this.ignoreBlurs = false;
  this.setFocus();
  window.setTimeout(function() {
    that.initializeInput();
  }, 0);
};

/**
 * A View that allows the user to enter text into an input field. This
 * view is designed to be used as a popup.
 * @param {String} description the description to display above the text field.
 * @param {undefined|Object} opt_options Dictionary of options.  May include:
 *   email - if true, format the input widget as an email widget.
 *   saveString - put this string on the 'yes' button.
 *   cancelString - put this string on the 'no' button.
 *   autocapitalize - first letter of each word will be capitalized.  Only works on iOS
 *   maxLength - max length of input string.
 */
common.ui.TextInputPopup = function(description, opt_options) {
  common.ui.BaseTextInputPopup.call(this, description, opt_options);

  this.view.addClass('textInputPopup');

  var options = opt_options || {};

  options.inputType = options.email ? 'email' : 'text';

  this.$input = this.addInputField(options)

  this.reset();
};
common.util.inherits(common.ui.TextInputPopup, common.ui.BaseTextInputPopup);

common.ui.TextInputPopup.prototype.submit = function() {
  this.ignoreBlurs = true;
  this.blurInputFields();
  var text = this.$input.val();
  $(this).triggerHandler('textEntered', text);
};

common.ui.TextInputPopup.prototype.setFocus = function() {
  this.$input.focus();
};

common.ui.TextInputPopup.prototype.blurInputFields = function() {
  this.$input.blur();
};

common.ui.TextInputPopup.prototype.initializeInput = function() {
  this.$input.val(null);
};


/**
 * Standard login popup.
 * @param {String} description the description to display above the text fields.
 * @param {undefined|Object} opt_options Dictionary of options.  May include:
 *   saveString - put this string on the 'yes' button.
 *   cancelString - put this string on the 'no' button.
 */
common.ui.LoginPopup = function(description, opt_options) {
  var that = this;

  common.ui.BaseTextInputPopup.call(this, description, opt_options);

  this.view.addClass('loginPopup textInputPopup');

  var options = opt_options || {};

  var usernameOptions = {
    inputType: 'text',
    id: 'username',
    cssClass: 'username',
    returnHandler: function() {
      that.$passwordInput.focus();
    },
  };

  this.$inputFields.append($('<label for="username">Username:</label>'));
  this.$usernameInput =  this.addInputField(usernameOptions);

  var passwordOptions = {
    inputType: 'password',
    id: 'password',
    cssClass: 'password',
  };

  this.$inputFields.append($('<label for="password">Password:</label>'));
  this.$passwordInput =  this.addInputField(passwordOptions);

  this.reset();
};
common.util.inherits(common.ui.LoginPopup, common.ui.BaseTextInputPopup);

/**
 * Triggers a 'loginEntered' handler, with the contents of
 * the text fields as the arguments.
 */
common.ui.LoginPopup.prototype.submit = function() {
  var username = this.$usernameInput.val();
  var password = this.$passwordInput.val();
  $(this).triggerHandler('loginEntered', [username, password]);
};

common.ui.LoginPopup.prototype.setFocus = function() {
  this.$usernameInput.focus();
};

common.ui.LoginPopup.prototype.blurInputFields = function() {
  this.$usernameInput.blur();
  this.$passwordInput.blur();
};

common.ui.LoginPopup.prototype.initializeInput = function() {
  this.$usernameInput.val(null);
  this.$passwordInput.val(null);
};


/**
 * A widget that spans the entire screen.  Holds menus, kills UI events to anything
 * but the menu.  Positions menus relative to parent button.
 */
common.ui.MenuContainer = function(workspace) {
  var that = this;

  this.view = $('<div class=menuContainer></div>');
  $(this.getWidget()).bind(window.FLAGS.start, function(e) {
    // If we have a menu, close it.
    if (that.currentMenu) {
      that.hideMenu(that.currentMenu);
    }
  });

  // Hidden by default.
  this.getWidget().hide();
  this.currentMenu = null;
};
common.util.inherits(common.ui.MenuContainer, common.ui.View);

common.ui.MenuContainer.prototype.destroy = function(){
  if (this.currentMenu) {
    this.currentMenu.destroy();
  }
  common.ui.View.prototype.destroy.call(this);
};

common.ui.consumeEvent = function(e) {
  e.stopPropagation();
};

/**
 * Show this menu.  Close any previous menu.  Clamp down on any other UI.
 * Possible show menu relative to parent, if requested.
 *
 * @param {Object} menu
 * @param {Object} opt_parentButton
 */
common.ui.MenuContainer.prototype.showMenu = function(menu, opt_parentButton) {
  var that = this;

  // remove any previous contents.
  if (this.currentMenu) {
    this.hideMenu(this.currentMenu);
  }

  this.currentMenu = menu;

  // Listen for the menu to say 'all done'.
  $(menu).bind('closeMenu', function(e, menu) {
    that.hideMenu(menu);
  });

  // Stop clicks on this 'menu' I am showing from propagating: they should not cause
  // a hide-menu.
  menu.view.bind(window.FLAGS.start, common.ui.consumeEvent);
  this.view.append(menu.getWidget());

  // Listen for transition effects on this menu.
  menu.view.bind(TRANSITION_END, function() {
    // If this menu is no longer current menu, destroy it.
    if (that.currentMenu != menu) {
      menu.destroy();
    }
    // If there is no menu at all, I can hide the whole container.
    if (!that.currentMenu) {
      that.view.hide();
    }
  });

  if (menu.reset) {
    menu.reset();
  }

  if (menu.activate) {
    window.setTimeout(function() {
      menu.activate();
    }, 0);
  }

  // Make sure I am visible.
  this.view.show();

  // Have the menu appear (may be fading in or whatever).
  menu.show();

  // Trigger event.
  $(this).triggerHandler('menuShown');
};

/**
 * Get rid of the menu I am showing, hide myself
 * @param {Object} menu
 */
common.ui.MenuContainer.prototype.hideMenu = function(menu) {
  var that = this;
  if (this.currentMenu == menu) {
    $(this.currentMenu).unbind('closeMenu');
    this.currentMenu.hide();
    this.currentMenu = null;
    // Trigger event.
    $(this).triggerHandler('menuHidden');
  }
};

/**
 * A class that ties together the menu container and menus with a menu bar, a block of
 * buttons that bring up the menus.
 *
 * @param {Object} menuContainer
 */
common.ui.MenuBar = function(menuContainer) {
  var that = this;

  this.view = $('<div class=menuBarContainer>' +
                '  <div class="menuBar valignContainer">' +
                '  </div>' +
                '</div>');

  // Completely hidden until we add at least one button.
  this.view.hide();

  this.$menuBar = this.view.find('.menuBar');
  this.$menuBarTab = new common.ui.ImageButton('menuBarTab');
  this.addChild(this.$menuBarTab);


  // When tab is clicked, menu bar becomes visible.
  this.$menuBarTab.click(function() {
    that.setVisibilityState(common.ui.Menu.VISIBILITY_VISIBLE);
  })

  this.menuContainer = menuContainer;
  this.setVisibilityState(common.ui.Menu.VISIBILITY_VISIBLE);
};
common.util.inherits(common.ui.MenuBar, common.ui.View);

common.ui.MenuBar.prototype.setVisibilityState = function(visibilityState) {
  if (visibilityState == this.visibilityState) {
    return;
  }
  var oldState = this.visibilityState;
  this.visibilityState = visibilityState;
  if (visibilityState == common.ui.Menu.VISIBILITY_VISIBLE) {
    this.$menuBar.removeClass('offscreen');
  } else {
    this.$menuBar.addClass('offscreen');
  }

  if (this.visibilityState == common.ui.Menu.VISIBILITY_TABBED) {
    this.$menuBarTab.removeClass('offscreen');
  } else {
    this.$menuBarTab.addClass('offscreen');
  }
  $(this).triggerHandler('visibilityChanged', [oldState, this.visibilityState]);
};

/**
 * Add a menu/button pair to bar.  When button is pushed, menu shows up.
 * slight complication: for memory reasons we don't want to keep the menu
 * sitting around in memory until we need it.  Better to create on demand
 * each time.
 * So we pass a menu-getter, not a menu itself.
 *
 * @param {Object} button
 * @param {Object} getMenuFunction
 */
common.ui.MenuBar.prototype.addMenuBarButton = function(button, getMenuFunction) {
  var that = this;
  this.view.show();
  var $container = $('<div class="valignContent"></div>');
  this.$menuBar.append($container);
  this.addChild(button, $container);
  button.click(function() {
    var menu = getMenuFunction();
    that.menuContainer.showMenu(menu, button);
  });

  window.setTimeout(function() {
    if (button.activate) {
      button.activate();
    }
  }, 0);
};

/**
 * A menu is a widget displayed in the menu container.
 */
common.ui.Menu = function() {
  var that = this;
  this.menuId = common.ui.getUniqueNamespace();
};
common.util.inherits(common.ui.Menu, common.ui.View);

common.ui.Menu.VISIBILITY_VISIBLE = 1;
common.ui.Menu.VISIBILITY_HIDDEN = 2;
common.ui.Menu.VISIBILITY_TABBED = 3;

/**
 * Have the menu appear onscreen.
 */
common.ui.Menu.prototype.show = function() {
  var that = this;

  window.setTimeout(function() {
    that.view.addClass('onscreen');
  }, 0);
};

/**
 * Hide the menu.
 * This should be done with transition effects:
 * the parent menu container monitors transition
 * effects as a cue for when to hide itself and destroy this menu.
 */
common.ui.Menu.prototype.hide = function() {
  var that = this;

  window.setTimeout(function() {
    that.view.removeClass('onscreen');
  }, 0);
};

/**
 * A button that embeds well into scroll lists.
 * Normal buttons seem to produce farty/staggered scrolling.
 * TODO(dbanks)
 * Have this support the same options dict as a normal button.
 *
 * @param {Object} opt_textOrJqueryElement
 */
common.ui.ScrollSafeButton = function(opt_textOrJqueryElement) {
  var that = this;

  this.enabled = true;

  if (!opt_textOrJqueryElement) {
    this.view = $('<div class="scrollSafeButton"></div>');
  } else if (typeof(opt_textOrJqueryElement) == 'string') {
    this.view = $('<button class=scrollSafeButton>' + opt_textOrJqueryElement + '</button>');
  } else {
    this.view = opt_textOrJqueryElement;
  }

  common.ui.longTouch(this.view, function() {
    that.view.addClass('touched');
  });

  this.view.bind(FLAGS.end + ' ' + FLAGS.move, function() {
    that.view.removeClass('touched');
  });
};
common.util.inherits(common.ui.ScrollSafeButton, common.ui.View);

/**
 * Disables the button.
 */
common.ui.ScrollSafeButton.prototype.disable = function(){
  this.enabled = false;
  this.view.addClass('disabled');
};

/**
 * Enables the button.
 */
common.ui.ScrollSafeButton.prototype.enable = function() {
  this.enabled = true;
  this.view.removeClass('disabled');
};

common.ui.ScrollSafeButton.prototype.addClass = function(className) {
  this.view.addClass(className);
};

common.ui.ScrollSafeButton.prototype.click = function(clickHandler) {
  if (this.enabled) {
    common.ui.click(this.view, clickHandler, null, true);
  }
}


/**
 * A 'scrolling' menu is a type of menu that has optional header text and a list of
 * buttons, possibly scrollable if there are too many to fit in given space.
 *
 * This will be overridden with details on exactly what kind of scroll list we create.
 *
 * Intended to be overridden.
 */
common.ui.ScrollingMenu = function() {
  common.ui.Menu.call(this);

  this.view =$('<div class=menu>' +
               '  <div class=titleContainer>' +
               '    <div class=title>' +
               '    </div>' +
               '  </div>' +
               '  <div class=buttonsContainer></div>' +
               '</div>');
  this.$titleContainer = this.view.find('.titleContainer');
  this.$titleContainer.hide();

  this.$title = this.view.find('.title');
  this.$buttonsContainer = this.view.find('.buttonsContainer');
  };
common.util.inherits(common.ui.ScrollingMenu, common.ui.Menu);

/**
 * Set the flavor text at the top of the menu.
 * @param {Object} text
 */
common.ui.ScrollingMenu.prototype.setHeaderText = function(text) {
  this.$title.text(text);
  if (text) {
    this.$titleContainer.show();
  } else {
    this.$titleContainer.hide();
  }
};

/**
 * A 'standard' menu is a scrolling menu that uses a standard scroll list.
 *
 * Intended to be overridden.
 */
common.ui.StandardMenu = function() {
  common.ui.ScrollingMenu.call(this);

  // Fill the buttons container with a scroll list widget.
  this.scrollList = new common.ui.ScrollList([], null, 'menuScroll');
  this.scrollList.setBounceEnabled(true);

  this.addChild(this.scrollList, this.$buttonsContainer);
};
common.util.inherits(common.ui.StandardMenu, common.ui.ScrollingMenu);

/**
 * Standard activate function
 * @param {Object} title
 */
common.ui.StandardMenu.prototype.activate = function(title) {
  this.scrollList.activate();
  this.scrollList.refresh();
};

/**
 * Add a menu button. When the button is clicked, on top of whatever
 * it normally does, the menu will send a 'my buttons got pushed' message.
 * @param {Object} button
 */
common.ui.StandardMenu.prototype.addStandardMenuButton = function(button) {
  var that = this;
  this.addStandardMenuWidget(button);

  button.click(function() {
    $(that).triggerHandler('closeMenu', [that]);
  });
};

/**
 * Adds a menu widget. Refreshes the scroll list and adds a separator after
 * the widget.
 * @param {Object} A common.ui.View object.
 */
common.ui.StandardMenu.prototype.addStandardMenuWidget = function(view) {
  this.scrollList.appendItem(view);
  this.scrollList.refresh();
};

/**
 * A convenience: when menu is told to reset, we may want to completely wipe old
 * buttons and start over.
 */
common.ui.StandardMenu.prototype.removeAllButtons = function() {
  this.scrollList.removeAllItems();
};


/**
 * A 'dynamic' menu is a scrolling menu that uses a dynamic scroll list.
 *
 * Intended to be overridden.
 */
common.ui.DynamicMenu = function() {
  var that = this;

  common.ui.ScrollingMenu.call(this);

  // Fill the buttons container with a scroll list widget.
  this.scrollList = new common.ui.DynamicScrollList(function(lastIndex, batchSize, endHandler) {
    that.getNextNButtons(lastIndex, batchSize, function(buttons, isFinished) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].click(function() {
          $(that).triggerHandler('closeMenu', [that]);
        });
      }
      endHandler(buttons, isFinished);
    });
  }, 10, null, 'menuScroll');
  this.scrollList.setBounceEnabled(true);
  this.addChild(this.scrollList, this.$buttonsContainer);
};
common.util.inherits(common.ui.DynamicMenu, common.ui.ScrollingMenu);

/**
 * This must be overridden by inheriting classes.
 * Returns the next N buttons to add to the menu.
 * Specifically, call back handler with:
 *   array of buttons.
 *   whether or not there are more to add.
 *
 * @param {Object} lastIndex
 * @param {Object} batchSize
 * @param {Object} handler
 */
common.ui.DynamicMenu.prototype.getNextNButtons = function(lastIndex, batchSize, handler) {
  handler([], true);
};

/**
 * Standard activate function
 * @param {Object} title
 */
common.ui.DynamicMenu.prototype.activate = function(title) {
  this.scrollList.activate();
};

/**
 * Standard reset function
 * @param {Object} title
 */
common.ui.DynamicMenu.prototype.reset = function(title) {
  this.scrollList.removeAllItems();
  this.scrollList.reload();
};

/**
 * A convenience: when menu is told to reset, we may want to completely wipe old
 * buttons and start over.
 */
common.ui.DynamicMenu.prototype.removeAllButtons = function() {
  this.scrollList.removeAllItems();
};

/**
 * A UI model akin to a "Windows" window: you have a menu bar and a content area.
 * Handles common notions of populating the content area, putting up menus, relaying menu
 * clicks and interactions on workspace back to listener.
 */
common.ui.Workspace = function() {
  var that = this;

  this.view = $('<div class=workspaceContainer>' +
                '</div>');

  // This should have the following fields.
  this.menuContainer = new common.ui.MenuContainer();
  this.addChild(this.menuContainer);

  this.$contentContainer = $('<div class=contentContainer></div>');
  this.view.append(this.$contentContainer);

  this.menuBar = new common.ui.MenuBar(this.menuContainer);
  this.addChild(this.menuBar);
  this.currentContentView = null;
};
common.util.inherits(common.ui.Workspace, common.ui.View);

/**
 * Accessor to menu bar so it can be configured.
 */
common.ui.Workspace.prototype.getMenuBar = function() {
  return this.menuBar;
};

/**
 * Accessor to menu container for custom views with menu-y behavior
 */
common.ui.Workspace.prototype.getMenuContainer = function() {
  return this.menuContainer;
};

/**
 */
common.ui.Workspace.prototype.showMenu = function(menu) {
  this.menuContainer.showMenu(menu);
};

/**
 */
common.ui.Workspace.prototype.hideMenu = function(menu) {
  this.menuContainer.hideMenu(menu);
};

/**
 * Set the 'content' area to show this view.  View could be null, we may
 * just be clearing old view -> blank screen.
 *
 * @param {View} view
 */
common.ui.Workspace.prototype.setContentView = function(view) {
  if (this.currentContentView == view) {
    return;
  }

  if (common.ui.Workspace.audioManager) {
    common.ui.Workspace.audioManager.play('slide_short1');
  }

  var oldView = this.currentContentView;
  if (this.currentContentView && this.currentContentView.destroy) {
    this.currentContentView.destroy();
  }
  this.currentContentView = view;

  this.$contentContainer.empty();
  if (this.currentContentView) {
    this.$contentContainer.append(this.currentContentView.getWidget());
    if (this.currentContentView.activate) {
      this.currentContentView.activate();
    }
  }
};

common.ui.Workspace.prototype.getContentView = function() {
  return this.currentContentView;
}

/**
 * A class to show dialog boxes within the game, instead of alerts.
 * @constructor
 */
common.ui.InGameMessageManager = function() {
  this.messageQueue = [];
  this.currentMessageView = null;
  this.view = $('<div class="messageContainer hidden"></div>');
};
common.util.inherits(common.ui.InGameMessageManager, common.ui.View);

/**
 * Queues up a message to show in the game. If no message is currently
 * showing, this message will be displayed. Otherwise, it will be displayed
 * when all other messages are dismissed.
 * @param {String} title The title of the message.
 * @param {String} message The message to display.
 * @param {Object|undefined} opt_options Options for buttons to display
 *   below the message.
 */
common.ui.InGameMessageManager.prototype.addToMessageQueue = function(
    title, message, opt_options, opt_classes) {
  this.messageQueue.push([title, message, opt_options, opt_classes]);
  if (!this.currentMessageView) {
    this.showNextMessage();
  }
};
/**
 * Message Used to offer the user a sign in option.
 */
common.ui.InGameMessageManager.prototype.addLoginMessageToMessageQueue = function(
    title, message, okHandler, opt_cancelHandler, opt_classes) {
  var options = [
  {
    label:$('<button class="imageButton"></button>'),
    handler:opt_cancelHandler,
    classes: ['fbButton'],
  },
  {
    label:$('<button class="imageButton"></button>'),
    handler:okHandler,
    classes: ['googleButton'],
  },
  ];

  this.addToMessageQueue(title, message, options, opt_classes);
}

/**
 * Create a standard OK/Cancel popup box.
 *
 * @param {Object} title
 * @param {Object} message
 * @param {Object} okHandler
 * @param {Object} opt_cancelHandler
 * @param {Object} opt_classes
 */
common.ui.InGameMessageManager.prototype.addConfirmationMessageToMessageQueue = function(
    title, message, okHandler, opt_cancelHandler, opt_classes) {
  var options = [
  {
    label:STRINGS.CANCEL,
    handler:opt_cancelHandler,
    classes: ['negativeButton'],
  },
  {
    label:STRINGS.OK,
    handler:okHandler,
  },
  ];

  this.addToMessageQueue(title, message, options, opt_classes);
};

/**
 * Shows the next queued up message.
 * @private
 */
common.ui.InGameMessageManager.prototype.showNextMessage = function() {
  if (this.messageQueue.length === 0) {
    this.view.addClass('hidden');
    return;
  }
  this.view.removeClass('hidden');
  var that = this;
  var currentMessage = this.messageQueue.shift();
  this.currentMessageView = new common.ui.Message(
      currentMessage[0],
      currentMessage[1],
      function() {
        that.currentMessageView = null;
        that.showNextMessage();
      },
      currentMessage[2],
      currentMessage[3]
      );
  this.view.append(this.currentMessageView.getWidget());
  window.setTimeout(function() {
    that.currentMessageView.activate();
  }, 0);
};


/**
 * The View used to display messages in the InGameMessageManager.
 * @param {String} title The title of the message.
 * @param {String} message The message to display.
 * @param {Function} endHandler The function to call when this message
 *   is dismissed.
 * @param {Object|undefined} opt_optionsArray Options for buttons to display
 *   below the message.
 * @param {Object|undefined} opt_classes Extra classes to throw on the message.
 */
common.ui.Message = function(title, message, endHandler, opt_optionsArray,
    opt_classes) {
  var that = this;
  this.view = $(
      '<div class=message>' +
        '<h2>' + title + '</h2>' +
        '<div class=body></div>' +
      '</div>');
  this.view.find('.body').html(message);
  if (opt_classes) {
    this.view.addClass(opt_classes);
  }

  var optionsArray = opt_optionsArray;

  if (!optionsArray) {
    optionsArray = [{label:"Ok", handler:null}];
  }

  for (var i = 0; i < optionsArray.length; i++) {
    this.addButton(optionsArray[i], endHandler);
  }
};
common.util.inherits(common.ui.Message, common.ui.View);

/**
 * Helper function to add buttons to the message.
 * @private
 */
common.ui.Message.prototype.addButton = function(option, endHandler) {
  var that = this;
  var button = new common.ui.Button(option.label);
  if (option.classes) {
    for (var i = 0; i < option.classes.length; i++) {
      button.addClass(option.classes[i]);
    }
  }

  button.click(function() {
    that.view.css('opacity', 0);
    // NOTE(dbanks)
    // I don't want to put the 'destroy' in a handler for transition end: I am experiencing
    // cases where transition end never seems to fire.
    // So I just wait a transition-y amount of time.
    window.setTimeout(function() {
      that.destroy();
      endHandler();
    }, 200);
    if (option.handler) {
      option.handler();
    }
  });
  this.addChild(button);
};

/**
 * Fades in the message after it's added to the document.
 */
common.ui.Message.prototype.activate = function() {
  this.view.css('opacity', 1);
};


/**
 * Virtual keyboard
 */
common.ui.VirtualKeyboardInput = function() {
  var that = this;
  this.namespace  = '.' + common.ui.getUniqueNamespace();
  this.view = $('<div id=virtualKeyboard></div>');
  this.showing = false;
  this.keys = {};
  var letters = [
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
      ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']];

  for (var i = 0, row; row = letters[i++];) {
    for (var j = 0, key; key = row[j++];) {
      var $button = $(
          '<div id="key' + key + '" class="button keyboardButton">' +
          '<div style="padding-top: 3px">' + key + '</div></div>');
      this.keys[key] = $button;
      common.ui.click($button, this.makeButtonHandler(key));
      this.view.append($button);
    }
    this.view.append('<br/>');
  }
};
common.util.inherits(common.ui.VirtualKeyboardInput, common.ui.View);

common.ui.VirtualKeyboardInput.prototype.disableKey = function(key) {
  this.keys[key] && this.keys[key].css('visibility', 'hidden');
};

common.ui.VirtualKeyboardInput.prototype.makeButtonHandler = function(letter) {
  var that = this;
  return function() {
    $(that).triggerHandler('keyPressed', letter);
  };
};

common.ui.SlideshowScrollList = function(items) {
  this.view = $('<div class=slideshow></div>');

  var leftButton = new common.ui.ImageButton('leftArrow');
  var rightButton = new common.ui.ImageButton('rightArrow');
  this.scrollList = new common.ui.ScrollList(items, null, 'slideshowScroll');

  this.addChild(leftButton);
  this.addChild(this.scrollList);
  this.addChild(rightButton);
};
common.util.inherits(common.ui.SlideshowScrollList, common.ui.View);

common.ui.SlideshowScrollList.prototype.activate = function(){
  this.scrollList.activate;
};

/**
 * A widget displaying an integer animating from one value to another.
 *
 * When the widget is first created it displays the 'from' integer.
 * Each frame of animation is a digit closer and closer to target.
 *
 * Caller must explicitly begin the animation.
 *
 * @param {Integer} fromInteger - Number to display in first frame.
 * @param {Integer} targetInteger - Number to display in final frame.
 * @param {String|undefined} opt_classes
 */
common.ui.AnimatedInteger = function(fromInteger, targetInteger, opt_classes) {
  this.fromInteger = fromInteger;
  this.targetInteger = targetInteger;

  this.view = $('<span class=AnimatedInteger></span>');
  this.view.text(fromInteger);

  if (opt_classes) {
    this.view.addClass(opt_classes);
  }
};
common.util.inherits(common.ui.AnimatedInteger, common.ui.View);

// FIXME(dbanks)
// These could be params, or optional params.
ANIMATED_INTEGER_MSEC_PER_FRAME = 100;
ANIMATED_INTEGER_MAX_FRAMES = 15;

/**
 * Begin the animation.
 *
 * @param {Function|undefined} opt_callback Called when animation is finished.
 */
common.ui.AnimatedInteger.prototype.animateTo = function(opt_callback) {
  this.values = [this.fromInteger];
  this.opt_callback = opt_callback;

  var diff = this.targetInteger - this.fromInteger;
  var numTransitions;
  if (diff > 0) {
    numTransitions = Math.min(Math.abs(diff), ANIMATED_INTEGER_MAX_FRAMES - 1);
    var chunkSize = diff/numTransitions;
    for (var i = 0; i < numTransitions - 1; i++) {
      value = this.fromInteger + (i + 1) * chunkSize;
      this.values.push(Math.floor(value));
    }
    this.values.push(this.targetInteger);
  }
  this.view.addClass('animating');
  this.displayNextFrame();
};

common.ui.AnimatedInteger.prototype.displayNextFrame = function() {
  var that = this;
  window.setTimeout(function() {
    if (that.values.length == 0) {
      that.view.removeClass('animating');
      if (that.opt_callback) {
        that.opt_callback();
      }
      return;
    } else {
      var value = that.values.shift();
      that.view.text(value);
      that.displayNextFrame();
    }
  }, ANIMATED_INTEGER_MSEC_PER_FRAME);
};

/**
 * A view that displays an image fitted to a certain width and height.
 * The width is used to scale the image dimensions, the height it used to
 * possibly crop the height if it scales beyond the given value.
 * @param {Object} options Valid options include:
 *   - url: The image URL
 *   - width: The desired width of the image. The width is used
 *     to scale the dimensions of the image.
 *   - maxScaledHeight: The desired height of the image. The height can
 *     be used to crop the image if it scales beyond the given
 *     dimensions.
 */
common.ui.FittedImage = function(options) {
  var that = this;
  this.view = $('<div></div>');
  this.view.css('overflow', 'hidden');
  var $image = $('<img>').attr('src', options.url);
  this.view.append($image);

  var fittedWidth = options.width || 200;
  var fittedHeight = options.maxScaledHeight || 200;
  $image.hide();
  $image.load(function() {
    $image.show();
    var imageWidth = $image.prop('width');
    var imageHeight = $image.prop('height');
    // New width, based on cropping to max fitted width.
    var newWidth = Math.min(imageWidth, fittedWidth);
    // New height clipped to max fitted height.
    var newHeight = imageHeight * newWidth / imageWidth;
    // New height clipped to max height
    newHeight = Math.min(newHeight, fittedHeight);
    $image.attr('width', newWidth);
    that.view.css({'width': newWidth, 'height': newHeight});
  });
};
common.util.inherits(common.ui.FittedImage, common.ui.View);

  /**
   * Dropdown selector
   * @param options - configs include:
   *   items: array of one or more items to put in the
   *     box.  Each item should have at least a 'text' field
   *     with the string used to display the item.
   *
   *     At most one item might also have the 'selected' field,
   *     meaning we start with this field selected.
   *   classes: any extra classes to add to the wrapper for the
   *     whole thing.
   *   name: add this as 'name' for the select node.
   *   label: add this is a prelim label for the select node.
   *     Only works if 'id' is set.
   * @constructor
   */
common.ui.Dropdown = function(options) {
  var that = this;
  this.items = options.items;

  this.view = $('<div class=dropdownWrapper></div>');
  if (options.label && options.name) {
    var $label = $('<label for="' + options.name + '">' + options.label + '</label>');
    this.view.append($label);
  }
  var $select = $('<select class=nativeDropdown></select>');
  if (options.name) {
    $select.attr({'id': options.name});
  }
  this.view.append($select);

  if (options.classes) {
    this.view.addClass(options.classes);
  }

  this.$nativeDropdown = this.view.find('.nativeDropdown');

  for (var i = 0; i < this.items.length; i++) {
    var item = this.items[i];

    var $item = $('<option value=' + i + '>' + item.text + '</option>');
    if (item.selected) {
      $item.attr('selected', true);
    }
    that.$nativeDropdown.append($item);
  }
};
common.util.inherits(common.ui.Dropdown, common.ui.View);

/**
 * What to do when the selection changes.
 * @param callback - called with the selected item.  No arguments.
 *   Caller can get current item with currentItem method.
 */
common.ui.Dropdown.prototype.change = function(callback) {
  var that = this;
  this.$nativeDropdown.change(function(e, a, b, c) {
    callback();
  });
};

common.ui.Dropdown.prototype.currentItem = function() {
  return this.items[this.$nativeDropdown.val()];
};



})();

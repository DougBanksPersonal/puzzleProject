(function() {

  /**
   * Controller for EK. (EdmodoKnow)
   * @author Doug Banks
   */

  window.pz = window.pz || {};
  window.pz.controllers = window.pz.controllers || {};
  window.pz.models = window.pz.models || {};
  window.pz.views = window.pz.views || {};

  var pzm = window.pz.models;
  var pzv = window.pz.views;
  var pzc = window.pz.controllers;

  /**
   * Main entry point.  Start up once document is ready.
   */
  $(document).ready(function() {
    // Prevent re-entry.
    if (window.pz.appStarted) {
      return;
    }
    window.pz.appStarted = true;


    window.FLAGS = window.FLAGS || {};
    window.FLAGS.click = "click";
    window.FLAGS.start = "mousedown";
    window.FLAGS.end = "mouseup";
    window.FLAGS.mousemove = "mousemove";


    $('.mainBlock').addClass('');

    // Only run on browsers we support.
    switch (common.util.BROWSER.ENGINE) {
      case 'webkit':
      case 'gecko':
        _.defer(function() {
            __runApplication();
        });
        break;
      default:
        $('body').empty();
        $('body').addClass('browserApology');

        var $textLine = edmv.makeDiv('textLine');
        $textLine.text(common.util.formatString(fri.BROWSER_APOLOGY, [fri.APP_TITLE]));
        $('body').append($textLine);

        $textLine = edmv.makeDiv('textLine');
        $textLine.text(common.util.formatString("User agent: " + window.navigator.userAgent));
        $('body').append($textLine);
    }
  });



  /**
   * Create all the models, views, and controllers we need.
   * Load assets while displaying splash screen.
   * Run.
   *
   * @private
   */
  var __runApplication = function() {
    __createModels();

    __createViews();
    __startGame();
  };



  /**
   * Make all the models we need to start up.
   * @private
   */
  var __createModels = function() {
    pzm.gameInstance = new pzm.GameInstance();
  };

  /**
   * Create basic views and ties them to the document.
   * @private
   */
  var __createViews = function() {
    $mainBlockContent = $('.mainBlockContent');
    $mainBlockContent.empty();

    var mainView = new pzv.MainView();
    $mainBlockContent.append(mainView.getWidget());

    // Binf to

    // Bind to view.
    $(mainView).bind('editPuzzles', function(e) {
      pzm.gameInstance.reloadEditablePuzzles();
      mainView.setEditorMode(true);
    })
    $(mainView).bind('playPuzzles', function(e) {
      mainView.setEditorMode(false);
    })

    $(mainView).bind('setKidType', function(e, kidType) {
      pzm.gameInstance.setCurrentKidType(kidType);
    })
    $(mainView).bind('move', function(e, direction) {
      pzm.gameInstance.puzzle.move(direction, pzm.gameInstance.currentKidType, function() {
        console.log('done with move');
      });
    })
    $(mainView).bind('reset', function() {
      pzm.gameInstance.puzzle.reset();
    })

  };

  var __startGame = function() {
    mainView.setEditorMode(false);
    pzm.gameInstance.loadCurrentPuzzle();
  }

})();

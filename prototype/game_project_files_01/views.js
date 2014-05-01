(function() {

var CELL_HEIGHT = 70;
var CELL_WIDTH = 70;
var KID_MARGIN = 10;

  /**
   * Classes and functions for UI.
   * @author Doug Banks
   */

  window.pz = window.pz || {};
  window.pz.views = window.pz.views || {};
  window.pz.models = window.pz.models || {};

  var pzv = window.pz.views;
  var pzm = window.pz.models;



  /**
   * Main view for app.
   * Handles a 'stack' of views that implement async 'transition in'
   * and 'transition out' effects.
   *
   * @param $selector
   * @constructor
   */
  pzv.MainView = function() {
    var that = this;
    this.view = $('<div class=mainView></div>');

  $(pzm.gameInstance).bind('newKidType', function() {
      that.__updateKidType();
    });

    this.__setupWidgets();
  };
  common.util.inherits(pzv.MainView, common.ui.View);

  pzv.MainView.prototype.__updateKidType = function() {
    for (var kt in this.buttons) {
      this.buttons[kt].enable();
    }
    this.buttons[pzm.gameInstance.currentKidType].disable();
  }


  pzv.MainView.prototype.__setupWidgets = function() {
    var that = this;

    this.puzzleView = new pzv.PuzzleView($(this));
    this.addChild(this.puzzleView);

    this.buttons = {};

    var button;

    button = new common.ui.Button("weak girl");
    button.view.addClass('weak girl');
    this.addChild(button);
    button.click(function() {
      $(that).triggerHandler('setKidType', [pzm.KID_TYPE_GIRL_WEAK]);
    });
    this.buttons[pzm.KID_TYPE_GIRL_WEAK] = button;

    button = new common.ui.Button("strong girl");
    button.view.addClass('strong girl');
    this.addChild(button);
    button.click(function() {
      $(that).triggerHandler('setKidType', [pzm.KID_TYPE_GIRL_STRONG]);
    });
    this.buttons[pzm.KID_TYPE_GIRL_STRONG] = button;

    button = new common.ui.Button("weak boy");
    button.view.addClass('weak boy');
    this.addChild(button);
    button.click(function() {
      $(that).triggerHandler('setKidType', [pzm.KID_TYPE_BOY_WEAK]);
    });
    this.buttons[pzm.KID_TYPE_BOY_WEAK] = button;

    button = new common.ui.Button("strong boy");
    button.view.addClass('strong boy');
    this.addChild(button);
    button.click(function() {
      $(that).triggerHandler('setKidType', [pzm.KID_TYPE_BOY_STRONG]);
    });
    this.buttons[pzm.KID_TYPE_BOY_STRONG] = button;

    button = new common.ui.Button("reset");
    this.addChild(button);
    button.click(function() {
      $(that).triggerHandler('reset');
    });


    var $input = $('<input class=offscreenInput></input>');
    this.view.append($input);

    $input.focus(function() {
      console.log('gained focus');
    });

    $input.blur(function() {
      console.log('  lost focus');
    });

    this.view.bind(FLAGS.click, function() {
      $input.focus();
    });

    $input.keydown(function(e) {
      var direction = null;
      if (e.keyCode == 37) {
        direction = pzm.O_WEST;
      }
      if (e.keyCode == 38) {
        direction = pzm.O_NORTH;
      }
      if (e.keyCode == 39) {
        direction = pzm.O_EAST;
      }
      if (e.keyCode == 40) {
        direction = pzm.O_SOUTH;
      }
      if (direction) {
        $(that).triggerHandler('move', [direction])
      }
    });
    this.__updateKidType();
    $input.focus();
  }

  pzv.PuzzleView = function($eventRelay) {
    var that = this;

    this.view = $('<div class=puzzle></div>');

    this.$grid = $('<div class=grid></div>');
    this.view.append(this.$grid);

    this.$scoreArea = $('<div class=scoreArea></div>');
    this.view.append(this.$scoreArea);

    this.$dancesCount = $('<div class=dancesCount></div>');
    this.$scoreArea.append(this.$dancesCount);

    this.$boredomCount = $('<div class=boredomCount></div>');
    this.$scoreArea.append(this.$boredomCount);

    this.$tearsCount = $('<div class=tearsCount></div>');
    this.$scoreArea.append(this.$tearsCount);

    $(pzm.gameInstance).bind('newPuzzle', function() {
      that.__newPuzzle();
    });
  };
  common.util.inherits(pzv.PuzzleView, common.ui.View);

  pzv.PuzzleView.prototype.__newPuzzle = function() {
    var that = this;
    if (this.puzzle) {
      $(this.puzzle.unbind());
    }
    this.puzzle = pzm.gameInstance.puzzle;

    $(this.puzzle).bind('reset', function() {
    that.__renderPuzzle();
    that.__renderScore();
    });

    $(this.puzzle).bind('scoreChanged', function() {
      that.__renderScore();
    });
    this.__renderPuzzle();
    this.__renderScore();
  }

  pzv.PuzzleView.prototype.__renderScore = function() {
    this.$dancesCount.text("Dances: " + this.puzzle.dances);
    this.$boredomCount.text("Boredom: " + this.puzzle.boredom);
    this.$tearsCount.text("Tears: " + this.puzzle.tears);
  }

  pzv.PuzzleView.prototype.__renderPuzzle = function() {
    this.$grid.empty();

    var puzzle = this.puzzle;

    this.$grid.height(puzzle.grid.height * CELL_HEIGHT);
    this.$grid.width(puzzle.grid.width * CELL_WIDTH);

    for (var i = 0; i < puzzle.grid.height; i++) {
      for (var j = 0; j < puzzle.width; j++) {
          var $cell =  $('<div class="cell"></div>');
        this.$grid.append($cell);
        $cell.css({
          "top":(i * CELL_HEIGHT) + "px",
          "left":(j * CELL_WIDTH) + "px",});
        $cell.height(CELL_HEIGHT);
        $cell.width(CELL_WIDTH);
       var cellClass = __getClassForLocation([j, i]);
        $cell.addClass(cellClass);
        if ((i + j) & 0x1) {
          $cell.addClass('faded');
        }
      }
    }

    this.resetKids();
  };

  var __getClassForLocation = function(location) {
    return "location_" + location[0] + "_" + location[1];
  };

  pzv.PuzzleView.prototype.getCellForLocation = function(location) {
    var classForLocation = __getClassForLocation(location);
    var classes = '.cell.' + classForLocation;
    return this.view.find(classes);
  }

  pzv.PuzzleView.prototype.resetKids = function() {
    var that = this;

    var $allKids = $('.kids');
    $allKids.remove();

    _.each(this.puzzle.allObjects, function(object) {
      that.addKid(object);
    });
  };

  pzv.PuzzleView.prototype.addKid = function(kidGroup) {
    var kidView = new pzv.KidView(kidGroup, this);
    this.addChild(kidView, this.$grid);
    kidView.render();
  };

  pzv.KidView = function(kidGroup, parentPuzzleView) {
    var that = this;
    this.kidGroup = kidGroup;
    this.parentPuzzleView = parentPuzzleView;

    this.view = $('<div class=kid></div>');
    this.view.height(CELL_HEIGHT - 2 * KID_MARGIN);
    this.view.width(CELL_WIDTH - 2 * KID_MARGIN);

    $(kidGroup).bind('newLocation', function() {
      that.render();
    });

    $(kidGroup).bind('merge', function() {
      that.render();
    });

    $(kidGroup).bind('destroyed', function() {
      that.destroy();
    });

    $(kidGroup).bind('dance', function() {
      that.render();
    });

    $(pzm.gameInstance).bind('newKidType', function() {
      that.render();
    });

  };
  common.util.inherits(pzv.KidView, common.ui.View);


  pzv.KidView.prototype.render = function() {
    this.view.css({
      top: this.kidGroup.location[1] * CELL_HEIGHT,
      left: this.kidGroup.location[0] * CELL_WIDTH,
    });

    this.view.removeClass('boy');
    this.view.removeClass('girl');
    this.view.removeClass('weak');
    this.view.removeClass('strong');

    if (this.kidGroup.gender() == pzm.GENDER_BOY) {
      this.view.addClass('boy');
    } else {
      this.view.addClass('girl');
    };

    if (this.kidGroup.strength() == pzm.STRENGTH_WEAK) {
      this.view.addClass('weak');
    } else {
      this.view.addClass('strong');
    };

    this.view.text(this.kidGroup.count);

    var currentKidType = pzm.gameInstance.currentKidType;
    if (this.kidGroup.movesWithType(currentKidType)) {
      this.view.addClass('highlight');
    } else {
      this.view.removeClass('highlight');
    }
  };

})();



(function() {

  window.FLAGS = {};

  /**
   * A reporting app for Edmodo.
   * Classes and functions for UI.
   * @author Doug Banks
   */

  window.pz = window.pz || {};
  window.pz.models = window.pz.models || {};

  var pzm = window.pz.models;

  pzm.O_NORTH = "North";
  pzm.O_SOUTH = "South";
  pzm.O_EAST = "East";
  pzm.O_WEST = "West";

  var DEFAULT_SIZE = 5;
  var NUM_KIDS_PER_TYPE = 3;

  pzm.KID_TYPE_GIRL_WEAK = 0;
  pzm.KID_TYPE_GIRL_STRONG = 1;
  pzm.KID_TYPE_BOY_WEAK = 2;
  pzm.KID_TYPE_BOY_STRONG = 3;
  pzm.KID_TYPES = 4;

  pzm.STRENGTH_BIT = 0x1;
  pzm.GENDER_BIT = 0x2;

  pzm.GENDER_GIRL = 0x0;
  pzm.GENDER_BOY = 0x2;

  pzm.STRENGTH_WEAK = 0x0;
  pzm.STRENGTH_STRONG = 0x1;

  pzm.OBJECT_TYPE_KID_GROUP = 'kidGroup';

  pzm.PAUSE_MSEC = 500;

  var GlobalIdCounter = 0;

  pzm.GameInstance = function() {
    this.puzzle = null;
    this.currentKidType = pzm.KID_TYPE_BOY_WEAK;
  };

  pzm.GameInstance.prototype.newPuzzle = function() {

    var width = DEFAULT_SIZE;
    var height = DEFAULT_SIZE;

    var grid = new pzm.Grid(width, height);
    var kids = [];

    for (var i = 0; i < pzm.KID_TYPES; i++) {
      for (var j = 0; j < NUM_KIDS_PER_TYPE; j++) {
        while (1) {
          var x = Math.floor((Math.random()*width));
          var y = Math.floor((Math.random()*width));
          var location = [x, y];
          if (!grid.getObjectInLocation(location)) {
            var object = new pzm.KidGroup(i, 1, location);
            grid.addObject(object);
            kids.push(object);
            break;
          }
        }
      }
    }

    this.puzzle = new pzm.Puzzle(width, height, kids);
    $(this).triggerHandler('newPuzzle');
  };

  pzm.GameInstance.prototype.setCurrentKidType = function(kidType) {
    this.currentKidType = kidType;
    $(this).triggerHandler('newKidType', [kidType]);
  }



  pzm.Grid = function(width, height) {
    this.width = width;
    this.height = height;

    this.clearCells();
  }

  pzm.Grid.prototype.clearCells = function() {
    this.cells = [];

    for (var i = 0; i < this.width; i++) {
      var cellRow = [];
      for (var j = 0; j < this.height; j++) {
        cellRow[j] = null;
      }
      this.cells[i] = cellRow;
    }
  };

  pzm.Grid.prototype.addObject = function(object) {
    this.cells[object.location[0]][object.location[1]] = object;
  }

  pzm.Grid.prototype.removeObject = function(object) {
    this.cells[object.location[0]][object.location[1]] = null;
  };

  pzm.Grid.prototype.getObjectInLocation = function(location) {
    if (!this.cells) {
      var fez = 8;
    }
    if (location) {
      var tez = 4;
    }
    return this.cells[location[0]][location[1]];
  };

  pzm.KidGroup = function(kidType, count, location) {
    this.id = GlobalIdCounter += 1;
    this.objectType = pzm.OBJECT_TYPE_KID_GROUP;
    this.kidType = kidType;
    this.count = count;
    this.location = location;
  };


  pzm.KidGroup.prototype.copySelf = function() {
    var locationCopy = this.location.slice(0);
    kidGroup = new pzm.KidGroup(this.kidType, this.count, locationCopy);
    return kidGroup;
  };

  pzm.KidGroup.prototype.movesWithType = function(kidType) {
    return ((kidType & pzm.GENDER_BIT) == this.gender() &&
        ((kidType & pzm.STRENGTH_BIT) >= this.strength()));
  };

  pzm.KidGroup.prototype.canMoveIntoObject = function(object) {
    if (!object) {
      return true;
    }
    if (object.objectType == pzm.OBJECT_TYPE_KID_GROUP)
    {
      if ((object.gender() != this.gender()) &&
          (object.strength() > this.strength())) {
        return false;
      }
    }
    return true;
  };

  pzm.KidGroup.prototype.updateLocation = function(location) {
    this.location = location.slice(0);
    if (location[0] == NaN) {
      var foo = 5;
    } else if (location[1] == NaN) {
      var bar = 5;
    }
    $(this).triggerHandler('newLocation');
  };

  pzm.KidGroup.prototype.gender = function() {
    return this.kidType & pzm.GENDER_BIT;
  }

  pzm.KidGroup.prototype.strength = function() {
    return this.kidType & pzm.STRENGTH_BIT;
  }

  pzm.KidGroup.prototype.merge = function(mover) {
    var kidTypeChanged = this.kidType != mover.kidType;
    this.kidType = mover.kidType;
    this.count += mover.count;
    $(this).triggerHandler('merge', [kidTypeChanged]);
  }

  pzm.KidGroup.prototype.destroySelf = function() {
    $(this).triggerHandler('destroyed');
  }

  pzm.KidGroup.prototype.dance = function(mover) {
    var retVal;
    if (mover.count < this.count) {
      this.count -= mover.count;
      retVal = mover.count;
    } else {
      retVal = this.count;
      this.count = mover.count - this.count;
      this.kidType = mover.kidType;
    }
    $(this).triggerHandler('dance', [retVal]);
    return retVal;
  }

  /**
   *
   * @param width
   * @param height
   * @param objects
   * @constructor
   */
  pzm.Puzzle = function(width, height, objects) {
    var that = this;
    this.width = width;
    this.height = height;

// FIXME(dbanks)
// Deeper copy.
    this.originals = [];
    _.each(objects, function(object) {
      that.originals.push(object.copySelf());
    });

    this.allObjects = objects;
    this.tears = 0;
    this.boredom = 0;
    this.dances = 0;

    this.grid = new pzm.Grid(width, height);

    this.fillInGrid();
  }

  pzm.Puzzle.prototype.fillInGrid = function() {
    var that = this;
    this.grid.clearCells();
    _.each(this.allObjects, function(object) {
      that.grid.addObject(object);
    });
  };

  pzm.Puzzle.prototype.reset = function() {
    var that = this;
    this.allObjects = [];
    _.each(this.originals, function(object) {
      that.allObjects.push(object.copySelf());
    });
    this.fillInGrid();
    this.tears = 0;
    this.boredom = 0;
    this.dances = 0;

    $(this).triggerHandler('reset');
  }

  pzm.Puzzle.prototype.move = function(orientation, currentKidType, handler) {
    var that = this;

    var movers = [];
    var unmovedObjects = [];

    this.numDancesThisMove = 0;
    this.numTearsThisMove = 0;
    var resolveScore = function() {
      that.tears += that.numTearsThisMove;
      that.dances += that.numDancesThisMove;
      if (!that.numDancesThisMove) {
        that.boredom += 1;
      }
      $(that).triggerHandler('scoreChanged');
      handler();
    }

    _.each(this.allObjects, function(object) {
      var newLocation = that.findMoveResults(object,
        orientation,
        currentKidType);
      if (newLocation) {
        console.log('found a mover');
        console.log(object.location);
        console.log(newLocation)
        that.grid.removeObject(object);
        object.updateLocation(newLocation);
        console.log(object.location);
        movers.push(object);
      } else {
        unmovedObjects.push(object);
      }
    });

    this.allObjects = unmovedObjects;

    // At this point movers are out of the grid and allObjects;

    if (movers.length) {
      $(this).triggerHandler('somethingMoved');
    }
    window.setTimeout(function() {
      if (!movers.length) {
        resolveScore();
        return;
      }
      that.resolveMovers(movers, resolveScore);
    }, pzm.PAUSE_MSEC);
  }

  pzm.Puzzle.prototype.findMoveResults = function(object, orientation, kidType) {
    if (!object.movesWithType(kidType)) {
      return null;
    };
    var currentLocation = object.location.slice(0);
    console.log('currentLocation 1 == ' + currentLocation);
    var newLocation = this.getNewLocation(currentLocation, orientation);
    console.log('currentLocation 2 == ' + currentLocation);
    console.log('newLocation 2 == ' + newLocation);


    var newCellObject = this.grid.getObjectInLocation(newLocation);

    if (object.canMoveIntoObject(newCellObject)) {
      return newLocation;
    }
    return null;
  }

  pzm.Puzzle.prototype.getNewLocation = function(location, orientation) {
    switch (orientation) {
      case pzm.O_NORTH:
        location[1] = (location[1] + this.height - 1) % this.height;
        break;
      case pzm.O_SOUTH:
        location[1] = (location[1] + 1) % this.height;
        break;
      case pzm.O_EAST:
        location[0] = (location[0] + 1) % this.width;
        break;
      case pzm.O_WEST:
        location[0] = (location[0] + this.width - 1) % this.width;
        break;
    }
    return location;
  }

  pzm.Puzzle.prototype.resolveMovers = function(movers, handler) {
    var that = this;
    _.each(movers, function(mover) {
      that.resolveMover(mover);
    });
    window.setTimeout(handler, pzm.PAUSE_MSEC);
  }

  pzm.Puzzle.prototype.resolveMover = function(mover) {
    var newCellObject = this.grid.getObjectInLocation(mover.location);
    if (!newCellObject) {
      // Just drop it in place.
      this.grid.addObject(mover);
      this.allObjects.push(mover);
      return;
    }

    // Resolve it.  It should vanish somehow.
    if (mover.gender() == newCellObject.gender()) {
      newCellObject.merge(mover);
    } else {
      var newDances = newCellObject.dance(mover);
      this.numDancesThisMove += newDances;

      if (newCellObject.count == 0) {
        this.grid.removeObject(newCellObject);
        for (var i = 0; i < this.allObjects.length; i++) {
          if (this.allObjects[i] == newCellObject) {
            this.allObjects.splice(i, 1);
            break;
          }
        }
        newCellObject.destroySelf();
      } else {
        this.numTearsThisMove += newCellObject.count;
      }
    }
    mover.destroySelf();
  };


})();
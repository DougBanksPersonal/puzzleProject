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


  pzm.STRENGTH_MASK = 0x3;
  pzm.GENDER_MASK = 0x4;

  pzm.GENDER_GIRL = 0x0;
  pzm.GENDER_BOY = 0x4;

  pzm.STRENGTH_WEAK = 0x0;
  pzm.STRENGTH_STRONG = 0x1;


  pzm.KID_TYPE_GIRL_WEAK =         (pzm.GENDER_GIRL | pzm.STRENGTH_WEAK);
  pzm.KID_TYPE_GIRL_STRONG =       (pzm.GENDER_GIRL | pzm.STRENGTH_STRONG);
  pzm.KID_TYPE_BOY_WEAK =          (pzm.GENDER_BOY | pzm.STRENGTH_WEAK);
  pzm.KID_TYPE_BOY_STRONG =        (pzm.GENDER_BOY | pzm.STRENGTH_STRONG);
  pzm.ALL_KID_TYPES = [
    pzm.KID_TYPE_GIRL_WEAK,
    pzm.KID_TYPE_GIRL_STRONG,
    pzm.KID_TYPE_BOY_WEAK,
    pzm.KID_TYPE_BOY_STRONG,
  ];


  pzm.OBJECT_TYPE_KID_GROUP = 'kidGroup';

  pzm.PAUSE_MSEC = 500;

  var GlobalIdCounter = 0;

  var __getIndexForLocation = function(location) {
    return 100 * location[0] + location[1];
  };

  var __getLocationFromIndex = function(index) {
    return [Math.floor(index/100), index % 100];
  };

  var __makeMockPuzzleStruct = function(name, size) {
    var retVal = {};
    retVal.name = name;
    retVal.width = size;
    retVal.height = size;

    retVal.kidGroupDescs = [];

    var tmpGrid = new pzm.Grid(size, size);

    var totalSpaces = size * size;
    var maxPerKidType = totalSpaces / 4;
    maxPerKidType = maxPerKidType * 3 / 4;

    for (var i = 0; i < pzm.ALL_KID_TYPES.length; i++) {
      var kidType = pzm.ALL_KID_TYPES[i];
      for (var j = 0; j < maxPerKidType; j++) {
        while (1) {
          var kidGroupDesc = {};
          kidGroupDesc.kidType = kidType;
          kidGroupDesc.count = 1;

          var x = Math.floor((Math.random()*size));
          var y = Math.floor((Math.random()*size));
          kidGroupDesc.location = [x, y];
          if (!tmpGrid.getObjectInLocation(kidGroupDesc.location)) {
            tmpGrid.registerObject(__kidGroupFromKidGroupDesc(kidGroupDesc));
            retVal.kidGroupDescs.push(kidGroupDesc);
            break;
          }
        }
      }
    }
    return retVal;
  };

  var __applyMovement = function(location, orientation, width, height) {
    switch (orientation) {
      case pzm.O_NORTH:
        location[1] = (location[1] + height - 1) % height;
        break;
      case pzm.O_SOUTH:
        location[1] = (location[1] + 1) % height;
        break;
      case pzm.O_EAST:
        location[0] = (location[0] + 1) % width;
        break;
      case pzm.O_WEST:
        location[0] = (location[0] + width - 1) % width;
        break;
    }
    return location;
  }

  var __reverseMovement = function(location, orientation, width, height) {
    switch (orientation) {
      case pzm.O_NORTH:
        location[1] = (location[1] + 1) % height;
        break;
      case pzm.O_SOUTH:
        location[1] = (location[1] + height - 1) % height;
        break;
      case pzm.O_EAST:
        location[0] = (location[0] + width - 1) % width;
        break;
      case pzm.O_WEST:
        location[0] = (location[0] + 1) % width;
        break;
    }
    return location;
  }



  pzm.GameInstance = function() {
    this.puzzle = null;
    this.currentKidType = pzm.KID_TYPE_BOY_WEAK;

    // FIXME(dbanks)
    // Stub
    this.puzzleStructs = [];
    this.puzzleStructs.push( __makeMockPuzzleStruct("Puzzle 1", 4));
    this.puzzleStructs.push( __makeMockPuzzleStruct("Puzzle 2", 4));
    this.puzzleStructs.push( __makeMockPuzzleStruct("Puzzle 3", 4));
    this.puzzleStructs.push( __makeMockPuzzleStruct("Puzzle 4", 5));

    this.currentPuzzleStruct = this.puzzleStructs[0];
  };


  pzm.GameInstance.prototype.loadCurrentPuzzle = function() {
    this.loadPuzzleStruct(this.currentPuzzleStruct);
  };


  pzm.GameInstance.prototype.loadPuzzleStruct = function(ps) {
    var grid = new pzm.Grid(ps.width, ps.height);
    var kids = [];

    _.each(ps.kidGroupDescs, function(kidGroupDesc) {
      var kidGroup  = __kidGroupFromKidGroupDesc(kidGroupDesc);
      kids.push(kidGroup);
    });

    this.puzzle = new pzm.Puzzle(ps.width, ps.height, kids);
    $(this).triggerHandler('newPuzzleLoaded');
  }

  pzm.GameInstance.prototype.setCurrentKidType = function(kidType) {
    this.currentKidType = kidType;
    $(this).triggerHandler('newKidType', [kidType]);
  }

  pzm.GameInstance.prototype.reloadEditablePuzzles = function() {
    this.editablePuzzles = {};
    var puzzleNamesString = window.localStorage.getItem('puzzleFileNames', );
  }

  pzm.Grid = function(width, height, opt_kidGroups) {
    this.width = width;
    this.height = height;

    this.clearCells();
    this.registerObjects(opt_kidGroups || []);
  }

  pzm.Grid.prototype.clearCells = function() {
    this.kidGroupMapsByType = __makeKidGroupMapsByType([]);
  };

  /**
   * Get the object before the given location along given direction.
   *
   * @param location
   * @param direction
   * @returns {boolean}
   */
  pzm.Grid.prototype.getPreviousSpaceObject = function(location, direction) {
    // Where would it have come from?
    var previousLocation = __reverseMovement(location, direction);
    // Something there?
    return this.getObjectInLocation(previousLocation);
  };

  /**
   * Get the object after the given location along given direction.
   *
   * @param location
   * @param direction
   * @returns {boolean}
   */
  pzm.Grid.prototype.getNextSpaceObject = function(location, direction) {
    // Where would it have come from?
    var nextLocation = __applyMovement(location, direction);
    // Something there?
    return this.getObjectInLocation(nextLocation);
  };

  pzm.Grid.prototype.getAllObjects = function() {
    var retVal = [];
    var that = this;

    _.each(pzm.ALL_KID_TYPES, function(kidType) {
      var map = that.kidGroupMapsByType[kidType];
      for (var index in map) {
        retVal.push(map[index]);
      }
    });
    return retVal;
  };


  /**
   * When this kid type moves, which kid groups will move?
   *
   * @param kidType
   * @returns {Array}
   */
  pzm.Grid.prototype.getMoversForKidType = function(kidType) {
    var retval = [];
    _.each(pzm.ALL_KID_TYPES, function(kidType) {
      var map = this.kidGroupMapsByType[kidType];
      if (__firstKidTypeFollowsSecond(kidType, kidType)) {
        for (var index in map) {
          retval.push(map[index]);
        }
      }
    });
    return retval;
  };

  /**
   * When this kid type moves, which kid groups will not move?
   * @type {*}
   */
  pzm.Grid.prototype.getNonMoversForKidType = function(kidType) {
    var retval = [];
    _.each(pzm.ALL_KID_TYPES, function(kidType) {
      var map = this.kidGroupMapsByType[kidType];
      if (!_firstKidTypeFollowsSecond(i, kidType)) {
        for (var index in map) {
          retval.push(map[index]);
        }
      }
    });
    return retval;
  };


  pzm.Grid.prototype.registerObject = function(object) {
    var map = this.kidGroupMapsByType[object.kidType];
    map[object.getLocationIndex()] = object;
  }

  pzm.Grid.prototype.registerObjects = function(objects) {
    var that = this;
    _.each(objects, function(object) {
      that.registerObject(object);
    });
  };

  pzm.Grid.prototype.unregisterObject = function(object) {
    var map = this.kidGroupMapsByType[object.kidType];
    delete map[object.getLocationIndex()];
  };

  pzm.Grid.prototype.getObjectInLocation = function(location) {
    var index = __getIndexForLocation(location);

    for (var i = 0; i < pzm.ALL_KID_TYPES.length; i++) {
      var kidType = pzm.ALL_KID_TYPES[i];
      var map = this.kidGroupMapsByType[kidType];
      if (map[index]) {
        return map[index];
      }
    }
    return null;
  };

  pzm.KidGroup = function(kidType, count, location) {
    this.id = GlobalIdCounter += 1;
    this.objectType = pzm.OBJECT_TYPE_KID_GROUP;
    this.kidType = kidType;
    this.count = count;
    this.location = location;
  };

  pzm.KidGroup.prototype.blocks = function(movingKidType) {
    return ((movingKidType & pzm.GENDER_MASK) != this.gender() &&
            (movingKidType & pzm.STRENGTH_MASK) < this.strength());
  };

  pzm.KidGroup.prototype.getLocationIndex = function() {
    return __getIndexForLocation(this.location);
  }

  pzm.KidGroup.prototype.clone = function() {
    var locationCopy = this.location.slice(0);
    kidGroup = new pzm.KidGroup(this.kidType, this.count, locationCopy);
    return kidGroup;
  };

  var __firstKidTypeFollowsSecond = function(ktFollower, ktLeader) {
    return ((ktLeader & pzm.GENDER_MASK) == (ktFollower & pzm.GENDER_MASK) &&
        ((ktLeader & pzm.STRENGTH_MASK) >= (ktFollower & pzm.STRENGTH_MASK)));
  };


  pzm.KidGroup.prototype.movesWithType = function(kidType) {
    return  __firstKidTypeFollowsSecond(this.kidType, kidType);
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
    return this.kidType & pzm.GENDER_MASK;
  }

  pzm.KidGroup.prototype.strength = function() {
    return this.kidType & pzm.STRENGTH_MASK;
  }

  pzm.KidGroup.prototype.resize = function(newCount) {
    this.count += newCount;
    $(this).triggerHandler('countChanged');
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
      that.originals.push(object.clone());
    });

    this.tears = 0;
    this.boredom = 0;
    this.dances = 0;

    this.grid = new pzm.Grid(width, height, objects);
  }

  pzm.Puzzle.prototype.reset = function() {
    var that = this;
    var newObjects = [];
    _.each(this.originals, function(object) {
      newObjects.push(object.clone());
    });

    this.grid.clearCells();
    this.grid.registerObjects(newObjects);

    this.tears = 0;
    this.boredom = 0;
    this.dances = 0;

    $(this).triggerHandler('reset');
  }

  pzm.Puzzle.prototype.move = function(orientation, currentKidType, handler) {
    var that = this;

    var movers = [];

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

    var allObjects = this.grid.getAllObjects();

    _.each(allObjects, function(object) {
      if (!object.movesWithType(currentKidType)) {
        return;
      };
      var newLocation = that.findMoveResults(object,
        orientation);
      if (newLocation) {
        // Remove from the grid.
        that.grid.unregisterObject(object);
        // Move to new location.
        console.log('found a mover');
        console.log(object.location);
        console.log(newLocation)
        object.updateLocation(newLocation);
        console.log(object.location);
        // Keep this in a list.
        movers.push(object);
      }
    });

    // At this point movers are out of the grid.
    if (movers.length) {
      $(this).triggerHandler('somethingMoved');
    }
    window.setTimeout(function() {
      if (!movers.length) {
        resolveScore();
        return;
      }
      that.__resolveMovers(movers, resolveScore);
    }, pzm.PAUSE_MSEC);
  }

  /**
   * If I try to move this item in this direction, will it move?
   * Or would it bump into something and be prevented from moving?
   * If it would mvoe, return the new location.
   * If it would not move, return null.
   *
   * @param object
   * @param orientation
   * @param kidType
   * @returns {*}
   */
  pzm.Puzzle.prototype.findMoveResults = function(object, orientation) {
    var currentLocation = object.location.slice(0);
    console.log('currentLocation 1 == ' + currentLocation);
    var newLocation = __applyMovement(currentLocation, orientation, this.width,
      this.height);
    console.log('currentLocation 2 == ' + currentLocation);
    console.log('newLocation 2 == ' + newLocation);

    var newCellObject = this.grid.getObjectInLocation(newLocation);

    if (object.canMoveIntoObject(newCellObject)) {
      return newLocation;
    }
    return null;
  }

  pzm.Puzzle.prototype.__resolveMovers = function(movers, handler) {
    var that = this;
    _.each(movers, function(mover) {
      that.__resolveMover(mover);
    });
    window.setTimeout(handler, pzm.PAUSE_MSEC);
  }

  pzm.Puzzle.prototype.__removeAndDestroyObject = function(kidGroup) {
    this.grid.unregisterObject(kidGroup);
    kidGroup.destroySelf();
  }

  pzm.Puzzle.prototype.__resolveMover = function(mover) {
    var newCellObject = this.grid.getObjectInLocation(mover.location);
    if (!newCellObject) {
      // Nothing in new space.  Just drop it in.
      this.grid.registerObject(mover);
      return;
    }

    // Resolve it.  It should vanish somehow.
    if (mover.gender() == newCellObject.gender()) {
      this.__merge(mover, newCellObject);
    } else {
      var danceCount = this.__dance(mover, newCellObject);
      this.numDancesThisMove += danceCount;
      this.numTearsThisMove += (newCellObject.count + mover.count);
    }
  };

  pzm.Puzzle.prototype.__merge = function(mover, newCellObject) {
    mover.resize(newCellObject.count);
    this.__removeAndDestroyObject(newCellObject);
    this.grid.registerObject(mover);
  }

  pzm.Puzzle.prototype.__dance = function(mover, newCellObject) {
    var danceCount = Math.min(mover.count, newCellObject.count);
    mover.resize(-danceCount);
    newCellObject.resize(-danceCount);

    if (newCellObject.count == 0) {
      // needs to be removed.
      this.__removeAndDestroyObject(newCellObject);
    }

    if (mover.count != 0) {
      // Needs to be added.
      this.grid.registerObject(mover);
    } else {
      // mover is already not registered.  Just destroy it.
      mover.destroySelf();
    }
    return danceCount;
  }

  pzm.PuzzleMaker = function() {

  };

  pzm.PuzzleMaker.prototype.createNewPuzzle = function(size, depth) {
    this.width = size;
    this.height = size;
    var puzzleState = new pzm.PuzzleState(size, size);
    this.finalPuzzleState = this.regressNSteps(puzzleState, depth);
  }

  pzm.PuzzleMaker.prototype.regressNSteps = function(puzzleState, depth) {
    if (depth == 0) {
      return puzzleState;
    }

    var regressedState = regressFromState(puzzleState);
    if (!regressedState) {
      return null;
    } else {
      return this.regressNSteps(regressedState, depth-1);
    }
  }

  pzm.PuzzleMaker.prototype.regressFromState = function(puzzleState) {
    var directions = [
            pzm.O_NORTH,
            pzm.O_SOUTH,
            pzm.O_EAST,
            pzm.O_WEST,
    ];

    directions = common.util.randomizeArray(directions);
    var kidTypes = common.util.randomizeArray(pzm.ALL_KID_TYPES);

    for (var i = 0; i < directions.length; i++) {
      var direction = directions[i];
      for (var j = 0; j < kidTypes.length; j++) {
        regressedState = this.regressFromStateWithKidTypeAndDirection(puzzleState,
                kidType, direction);
        if (regressedState) {
          return regressedState;
        }
      }
    }
    return null;
  }

  /**
   * Could these people have come from this direction in light of these unmoving
   * objects around them.
   *
   * @param direction
   * @param movingKidGroups
   * @param stableGrid
   * @returns {boolean}
   * @private
   */
  pzm.PuzzleMaker.prototype.__couldMoversHaveComeFromDirection = function(direction,
                                                                          movingKidGroups,
                                                                          stableGrid)
  {
    // For every mover...
    for (var i = 0; i < movingKidGroups.length; i++) {
      var kidGroup = movingKidGroups[i];
      if (!this.__kidGroupCouldMoveToCurrentLocation(kidGroup,
              direction,
              stableGrid)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Is it possible for this kid to have moved to this location using this
   * direction, in light of these unmoving objects around it?
   *
   * @param kidGroup
   * @param direction
   * @param stableGrid
   * @returns {boolean}
   * @private
   */
  pzm.PuzzleMaker.prototype.__kidGroupCouldMoveToCurrentLocation = function(kidGroup,
          direction,
          stableGrid) {
    // Is the space behind be empty?
    if (null == stableGrid.getPreviousSpaceObject(kidGroup.location, direction)) {
      return true;
    };

    // Is the space in front of me blocked by something that prevents me from
    // moving fwd (meaning this movement was a no-op for me).
    var nextObject = stableGrid.getNextSpaceObject(kidGroup.location, direction);
    if (nextObject && nextObject.blocks(kidGroup.kidType)) {
      return true;
    }

    return false;
  };



  pzm.PuzzleMaker.prototype.regressFromStateWithKidTypeAndDirection = function(
          puzzleState, kidType, direction) {
    var grid = new pzm.Grid(this.height, this.width,
            puzzleState.kidGroups);

    var movingKidGroups = grid.getMoversForKidType(kidType);
    var stableKidGroups = grid.getNonMoversForKidType(kidType);


    var moversGrid = new pzm.Grid(this.width, this.height, movingKidGroups);
    var stableGrid = new pzm.Grid(this.width, this.height, stableKidGroups);

    // Is it even possible to have gotten to this state by
    // moving these kids in this direction?
    if (!this.__couldMoversHaveComeFromDirection(direction,
            movingKidGroups, stableGrid)) {
      return null;
    }

    // Make a new grid based on where movers would have come from.
    var previousKidGroups = this.__makePreviousKidGroups(movingKidGroups, direction);

    // Maybe split some of the movers, where applicable
    previousKidGroups = this.__maybeSplitMovers(previousKidGroups,
            direction,
            kidType,
            stableGrid);
  };

  pzm.PuzzleMaker.prototype.__maybeSplitMovers = function(previousKidGroups,
                                                          direction,
                                                          kidType,
                                                          stableGrid) {
    var retVal = [];

    _.each(previousKidGroups, function(kidGroup) {
      // Can we split?
      // If just one kid in the group, no.
      if (kidGroup.count == 1) {
        retVal.push(kidGroup);
        return;
      }

      // If the mover is a strong kid type and there's nothing
      // blocking the space it'd move on to, no.
      if ((kidType & pzm.STRENGTH_MASK) != 0) {
        var loc = __applyMovement(kidGroup.location, direction);
        loc = __applyMovement(loc, direction);
        var object = stableGrid.getObjectInLocation(loc);
        if (object.blocks()) {
          return;
        }
      }

      // Coin flip.
      var shouldSplit = Math.floor(Math.random()*2);
      if (shouldSplit) {
        // Just pull out one.
        // FIXME(dbanks)  Got to here.
      }
    })
  };

  pzm.PuzzleMaker.prototype.__makePreviousKidGroups = function(movingKidGroups,
                                                               direction) {
    var retVal = [];
    _.each(movers, function(mover) {
      var previousLocation = __reverseMovement(mover.location,
              direction,
              this.width,
              this.height);
      var newKidGroup = mover.clone();
      newKidGroup = previousLocation;
      retVal.push(newKidGroup);
    });
    return retVal;
  }

  pzm.PuzzleMaker.prototype.imagineMoveBack = function(puzzleState,
                                                       direction,
                                                       kidType) {
    var kidGroupMapsByType = __makeKidGroupMapsByType(puzzleState.kidGroups);


    self.addRandomPairs();
    self.maybeSplitGroups();

    self.applyMovement();

    if (self.isTenableGameState) {
      var newPuzzleState = puzzleState.clone;
      newPuzzleState.kidGroups = this.selectedKids.concat(this.unselectedKids);
      newPuzzleState.solution.unshift({
                direction: direction,
                kidType: kidType,
              });
      return newPuzzleState;
    }
    return null;
  };

  // Make copies of kids in current state.
  // Split them by selected/unselected.
  pzm.PuzzleMaker.prototype.splitOutSelectedKids = function(puzzleState, kidType) {
    var that = this;

    this.selectedKids = [];
    this.unselectedKids = [];
    _.each(puzzleState.kidGroups, function(kg) {
      var newKg = kg.clone();
      if (newKg.movesWithType(kidType)) {
        that.selectedKids.push(newKg);
      } else {
        that.unselectedKids.push(newKg)
      }
    })
  };

  pzm.PuzzleMaker.prototype.addRandomPairs = function(kidType) {
    var count = 1 + Math.floor((Math.random()*3));
  }

  pzm.PuzzleState = function() {
    this.kidGroups = [];
    this.solution = [];
  };

  pzm.PuzzleState.prototype.clone = function() {
    var newState = new pzm.PuzzleState();

    _.each(this.solution, function(step) {
      newState.solution.push({
        direction: step.direction,
        kidType: step.kidType,
      })
    });

    _.each(this.kidGroups, function(kidGroup) {
      newState.solution.push(kidGroup.clone());
    });
    return newState;
  };

  var __makeKidGroupMapsByType = function(kidGroups) {
    var kidGroupMapsByType = {};
    _.each(pzm.ALL_KID_TYPES, function(kidType) {
      kidGroupMapsByType[kidType] = {};
    });
    _.each(kidGroups, function(kidGroup) {
      var clonedKidGroup = kidGroup.clone();
      var map = that.kidGroupMapsByType[clonedKidGroup.kidType];
      map[__getIndexForLocation(clonedKidGroup.location)] = clonedKidGroup;
    });
    return kidGroupMapsByType;
  }

  var __kidGroupFromKidGroupDesc = function(kidGroupDesc) {
    return new pzm.KidGroup(kidGroupDesc.kidType,
            kidGroupDesc.count,
            kidGroupDesc.location);
  }

})();
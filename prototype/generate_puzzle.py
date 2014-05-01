__author__ = 'douglasbanks'


import sys
if not hasattr(sys, 'real_prefix'):
  sys.real_prefix = sys.prefix

import gflags

FLAGS = gflags.FLAGS

gflags.DEFINE_integer('size', 4, 'size of puzzle');
gflags.DEFINE_integer('depth', 4, 'depth of solution');


class Grid:
  def __init__(self, size)
    self.width = size
    self.height = size

    self.clearCells()

  def clearCells(self):
    self.cells = [];

    for (i in range)
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



if __name__ == "__main__":
  argv = FLAGS(sys.argv)
  sys.argv = argv

  print ('depth = ' + str(FLAGS.depth));
  print ('size = ' + str(FLAGS.size));



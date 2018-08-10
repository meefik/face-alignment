/**
 * Convert HAAR Cascades from OpenCV
 * @see https://github.com/opencv/opencv/tree/master/data/haarcascades
 *
 * Usage:
 * $ npm install xml2js
 * $ node haar_convert haarcascade_frontalface_default.xml
 *
 * Struct:
 * width = 20
 * height = 20
 * [
 * stageThreshold = 0.822689414024353
 * maxWeakCount = 3
 * [
 * internalNodes[0] = 0
 * features[internalNodes[2]].rects.length = 2
 * features[internalNodes[2]].rects[0] = 3,7,14,4,-1
 * features[internalNodes[2]].rects[1] = 3,9,14,2,2
 * internalNodes[3] = 0.004014195874333382
 * leafValues[0] = 0.0337941907346249
 * leafValues[1] = 0.8378106951713562
 * ]
 * ]
 */

var fs = require("fs");
var path = require("path");
var xml2js = require("xml2js");

function parseNumbers(val) {
  var f = Number(val);
  return isNaN(f) ? val : f;
}

var filename = process.argv[2];
var parser = new xml2js.Parser({ charkey: "#", trim: true, explicitArray: false, valueProcessors: [parseNumbers] });
fs.readFile(path.join(__dirname, filename), function (err, xml) {
  parser.parseString(xml, function (err, result) {
    if (err) return console.error(err);
    var arr = [];
    var cascade = result.opencv_storage.cascade;
    arr.push(cascade.width);
    arr.push(cascade.height);
    var stages = cascade.stages._;
    var features = cascade.features._;
    stages.forEach(function (stage) {
      arr.push(stage.stageThreshold);
      arr.push(stage.maxWeakCount);
      var weakClassifiers = stage.weakClassifiers._;
      weakClassifiers.forEach(function (weakClassifier) {
        var internalNodes = weakClassifier.internalNodes.split(" ").map(function (i) {
          return parseFloat(i);
        });
        var nodeTilted = internalNodes[0];
        var featureIndex = internalNodes[2];
        var nodeThreshold = internalNodes[3];
        var leafValues = weakClassifier.leafValues.split(" ").map(function (i) {
          return parseFloat(i);
        });
        var rects = features[featureIndex].rects._;
        var mergedRects = rects.reduce(function (r, s) {
          return r.concat(s.split(" ").map(function (i) {
            return parseFloat(i);
          }));
        }, []);
        arr.push(nodeTilted);
        arr.push(rects.length);
        Array.prototype.push.apply(arr, mergedRects);
        arr.push(nodeThreshold);
        Array.prototype.push.apply(arr, leafValues);
      });
    });
    console.log(JSON.stringify(arr));
  });
});

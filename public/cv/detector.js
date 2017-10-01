/**
 * Детекция лиц и глаз на изображении.
 */

define("cv/detector", [
  "cv/image",
  "cv/violajones"
], function(Image, ViolaJones) {
  'use strict';

  var Detector = function(options) {
    this.options = options || {};
    this.options.initialScale = this.options.initialScale || 5;
    this.options.scaleFactor = this.options.scaleFactor || 1.2;
    this.options.stepSize = this.options.stepSize || 1;
    this.options.edgesDensity = this.options.edgesDensity || 0;
  };

  Detector.prototype.detect = function(image) {
    return ViolaJones.detect(image.data, image.width, image.height,
      this.options.initialScale, this.options.scaleFactor,
      this.options.stepSize, this.options.edgesDensity);
  };

  Detector.prototype.align = function(image) {
    var pixels = image.data;
    var width = image.width;
    var height = image.height;
    pixels = Image.grayscale(pixels, width, height);
    pixels = Image.equalizeHistogram(pixels, 1);

    var hSymmetry = Image.horizontalSymmetry(pixels, width, height);
    var Gx = Image.gradientX(pixels, width, height);
    var Gy = Image.gradientY(pixels, width, height);

    var leftEyeHistY = Image.projectionY(Gx, width, height, [width * 0.2, hSymmetry * 0.9, height * 0.25, height * 0.5]);
    var leftEyeY = Image.findMaxIndex(leftEyeHistY, [4, 4]);
    var leftEyeHistX = Image.projectionX(Gy, width, height, [width * 0.2, hSymmetry * 0.9, height * 0.25, height * 0.5]);
    var leftEyeX = Image.findMaxIndex(leftEyeHistX, [4, 4]);

    var rightEyeHistY = Image.projectionY(Gx, width, height, [hSymmetry * 1.1, width * 0.8, height * 0.25, height * 0.5]);
    var rightEyeY = Image.findMaxIndex(rightEyeHistY, [4, 4]);
    var rightEyeHistX = Image.projectionX(Gy, width, height, [hSymmetry * 1.1, width * 0.8, height * 0.25, height * 0.5]);
    var rightEyeX = Image.findMaxIndex(rightEyeHistX, [4, 4]);

    var distance = Image.distance([leftEyeX, leftEyeY], [rightEyeX, rightEyeY]);
    var angle = Image.angle([leftEyeX, leftEyeY], [rightEyeX, rightEyeY]);
    var center = Image.center([leftEyeX, leftEyeY], [rightEyeX, rightEyeY]);

    return {
      distance: distance,
      angle: angle,
      center: {
        x: center[0],
        y: center[1]
      },
      leftEye: {
        x: leftEyeX,
        y: leftEyeY
      },
      rightEye: {
        x: rightEyeX,
        y: rightEyeY
      }
    };
  };

  return Detector;
});

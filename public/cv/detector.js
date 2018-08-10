define("cv/detector", [
  "cv/image",
  "cv/violajones",
  "cv/training/face",
  "cv/training/eye",
  "cv/training/mouth"
], function(Image, ViolaJones, FaceClassifier, EyeClassifier, MouthClassifier) {
  'use strict';

  var Detector = function(options) {
    this.options = options || {};
    this.options.initialScale = this.options.initialScale || 1;
    this.options.scaleFactor = this.options.scaleFactor || 1.2;
    this.options.stepSize = this.options.stepSize || 1;
    this.options.edgesDensity = this.options.edgesDensity || 0;
    this.options.classifier = this.options.classifier || 'face';
  };

  Detector.prototype.detect = function(image) {
    var classifier;
    switch (this.options.classifier) {
      case 'face':
        classifier = FaceClassifier;
        break;
      case 'eye':
        classifier = EyeClassifier;
        break;
      case 'mouth':
        classifier = MouthClassifier;
        break;
      default:
        return false;
    }
    var pixels = Image.grayscale(image.data, image.width, image.height);
    return ViolaJones.detect(pixels, image.width, image.height,
      classifier,
      this.options.initialScale, this.options.scaleFactor,
      this.options.stepSize, this.options.edgesDensity);
  };

  Detector.prototype.alignment = function(leftEye, rightEye) {
    leftEye = [leftEye.x + leftEye.width / 2, leftEye.y + leftEye.height / 2];
    rightEye = [rightEye.x + rightEye.width / 2, rightEye.y + rightEye.height / 2];
    return {
      angle: Image.angle(leftEye, rightEye),
      distance: Image.distance(leftEye, rightEye),
      center: Image.center(leftEye, rightEye),
      leftEye: leftEye,
      rightEye: rightEye
    };
  };

  return Detector;
});

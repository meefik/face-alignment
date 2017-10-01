// shim layer for camera capture
navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;
window.URL = window.URL ||
  window.webkitURL ||
  window.mozURL ||
  window.msURL;

// shim layer with setTimeout fallback
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

require([
  'cv/detector'
], function(Detector) {
  'use strict';

  function resizeAndCropImage(src, w, h, x, y) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;
    if (x >= 0 && y >= 0) context.drawImage(src, x, y, w, h, 0, 0, w, h);
    else context.drawImage(src, 0, 0, w, h);
    return context;
  }

  function rotateAndScaleImage(src, x, y, angle, scale) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var centerX = x * scale;
    var centerY = y * scale;
    canvas.width = Math.round(src.width * scale);
    canvas.height = Math.round(src.height * scale);
    context.save();
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.translate(centerX, centerY);
    context.rotate(-angle);
    context.drawImage(src, -centerX, -centerY, canvas.width, canvas.height);
    context.restore();
    return context;
  }

  function tick() {
    window.requestAnimFrame(tick);
    var width = canvas.width;
    var height = canvas.height;
    // отрисовать видео на canvas
    context.drawImage(video, 0, 0, width, height);
    // получить данные с canvas
    var imageData = context.getImageData(0, 0, width, height);
    // найти лица на изображении
    var data = detector.detect(imageData).map(function(rect, index, arr) {
      // найти левый глаз
      var leftEyeROI = context.getImageData(rect.x, rect.y, rect.width / 2, rect.height / 2);
      var leftEye = eyeDetector.detect(leftEyeROI).reduce(function(res, eye) {
        if (!res || eye.width * eye.height > res.width * res.height) return res = {
          x: eye.x + rect.x,
          y: eye.y + rect.y,
          width: eye.width,
          height: eye.height
        };
      }, null);

      if (!leftEye) return {
        rect: rect
      };

      // найти правый глаз
      var rightEyeROI = context.getImageData(rect.x + rect.width / 2, rect.y, rect.width / 2, rect.height / 2);
      var rightEye = eyeDetector.detect(rightEyeROI).reduce(function(res, eye) {
        if (!res || eye.width * eye.height > res.width * res.height) return res = {
          x: eye.x + rect.x + rect.width / 2,
          y: eye.y + rect.y,
          width: eye.width,
          height: eye.height
        };
      }, null);

      if (!rightEye) return {
        rect: rect
      };

      // рассчитать параметры для выравнивания
      var align = detector.alignment(leftEye, rightEye);

      // повернуть и масштабировать изображение
      var scale = FACE_WIDTH * 0.5 / align.distance;
      var centerX = align.center[0];
      var centerY = align.center[1];
      var normalized = rotateAndScaleImage(canvas, centerX, centerY, align.angle, scale);
      // новые координаты с учетом мастабирования (соотношение сторон 8/7)
      var x = centerX * scale - FACE_WIDTH * 0.5;
      var y = centerY * scale - FACE_HEIGHT * 0.3;
      // получить изображение лица
      var faceData = resizeAndCropImage(normalized.canvas, FACE_WIDTH, FACE_HEIGHT, x, y).getImageData(0, 0, FACE_WIDTH, FACE_HEIGHT);

      return {
        rect: rect,
        align: align,
        image: faceData
      };
    });
    // отрисовать найденные области
    data.forEach(function(face) {
      var rect = face.rect;
      var align = face.align;
      context.strokeStyle = 'yellow';
      context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      if (align) {
        context.strokeStyle = 'red';
        context.strokeRect(align.leftEye[0], align.leftEye[1], 4, 4);
        context.strokeRect(align.rightEye[0], align.rightEye[1], 4, 4);
        context.font = '11px Arial';
        context.fillStyle = 'white';
        context.fillText('x: ' + rect.x, rect.x + rect.width + 5, rect.y + 11);
        context.fillText('y: ' + rect.y, rect.x + rect.width + 5, rect.y + 22);
        context.fillText('a: ' + Math.round(align.angle * 100), rect.x + rect.width + 5, rect.y + 33);
        context.fillText('d: ' + Math.round(align.distance), rect.x + rect.width + 5, rect.y + 44);
        context.putImageData(face.image, 0, 0);
      }
    });
  }

  var FACE_WIDTH = 63,
    FACE_HEIGHT = 72;

  var detector = new Detector({
    initialScale: 4,
    scaleFactor: 1.2,
    classifier: 'face'
  });
  var eyeDetector = new Detector({
    initialScale: 1,
    scaleFactor: 1.05,
    classifier: 'eye'
  });

  var canvas = document.getElementById('player');
  var context = canvas.getContext('2d');
  var video;
  if (navigator.getUserMedia) {
    navigator.getUserMedia({
      video: {
        mandatory: {
          maxWidth: 320,
          maxHeight: 240,
          maxFrameRate: 15,
          minFrameRate: 1
        }
      },
      audio: false
    }, function(stream) {
      video = document.createElement('video');
      video.autoplay = true;
      video.src = window.URL.createObjectURL(stream);
      video.onplay = function() {
        var width = video.videoWidth
        var height = video.videoHeight
        canvas.width = width;
        canvas.height = height;
        window.requestAnimFrame(tick);
      };
    }, function(err) {
      if (err) throw err;
    });
  }
});

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
      // определить координаты зрачков, расстояние между зрачками, угол наклона и центр поворота
      var align = detector.align(context.getImageData(rect.x, rect.y, rect.width, rect.height));
      // повернуть и масштабировать изображение
      var scale = FACE_WIDTH * 0.5 / align.distance;
      var centerX = align.center.x + rect.x;
      var centerY = align.center.y + rect.y;
      var normalized = rotateAndScaleImage(canvas, align.center.x, align.center.y, align.angle, scale);
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
      context.strokeStyle = 'red';
      context.strokeRect(align.leftEye.x + rect.x, align.leftEye.y + rect.y, 4, 4);
      context.strokeRect(align.rightEye.x + rect.x, align.rightEye.y + rect.y, 4, 4);
      context.font = '11px Arial';
      context.fillStyle = 'white';
      context.fillText('x: ' + rect.x, rect.x + rect.width + 5, rect.y + 11);
      context.fillText('y: ' + rect.y, rect.x + rect.width + 5, rect.y + 22);
      context.fillText('a: ' + Math.round(align.angle * 100), rect.x + rect.width + 5, rect.y + 33);
      context.fillText('d: ' + Math.round(align.distance), rect.x + rect.width + 5, rect.y + 44);
      context.putImageData(face.image, 0, 0);
    });
  }

  var FACE_WIDTH = 63,
    FACE_HEIGHT = 72;
  var detector = new Detector();
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

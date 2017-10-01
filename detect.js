// Face Detection and Normalization
// Author: Anton Skshidlevsky <meefik@gmail.com>
// License: MIT
// Usage: node detect.js input.png face.png [out.png]

var cv = require('opencv');
var fs = require('fs');
var path = require('path');

/**
 * Вырезать лицо, провернуть и центрировать.
 *
 * @param {Matrix} img - Исходная картинка.
 * @param {Number[]} eyeLeft - Координаты левого глаза [x, y].
 * @param {Number[]} eyeRight - Координаты правого глаза [x, y].
 * @param {Number[]} offsetPercent - Сколько остутить от центров глаз [бок, верх].
 * @param {Number} destSize - Длина ребра выходной картинки.
 * @return {Matrix}
 */
function cropFace(img, eyeLeft, eyeRight, offsetPercent, destSize) {
  if (!eyeLeft) eyeLeft = [0, 0];
  if (!eyeRight) eyeRight = [0, 0];
  if (!offsetPercent) offsetPercent = [0.5, 0.5];
  if (!destSize) destSize = 150;

  img = img.clone();

  var width = img.width();
  var height = img.height();
  var angle = calcAngle(eyeLeft, eyeRight);
  var center = calcCenter(eyeLeft, eyeRight);
  img.rotate(angle, center[0], center[1]);

  var distance = calcDistance(eyeLeft, eyeRight);
  var offsetX = Math.round(offsetPercent[0] * distance);
  var offsetY = Math.round(offsetPercent[1] * distance);
  var cropEdge = Math.round(distance + 2 * offsetX);

  var cropX = eyeLeft[0] - offsetX;
  if (cropX < 0) cropX = 0;
  var cropY = eyeLeft[1] - offsetY;
  if (cropY < 0) cropY = 0;
  var cropWidth = cropEdge;
  if (cropX + cropEdge > width) cropWidth = width - cropX;
  var cropHeight = cropEdge;
  if (cropY + cropEdge > height) cropHeight = height - cropY;

  var roi = img.roi(cropX, cropY, cropWidth, cropHeight);

  // сделать изображение квадратным, заполнив пустые границы белым цветом
  var square = new cv.Matrix(cropEdge, cropEdge, cv.Constants.CV_8UC1);
  square.brightness(255); // сделать фон белым
  var x = Math.floor((cropEdge - cropWidth) / 2);
  var y = Math.floor((cropEdge - cropHeight) / 2);
  roi.copyTo(square, x, y);

  square.resize(destSize, destSize);

  return square;
}

/**
 * Угол между двумя точками в градусах.
 *
 * @param {Number[]} p1 - координаты первой точки [x, y]
 * @param {Number[]} p2 - координаты второй точки [x, y]
 * @returns {Number}
 */
function calcAngle(p1, p2) {
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
}

/**
 * Расстояние между двумя точками.
 * http://en.wikipedia.org/wiki/Euclidean_distance
 *
 * @param {Number[]} p1 - координаты первой точки [x, y]
 * @param {Number[]} p2 - координаты второй точки [x, y]
 * @returns {Number}
 */
function calcDistance(p1, p2) {
  return Math.sqrt(Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2));
}

/**
 * Координаты центра между двумя точками.
 *
 * @param {Number[]} p1 - координаты первой точки [x, y]
 * @param {Number[]} p2 - координаты второй точки [x, y]
 * @returns {Number[]} [x, y]
 */
function calcCenter(p1, p2) {
  var x = (p1[0] + p2[0]) / 2;
  var y = (p1[1] + p2[1]) / 2;
  return [x, y];
}

/**
 * Масштабировать изображение до прямоугольного размера.
 *
 * @param {Matrix} img - Матрица, содержащая изображение.
 * @param {Number} edgeWidth - Длина ребра для масштабирования.
 * @returns {Matrix}
 */
function scaleImage(img, edgeWidth) {
  img = img.clone();
  var width = img.width();
  var height = img.height();

  // масштабировать изображение с сохранением пропорций
  var aspectRatio = width / height;
  if (aspectRatio > 1) {
    width = edgeWidth;
    height = Math.round(width / aspectRatio);
  }
  if (aspectRatio < 1) {
    height = edgeWidth;
    width = Math.round(height * aspectRatio);
  }
  if (aspectRatio == 1) {
    width = edgeWidth;
    height = edgeWidth;
  }
  img.resize(width, height);
  if (width === height) return img;

  // сделать изображение квадратным, заполнив пустые границы белым цветом
  var square = new cv.Matrix(edgeWidth, edgeWidth, cv.Constants.CV_8UC1);
  square.brightness(255); // сделать фон белым
  var x = Math.floor((edgeWidth - width) / 2);
  var y = Math.floor((edgeWidth - height) / 2);
  img.copyTo(square, x, y);
  return square;
}

/**
 * Детектор центра глаза на базе каскада Хаара и центра масс.
 *
 * @param {Matrix} img - Матрица, содержащая изображение.
 * @param {function} callback
 */
function detectEyeCenter(img, callback) {
  var min = Math.round(img.width() * 0.3);
  var options = {
    scale: 1.05,
    neighbors: 0,
    min: [min, min]
  };
  img.detectObject(cv.EYE_CASCADE, options, function(err, eyes) {
    if (err) throw err;
    var centerX = 0,
      centerY = 0;
    for (var i = 0; i < eyes.length; i++) {
      var eye = eyes[i];
      centerX += eye.x + eye.width / 2;
      centerY += eye.y + eye.height / 2;
    }
    centerX = Math.round(centerX / eyes.length);
    centerY = Math.round(centerY / eyes.length);
    callback(centerX, centerY);
  });
}

/**
 * Найти центры глаз на изображении лица.
 *
 * @param {Matrix} img - Матрица, содержащая изображение.
 * @param {function} callback
 */
function detectEyes(img, callback) {
  // границы поиска глаз на изображении
  var EYE_OFFSET_SIDE = 0.15;
  var EYE_OFFSET_TOP = 0.25;
  var EYE_WIDTH = 0.30;
  var EYE_HEIGHT = 0.25;

  var width = img.width();
  var height = img.height();

  // область поиска левого глаза
  var leftRegion = {
    x: Math.round(width * EYE_OFFSET_SIDE),
    y: Math.round(height * EYE_OFFSET_TOP),
    width: Math.round(width * EYE_WIDTH),
    height: Math.round(height * EYE_HEIGHT)
  };
  var leftEyeROI = img.roi(leftRegion.x, leftRegion.y, leftRegion.width, leftRegion.height);

  // область поиска правого глаза
  var rightRegion = {
    x: Math.round(width - width * EYE_OFFSET_SIDE - width * EYE_WIDTH),
    y: Math.round(height * EYE_OFFSET_TOP),
    width: Math.round(width * EYE_WIDTH),
    height: Math.round(height * EYE_HEIGHT)
  };
  var rightEyeROI = img.roi(rightRegion.x, rightRegion.y, rightRegion.width, rightRegion.height);

  // поиск центра левого глаза
  detectEyeCenter(leftEyeROI, function(leftX, leftY) {
    leftX = leftRegion.x + leftX;
    leftY = leftRegion.y + leftY;
    // поиск центра правого глаза
    detectEyeCenter(rightEyeROI, function(rightX, rightY) {
      rightX = rightRegion.x + rightX;
      rightY = rightRegion.y + rightY;
      callback([leftX, leftY], [rightX, rightY]);
    });
  });
}

/**
 * Найти лицо на изображении.
 *
 * @param {Matrix} img - Матрица, содержащая изображение.
 * @param {function} callback
 */
function detectFace(img, callback) {
  // параметры детектора
  var min = Math.round(Math.min(img.width(), img.height()) * 0.3);
  var options = {
    scale: 1.05, // шаг масштабирования
    neighbors: 2, // порог отсеивания
    min: [min, min] // минимальный размер лица
  };
  img.detectObject(cv.FACE_CASCADE, options, function(err, faces) {
    if (err) throw err;
    var found;
    var biggest = 0;
    // поиск прямоугольника с наибольшей площадью
    for (var i = 0; i < faces.length; i++) {
      var face = faces[i];
      var area = face.width * face.height;
      if (area > biggest) {
        biggest = area;
        found = face;
      }
    }
    if (found) {
      var roi = img.roi(found.x, found.y, found.width, found.height);
      detectEyes(roi, function(left, right) {
        callback({
          face: found,
          eyes: {
            left: {
              x: found.x + left[0],
              y: found.y + left[1]
            },
            right: {
              x: found.x + right[0],
              y: found.y + right[1]
            },
          },
          distance: calcDistance(left, right),
          angle: calcAngle(left, right)
        });
      });
    }
  });
}

var inputImg = process.argv[2] || './input.png';
var outputFace = process.argv[3] || './face.png';
var outputImg = process.argv[4];

cv.readImage(inputImg, function(err, img) {
  if (err) throw err;
  if (img.width() < 1 || img.height() < 1) throw new Error('Image has no size');
  detectFace(img, function(data) {
    console.log(data);
    // нормализовать изображение
    var cropped = cropFace(img, [data.eyes.left.x, data.eyes.left.y], [data.eyes.right.x, data.eyes.right.y]);
    // сохранить лицо
    cropped.save(outputFace);
    if (outputImg) {
      // нарисовать рамку вокруг лица
      img.rectangle([data.face.x, data.face.y], [data.face.width, data.face.height], [0, 0, 0], 2);
      // нарисовать точку центра левого глаза
      img.ellipse(data.eyes.left.x, data.eyes.left.y, 6, 6, [200, 200, 200], 1);
      // нарисовать точку центра правого глаза
      img.ellipse(data.eyes.right.x, data.eyes.right.y, 6, 6, [200, 200, 200], 1);
      // сохранить изображение
      img.save(outputImg);
    }
  });
});

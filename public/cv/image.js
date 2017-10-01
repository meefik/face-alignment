/**
 * Вспомогательные функции для работы с изображениями.
 */

define("cv/image", function() {
  'use strict';

  /**
   * Image utility.
   * @static
   * @constructor
   */
  var Image = {};

  /**
   * Computes the integral image for summed, squared, rotated and sobel pixels.
   * @param {array} pixels The pixels in a linear [r,g,b,a,...] array to loop
   *     through.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} opt_integralImage Empty array of size `width * height` to
   *     be filled with the integral image values. If not specified compute sum
   *     values will be skipped.
   * @param {array} opt_integralImageSquare Empty array of size `width *
   *     height` to be filled with the integral image squared values. If not
   *     specified compute squared values will be skipped.
   * @param {array} opt_tiltedIntegralImage Empty array of size `width *
   *     height` to be filled with the rotated integral image values. If not
   *     specified compute sum values will be skipped.
   * @param {array} opt_integralImageSobel Empty array of size `width *
   *     height` to be filled with the integral image of sobel values. If not
   *     specified compute sobel filtering will be skipped.
   * @static
   */
  Image.computeIntegralImage = function(pixels, width, height, opt_integralImage, opt_integralImageSquare, opt_tiltedIntegralImage, opt_integralImageSobel) {
    if (arguments.length < 4) {
      throw new Error('You should specify at least one output array in the order: sum, square, tilted, sobel.');
    }
    var pixelsSobel;
    if (opt_integralImageSobel) {
      pixelsSobel = this.sobel(pixels, width, height);
    }
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var w = i * width * 4 + j * 4;
        var pixel = ~~(pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114);
        if (opt_integralImage) {
          this.computePixelValueSAT(opt_integralImage, width, i, j, pixel);
        }
        if (opt_integralImageSquare) {
          this.computePixelValueSAT(opt_integralImageSquare, width, i, j, pixel * pixel);
        }
        if (opt_tiltedIntegralImage) {
          var w1 = w - width * 4;
          var pixelAbove = ~~(pixels[w1] * 0.299 + pixels[w1 + 1] * 0.587 + pixels[w1 + 2] * 0.114);
          this.computePixelValueRSAT(opt_tiltedIntegralImage, width, i, j, pixel, pixelAbove || 0);
        }
        if (opt_integralImageSobel) {
          this.computePixelValueSAT(opt_integralImageSobel, width, i, j, pixelsSobel[w]);
        }
      }
    }
  };

  /**
   * Helper method to compute the rotated summed area table (RSAT) by the
   * formula:
   *
   * RSAT(x, y) = RSAT(x-1, y-1) + RSAT(x+1, y-1) - RSAT(x, y-2) + I(x, y) + I(x, y-1)
   *
   * @param {number} width The image width.
   * @param {array} RSAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} pixel Pixel value to be added to the integral image.
   * @static
   * @private
   */
  Image.computePixelValueRSAT = function(RSAT, width, i, j, pixel, pixelAbove) {
    var w = i * width + j;
    RSAT[w] = (RSAT[w - width - 1] || 0) + (RSAT[w - width + 1] || 0) - (RSAT[w - width - width] || 0) + pixel + pixelAbove;
  };

  /**
   * Helper method to compute the summed area table (SAT) by the formula:
   *
   * SAT(x, y) = SAT(x, y-1) + SAT(x-1, y) + I(x, y) - SAT(x-1, y-1)
   *
   * @param {number} width The image width.
   * @param {array} SAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} i Vertical position of the pixel to be evaluated.
   * @param {number} j Horizontal position of the pixel to be evaluated.
   * @param {number} pixel Pixel value to be added to the integral image.
   * @static
   * @private
   */
  Image.computePixelValueSAT = function(SAT, width, i, j, pixel) {
    var w = i * width + j;
    SAT[w] = (SAT[w - width] || 0) + (SAT[w - 1] || 0) + pixel - (SAT[w - width - 1] || 0);
  };

  /**
   * Converts a color from a colorspace based on an RGB color model to a
   * grayscale representation of its luminance. The coefficients represent the
   * measured intensity perception of typical trichromat humans, in
   * particular, human vision is most sensitive to green and least sensitive
   * to blue.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {boolean} fillRGBA If the result should fill all RGBA values with the gray scale
   *  values, instead of returning a single value per pixel.
   * @param {Uint8ClampedArray} The grayscale pixels in a linear array ([p,p,p,a,...] if fillRGBA
   *  is true and [p1, p2, p3, ...] if fillRGBA is false).
   * @static
   */
  Image.grayscale = function(pixels, width, height, fillRGBA) {
    var gray = new Uint8ClampedArray(fillRGBA ? pixels.length : pixels.length >> 2);
    var p = 0;
    var w = 0;
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var value = pixels[w] * 0.299 + pixels[w + 1] * 0.587 + pixels[w + 2] * 0.114;
        gray[p++] = value;

        if (fillRGBA) {
          gray[p++] = value;
          gray[p++] = value;
          gray[p++] = pixels[w + 3];
        }

        w += 4;
      }
    }
    return gray;
  };

  /**
   * Fast horizontal separable convolution. A point spread function (PSF) is
   * said to be separable if it can be broken into two one-dimensional
   * signals: a vertical and a horizontal projection. The convolution is
   * performed by sliding the kernel over the image, generally starting at the
   * top left corner, so as to move the kernel through all the positions where
   * the kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  Image.horizontalConvolve = function(pixels, width, height, weightsVector, opaque) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Float32Array(width * height * 4);
    var alphaFac = opaque ? 1 : 0;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = (y * width + x) * 4;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        for (var cx = 0; cx < side; cx++) {
          var scy = sy;
          var scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
          var poffset = (scy * width + scx) * 4;
          var wt = weightsVector[cx];
          r += pixels[poffset] * wt;
          g += pixels[poffset + 1] * wt;
          b += pixels[poffset + 2] * wt;
          a += pixels[poffset + 3] * wt;
        }
        output[offset] = r;
        output[offset + 1] = g;
        output[offset + 2] = b;
        output[offset + 3] = a + alphaFac * (255 - a);
      }
    }
    return output;
  };

  /**
   * Fast vertical separable convolution. A point spread function (PSF) is
   * said to be separable if it can be broken into two one-dimensional
   * signals: a vertical and a horizontal projection. The convolution is
   * performed by sliding the kernel over the image, generally starting at the
   * top left corner, so as to move the kernel through all the positions where
   * the kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} weightsVector The weighting vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  Image.verticalConvolve = function(pixels, width, height, weightsVector, opaque) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Float32Array(width * height * 4);
    var alphaFac = opaque ? 1 : 0;

    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = (y * width + x) * 4;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        for (var cy = 0; cy < side; cy++) {
          var scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
          var scx = sx;
          var poffset = (scy * width + scx) * 4;
          var wt = weightsVector[cy];
          r += pixels[poffset] * wt;
          g += pixels[poffset + 1] * wt;
          b += pixels[poffset + 2] * wt;
          a += pixels[poffset + 3] * wt;
        }
        output[offset] = r;
        output[offset + 1] = g;
        output[offset + 2] = b;
        output[offset + 3] = a + alphaFac * (255 - a);
      }
    }
    return output;
  };

  /**
   * Fast separable convolution. A point spread function (PSF) is said to be
   * separable if it can be broken into two one-dimensional signals: a
   * vertical and a horizontal projection. The convolution is performed by
   * sliding the kernel over the image, generally starting at the top left
   * corner, so as to move the kernel through all the positions where the
   * kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {array} horizWeights The horizontal weighting vector, e.g [-1,0,1].
   * @param {array} vertWeights The vertical vector, e.g [-1,0,1].
   * @param {number} opaque
   * @return {array} The convoluted pixels in a linear [r,g,b,a,...] array.
   */
  Image.separableConvolve = function(pixels, width, height, horizWeights, vertWeights, opaque) {
    var vertical = this.verticalConvolve(pixels, width, height, vertWeights, opaque);
    return this.horizontalConvolve(vertical, width, height, horizWeights, opaque);
  };

  /**
   * Compute image edges using Sobel operator. Computes the vertical and
   * horizontal gradients of the image and combines the computed images to
   * find edges in the image. The way we implement the Sobel filter here is by
   * first grayscaling the image, then taking the horizontal and vertical
   * gradients and finally combining the gradient images to make up the final
   * image. Adapted from https://github.com/kig/canvasfilters.
   * @param {pixels} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @return {array} The edge pixels in a linear [r,g,b,a,...] array.
   */
  Image.sobel = function(pixels, width, height) {
    pixels = this.grayscale(pixels, width, height, true);
    var output = new Float32Array(width * height * 4);
    var sobelSignVector = new Float32Array([-1, 0, 1]);
    var sobelScaleVector = new Float32Array([1, 2, 1]);
    var vertical = this.separableConvolve(pixels, width, height, sobelSignVector, sobelScaleVector);
    var horizontal = this.separableConvolve(pixels, width, height, sobelScaleVector, sobelSignVector);

    for (var i = 0; i < output.length; i += 4) {
      var v = vertical[i];
      var h = horizontal[i];
      var p = Math.sqrt(h * h + v * v);
      output[i] = p;
      output[i + 1] = p;
      output[i + 2] = p;
      output[i + 3] = 255;
    }

    return output;
  };

  /**
   * Convert 1-channel image to RGBA image.
   *
   * @param {Array} pixels - 1-channel integer source image.
   * @param {number} width - The image width.
   * @param {number} height - The image height.
   *
   * @return {Array} 4-channel (RGBA) destination ImageData
   */
  Image.convertToImage = function(pixels, width, height) {
    var length = width * height * 4;
    var rgba = new Uint8ClampedArray(length);
    for (var i = 0; i < length; i++) {
      var value = pixels[i] || 0;
      var n = i << 2;
      rgba[n] = value;
      rgba[n + 1] = value;
      rgba[n + 2] = value;
      rgba[n + 3] = 255;
    }
    return new ImageData(rgba, width, height);
  };

  /**
   * Equalizes the histogram of a grayscale image, normalizing the
   * brightness and increasing the contrast of the image.
   * @param {pixels} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @return {array} The equalized grayscale pixels in a linear array.
   */
  Image.equalizeHist = function(pixels, width, height) {
    var equalized = new Uint8ClampedArray(pixels.length);

    var histogram = new Array(256);
    for (var i = 0; i < 256; i++) histogram[i] = 0;

    for (var i = 0; i < pixels.length; i++) {
      equalized[i] = pixels[i];
      histogram[pixels[i]]++;
    }

    var prev = histogram[0];
    for (var i = 0; i < 256; i++) {
      histogram[i] += prev;
      prev = histogram[i];
    }

    var norm = 255 / pixels.length;
    for (var i = 0; i < pixels.length; i++)
      equalized[i] = (histogram[pixels[i]] * norm + 0.5) | 0;

    return equalized;
  };

  /**
   * Equalizes the histogram of an unsigned 1-channel image with integer
   * values in [0, 255]. Corresponds to the equalizeHist OpenCV function.
   *
   * @param {Array}  src   1-channel integer source image
   * @param {Number} step  Sampling stepsize, increase for performance
   * @param {Array}  [dst] 1-channel destination image
   *
   * @return {Array} 1-channel destination image
   */
  Image.equalizeHistogram = function(src, step, dst) {
    var srcLength = src.length;
    if (!dst) dst = src;
    if (!step) step = 5;

    // Compute histogram and histogram sum:
    var hist = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    for (var i = 0; i < srcLength; i += step) {
      ++hist[src[i]];
    }

    // Compute integral histogram:
    var norm = 255 * step / srcLength,
      prev = 0;
    for (var i = 0; i < 256; ++i) {
      var h = hist[i];
      prev = h += prev;
      hist[i] = h * norm; // For non-integer src: ~~(h * norm + 0.5);
    }

    // Equalize image:
    for (var i = 0; i < srcLength; ++i) {
      dst[i] = hist[src[i]];
    }
    return dst;
  };

  /**
   * Расстояние между двумя точками.
   * http://en.wikipedia.org/wiki/Euclidean_distance
   *
   * @param {Number[]} p1 - координаты первой точки [x, y]
   * @param {Number[]} p2 - координаты второй точки [x, y]
   *
   * @return {Number}
   */
  Image.distance = function(p1, p2) {
    return Math.sqrt(Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2));
  };

  /**
   * Угол между двумя точками.
   *
   * @param {Number[]} p1 - координаты первой точки [x, y]
   * @param {Number[]} p2 - координаты второй точки [x, y]
   * @param {Boolean} degrees - перевести в градусы.
   *
   * @return {Number}
   */
  Image.angle = function(p1, p2, degrees) {
    if (degrees) {
      return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
    } else {
      return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
    }
  };

  /**
   * Координаты центра между двумя точками.
   *
   * @param {Number[]} p1 - координаты первой точки [x, y]
   * @param {Number[]} p2 - координаты второй точки [x, y]
   * @returns {Number[]} [x, y]
   */
  Image.center = function(p1, p2) {
    var x = (p1[0] + p2[0]) / 2;
    var y = (p1[1] + p2[1]) / 2;
    return [x, y];
  };

  /**
   * Окно Ханна (Хеннинга).
   * https://en.wikipedia.org/wiki/Window_function
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   *
   * @return {Number[]} - Массив байт 1-канального изображения.
   */
  Image.windowFog = function(pixels, width, height) {
    var dst = [];
    var centerX = width / 2;
    var centerY = height / 2;
    var N = Math.max(width, height);
    // var N = distance([0, 0], [width, height]);
    for (var y = 0; y < height; y++) {
      var offset = y * width;
      for (var x = 0; x < width; x++) {
        var index = offset + x;
        var n = this.distance([x, y], [centerX, centerY]);
        if (n < N / 2) {
          // var w = 0.53836 - 0.46164 * Math.cos(2 * Math.PI * n / (N - 1));
          var w = 0.5 * (1 - Math.cos(2 * Math.PI * n / (N - 1)));
          dst[index] = ~~(pixels[index] * (1 - w));
        } else dst[index] = 0;
      }
    }
    return dst;
  };

  /**
   * Градиент изображения по оси X.
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   *
   * @return {Number[]} - Массив байт 1-канального изображения (0-255).
   */
  Image.gradientX = function(pixels, width, height) {
    var dst = [];
    for (var y = 0; y < height; y++) {
      var offset = y * width;
      for (var x = 0; x < width; x++) {
        var n = offset + x;
        var p = pixels[n];
        var dx = pixels[n + 1] - p;
        if (isNaN(dx)) dx = 0;
        var D = Math.pow(dx, 2);
        dst.push(D);
      }
    }
    return dst;
  };

  /**
   * Градиент изображения по оси Y.
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   *
   * @return {Number[]} - Массив байт 1-канального изображения (0-255).
   */
  Image.gradientY = function(pixels, width, height) {
    var dst = [];
    for (var y = 0; y < height; y++) {
      var offset = y * width;
      for (var x = 0; x < width; x++) {
        var n = offset + x;
        var p = pixels[n];
        var dy = pixels[n + width] - p;
        if (isNaN(dy)) dy = 0;
        var D = Math.pow(dy, 2);
        dst.push(D);
      }
    }
    return dst;
  };

  /**
   * Проекция но ось X.
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   * @param {String[]} [offset] - [x1, x2, y1, y2]
   *
   * @return {Number[]} - Гистограмма проекции на ось.
   */
  Image.projectionX = function(pixels, width, height, offset) {
    var hist = [];
    for (var x = 0; x < width; x++) {
      hist[x] = 0;
      for (var y = 0; y < height; y++) {
        var n = y * width + x;
        if (!offset ||
          x >= offset[0] && x < offset[1] &&
          y >= offset[2] && y < offset[3]) {
          hist[x] += pixels[n];
        }
      }
    }
    return hist;
  };

  /**
   * Проекция но ось Y.
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   * @param {String[]} [offset] - [x1, x2, y1, y2]
   *
   * @return {Number[]} - Гистограмма проекции на ось.
   */
  Image.projectionY = function(pixels, width, height, offset) {
    var hist = [];
    for (var y = 0; y < height; y++) {
      hist[y] = 0;
      for (var x = 0; x < width; x++) {
        var n = y * width + x;
        if (!offset ||
          x >= offset[0] && x < offset[1] &&
          y >= offset[2] && y < offset[3]) {
          hist[y] += pixels[n];
        }
      }
    }
    return hist;
  };

  /**
   * Получить индекс максимального элемента последовательности.
   *
   * @param {Number[]} seq - Последовательность.
   * @param {Number[]} smooth - Усреднение соседних элементов [-a, +b].
   *
   * @return {Number} - Индекс максимального элемента у учетом усреднения.
   */
  Image.findMaxIndex = function(seq, smooth) {
    if (!smooth) smooth = [0, 0];
    var w = smooth[0] + smooth[1] + 1;
    var max = 0;
    var index = 0;
    for (var i = smooth[0], l = seq.length; i < l - smooth[1]; i++) {
      // усреднение соседних столбцов гистограммы
      var sum = 0;
      for (var j = -1 * smooth[0]; j <= smooth[1]; j++) sum += seq[i + j];
      var h = sum / w;
      // поиск пика гистограммы
      if (h > max) {
        max = h;
        index = i;
      }
    }
    return index;
  };

  /**
   * Поиск горизонтальной линии симметрии.
   *
   * @param {Number[]} pixels - Массив байт 1-канального изображения (0-255).
   * @param {Number} width - Ширина изображения.
   * @param {Number} height - Высота изображения.
   *
   * @return {Number[]} - Координата центра по оси X.
   */
  Image.horizontalSymmetry = function(pixels, width, height) {
    var fog = Image.windowFog(pixels, width, height);
    var hist = Image.projectionX(fog, width, height);
    return Image.findMaxIndex(hist, [1, 1]);
  };

  return Image;
});

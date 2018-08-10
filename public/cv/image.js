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
   * @param {number[]} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number[]} opt_integralImage Empty array of size `width * height` to
   *     be filled with the integral image values. If not specified compute sum
   *     values will be skipped.
   * @param {number[]} opt_integralImageSquare Empty array of size `width *
   *     height` to be filled with the integral image squared values. If not
   *     specified compute squared values will be skipped.
   * @param {number[]} opt_tiltedIntegralImage Empty array of size `width *
   *     height` to be filled with the rotated integral image values. If not
   *     specified compute sum values will be skipped.
   * @param {number[]} opt_integralImageSobel Empty array of size `width *
   *     height` to be filled with the integral image of sobel values. If not
   *     specified compute sobel filtering will be skipped.
   * @static
   */
  Image.computeIntegralImage = function(pixels, width, height, opt_integralImage, opt_integralImageSquare, opt_tiltedIntegralImage, opt_integralImageSobel) {
    if (arguments.length < 4) {
      throw new Error("You should specify at least one output array in the order: sum, square, tilted, sobel.");
    }
    var pixelsSobel;
    if (opt_integralImageSobel) {
      pixelsSobel = this.sobel(pixels, width, height);
    }
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        var w = i * width + j;
        var pixel = pixels[w];
        if (opt_integralImage) {
          this.computePixelValueSAT(opt_integralImage, width, i, j, pixel);
        }
        if (opt_integralImageSquare) {
          this.computePixelValueSAT(opt_integralImageSquare, width, i, j, pixel * pixel);
        }
        if (opt_tiltedIntegralImage) {
          var w1 = w - width;
          var pixelAbove = pixels[w1];
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
   * @param {number[]} RSAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} width The image width.
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
   * @param {number[]} SAT Empty array of size `width * height` to be filled with
   *     the integral image values. If not specified compute sum values will be
   *     skipped.
   * @param {number} width The image width.
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
   * Fast horizontal separable convolution. A point spread function (PSF) is
   * said to be separable if it can be broken into two one-dimensional
   * signals: a vertical and a horizontal projection. The convolution is
   * performed by sliding the kernel over the image, generally starting at the
   * top left corner, so as to move the kernel through all the positions where
   * the kernel fits entirely within the boundaries of the image. Adapted from
   * https://github.com/kig/canvasfilters.
   * @param {number[]} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number[]} weightsVector The weighting vector, e.g [-1,0,1].
   * @return {number[]} The convoluted pixels in a linear array.
   */
  Image.horizontalConvolve = function(pixels, width, height, weightsVector) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Int32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = y * width + x;
        var c = 0;
        for (let cx = 0; cx < side; cx++) {
          var scy = sy;
          var scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
          var poffset = scy * width + scx;
          var wt = weightsVector[cx];
          c += pixels[poffset] * wt;
        }
        output[offset] = c;
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
   * @param {number[]} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number[]} weightsVector The weighting vector, e.g [-1,0,1].
   * @return {number[]} The convoluted pixels in a linear array.
   */
  Image.verticalConvolve = function(pixels, width, height, weightsVector) {
    var side = weightsVector.length;
    var halfSide = Math.floor(side / 2);
    var output = new Int32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        var sy = y;
        var sx = x;
        var offset = y * width + x;
        var c = 0;
        for (let cy = 0; cy < side; cy++) {
          var scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
          var scx = sx;
          var poffset = scy * width + scx;
          var wt = weightsVector[cy];
          c += pixels[poffset] * wt;
        }
        output[offset] = c;
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
   * @param {number[]} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {number[]} horizWeights The horizontal weighting vector, e.g [-1,0,1].
   * @param {number[]} vertWeights The vertical vector, e.g [-1,0,1].
   * @return {number[]} The convoluted pixels in a linear array.
   */
  Image.separableConvolve = function(pixels, width, height, horizWeights, vertWeights) {
    var vertical = this.verticalConvolve(pixels, width, height, vertWeights);
    return this.horizontalConvolve(vertical, width, height, horizWeights);
  };

  /**
   * Compute image edges using Sobel operator. Computes the vertical and
   * horizontal gradients of the image and combines the computed images to
   * find edges in the image. The way we implement the Sobel filter here is by
   * first grayscaling the image, then taking the horizontal and vertical
   * gradients and finally combining the gradient images to make up the final
   * image. Adapted from https://github.com/kig/canvasfilters.
   * @param {number[]} pixels The grayscale pixels in a linear array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @return {number[]} The edge pixels in a linear array.
   */
  Image.sobel = function(pixels, width, height) {
    var output = new Int32Array(width * height);
    var sobelSignVector = new Int32Array([-1, 0, 1]);
    var sobelScaleVector = new Int32Array([1, 2, 1]);
    var vertical = this.separableConvolve(pixels, width, height, sobelSignVector, sobelScaleVector);
    var horizontal = this.separableConvolve(pixels, width, height, sobelScaleVector, sobelSignVector);

    for (let i = 0; i < output.length; i++) {
      var v = vertical[i];
      var h = horizontal[i];
      output[i] = Math.sqrt(h * h + v * v);
    }

    return output;
  };

  /**
   * Converts a color from a color-space based on an RGB color model to a
   * grayscale representation of its luminance. The coefficients represent the
   * measured intensity perception of typical trichromat humans, in
   * particular, human vision is most sensitive to green and least sensitive
   * to blue.
   * @param {Uint8Array|Uint8ClampedArray|Array} pixels The pixels in a linear [r,g,b,a,...] array.
   * @param {number} width The image width.
   * @param {number} height The image height.
   * @param {boolean} fillRGBA If the result should fill all RGBA values with the gray scale
   *  values, instead of returning a single value per pixel.
   * @return {Uint8ClampedArray} The grayscale pixels in a linear array ([p,p,p,a,...] if fillRGBA
   *  is true and [p1, p2, p3, ...] if fillRGBA is false).
   * @static
   */
  Image.grayscale = function(pixels, width, height, fillRGBA) {

    /*
      Performance result (rough EST. - image size, CPU arch. will affect):
      https://jsperf.com/tracking-new-image-to-grayscale
      Firefox v.60b:
            fillRGBA  Gray only
      Old      11       551     OPs/sec
      New    3548      6487     OPs/sec
      ---------------------------------
              322.5x     11.8x  faster
      Chrome v.67b:
            fillRGBA  Gray only
      Old     291       489     OPs/sec
      New    6975      6635     OPs/sec
      ---------------------------------
              24.0x      13.6x  faster
      - Ken Nilsen / epistemex
     */

    var len = pixels.length >> 2;
    var gray = fillRGBA ? new Uint32Array(len) : new Uint8Array(len);
    var data32 = new Uint32Array(pixels.buffer || new Uint8Array(pixels).buffer);
    var i = 0;
    var c = 0;
    var luma = 0;

    // unrolled loops to not have to check fillRGBA each iteration
    if (fillRGBA) {
      while (i < len) {
        // Entire pixel in little-endian order (ABGR)
        c = data32[i];

        // Using the more up-to-date REC/BT.709 approx. weights for luma instead: [0.2126, 0.7152, 0.0722].
        //   luma = ((c>>>16 & 0xff) * 0.2126 + (c>>>8 & 0xff) * 0.7152 + (c & 0xff) * 0.0722 + 0.5)|0;
        // But I'm using scaled integers here for speed (x 0xffff). This can be improved more using 2^n
        //   close to the factors allowing for shift-ops (i.e. 4732 -> 4096 => .. (c&0xff) << 12 .. etc.)
        //   if "accuracy" is not important (luma is anyway an visual approx.):
        luma = ((c >>> 16 & 0xff) * 13933 + (c >>> 8 & 0xff) * 46871 + (c & 0xff) * 4732) >>> 16;
        gray[i++] = luma * 0x10101 | c & 0xff000000;
      }
    } else {
      while (i < len) {
        c = data32[i];
        luma = ((c >>> 16 & 0xff) * 13933 + (c >>> 8 & 0xff) * 46871 + (c & 0xff) * 4732) >>> 16;
        // ideally, alpha should affect value here: value * (alpha/255) or with shift-ops for the above version
        gray[i++] = luma;
      }
    }

    // Consolidate array view to byte component format independent of source view
    return new Uint8ClampedArray(gray.buffer);
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
   * Equalizes the histogram of an unsigned 1-channel image with integer
   * values in [0, 255]. Corresponds to the equalizeHist OpenCV function.
   *
   * @param {Array}  src   1-channel integer source image
   * @param {number} step  Sampling stepsize, increase for performance
   * @param {Array}  [dst] 1-channel destination image
   *
   * @return {Array} 1-channel destination image
   */
  Image.equalizeHist = function(src, step, dst) {
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
   * Euclidean distance between two points.
   * @see http://en.wikipedia.org/wiki/Euclidean_distance
   *
   * @param {number[]} p1 Coordinate of first point [x, y]
   * @param {number[]} p2 Coordinate of second point [x, y]
   *
   * @return {number}
   */
  Image.distance = function(p1, p2) {
    return Math.sqrt(Math.pow((p1[0] - p2[0]), 2) + Math.pow((p1[1] - p2[1]), 2));
  };

  /**
   * Angle between two points.
   *
   * @param {number[]} p1 Coordinate of first point [x, y]
   * @param {number[]} p2 Coordinate of second point [x, y]
   * @param {boolean} degrees - перевести в градусы.
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
   * Coordinate of center between two points.
   *
   * @param {number[]} p1 Coordinate of first point [x, y]
   * @param {number[]} p2 Coordinate of second point [x, y]
   * @returns {number[]} [x, y]
   */
  Image.center = function(p1, p2) {
    var x = (p1[0] + p2[0]) / 2;
    var y = (p1[1] + p2[1]) / 2;
    return [x, y];
  };

  return Image;
});

/* atomic-assets v0.1.0 | MIT License */
var ASSETS = (function () {
  'use strict';

  /**
   * Atomic Assets - Asset loader with automatic fallbacks for 2D and 3D games.
   *
   * Global: window.ASSETS
   * Zero dependencies. Detects THREE.js at runtime for 3D features.
   */

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  var _baseUrl = '';
  var _cache = {};

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve a source path against the base URL.
   * If src is already absolute (http/https/data:), return as-is.
   */
  function resolve(src) {
    if (!src) return src;
    if (/^(https?:\/\/|data:|blob:)/.test(src)) return src;
    var base = _baseUrl;
    if (base && base[base.length - 1] !== '/') base += '/';
    return base + src;
  }

  /**
   * Check if THREE.js is available on window.
   */
  function threeAvailable() {
    return typeof window !== 'undefined' && typeof window.THREE !== 'undefined' && window.THREE !== null;
  }

  // ---------------------------------------------------------------------------
  // Placeholder generators
  // ---------------------------------------------------------------------------

  /**
   * Create a 2D canvas placeholder with a "missing texture" pattern.
   * Magenta background with checker pattern and diagonal cross.
   *
   * @param {number} width  - Canvas width in pixels (default: 64)
   * @param {number} height - Canvas height in pixels (default: 64)
   * @param {object} [options]
   * @param {string} [options.color='#ff00ff'] - Background color
   * @param {string} [options.label]           - Optional text label to draw
   * @returns {HTMLCanvasElement}
   */
  function createPlaceholder(width, height, options) {
    width = width || 64;
    height = height || 64;
    var opts = options || {};
    var color = opts.color || '#ff00ff';
    var label = opts.label || '';

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Checker pattern (darker squares)
    var cellSize = Math.max(8, Math.floor(Math.min(width, height) / 4));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (var y = 0; y < height; y += cellSize) {
      for (var x = 0; x < width; x += cellSize) {
        if (((x / cellSize) + (y / cellSize)) % 2 === 0) {
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    // Diagonal cross lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, height);
    ctx.moveTo(width, 0);
    ctx.lineTo(0, height);
    ctx.stroke();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Label text
    if (label) {
      var fontSize = Math.max(8, Math.floor(Math.min(width, height) / 6));
      ctx.font = fontSize + 'px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, width / 2, height / 2);
    }

    return canvas;
  }

  /**
   * Create a placeholder THREE.Mesh (wireframe box).
   * Only works if THREE.js is loaded.
   *
   * @param {object} [options]
   * @param {number} [options.width=1]     - Box width
   * @param {number} [options.height=1]    - Box height
   * @param {number} [options.depth=1]     - Box depth
   * @param {string} [options.color='#ff00ff'] - Wireframe color
   * @returns {THREE.Mesh}
   */
  function createPlaceholderMesh(options) {
    if (!threeAvailable()) {
      console.warn('[ASSETS] createPlaceholderMesh: THREE.js not loaded — returning null');
      return null;
    }
    var T = window.THREE;
    var opts = options || {};
    var w = opts.width || 1;
    var h = opts.height || 1;
    var d = opts.depth || 1;
    var color = opts.color || '#ff00ff';

    var geometry = new T.BoxGeometry(w, h, d);
    var material = new T.MeshBasicMaterial({
      color: color,
      wireframe: true,
    });
    var mesh = new T.Mesh(geometry, material);
    mesh.name = 'placeholder';
    return mesh;
  }

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------

  /**
   * Load an image from URL with automatic fallback.
   * On failure, returns an Image backed by a placeholder canvas.
   *
   * @param {string} src - Image URL or relative path (resolved against baseUrl)
   * @param {object} [options]
   * @param {number} [options.width=64]          - Fallback placeholder width
   * @param {number} [options.height=64]         - Fallback placeholder height
   * @param {string} [options.color='#ff00ff']   - Fallback placeholder color
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImage(src, options) {
    var url = resolve(src);
    var opts = options || {};
    var fw = opts.width || 64;
    var fh = opts.height || 64;
    var fc = opts.color || '#ff00ff';

    // Return from cache if available
    if (_cache[url] && _cache[url].type === 'image') {
      return Promise.resolve(_cache[url].value);
    }

    return new Promise(function (resolveP) {
      var img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function () {
        _cache[url] = { type: 'image', value: img };
        resolveP(img);
      };

      img.onerror = function () {
        console.warn('[ASSETS] Failed to load image: ' + url + ' — using placeholder');
        var canvas = createPlaceholder(fw, fh, { color: fc, label: 'IMG' });
        var fallback = new Image();
        fallback.src = canvas.toDataURL();
        fallback._isPlaceholder = true;
        _cache[url] = { type: 'image', value: fallback };
        resolveP(fallback);
      };

      img.src = url;
    });
  }

  /**
   * Load a THREE.js texture from URL with automatic fallback.
   * On failure, returns a procedural CanvasTexture.
   * Requires THREE.js to be loaded.
   *
   * @param {string} src - Texture URL or relative path
   * @param {object} [options]
   * @param {string} [options.color='#ff00ff']               - Fallback color
   * @param {string} [options.pattern='checker']             - 'checker' or 'solid'
   * @returns {Promise<THREE.Texture>}
   */
  function loadTexture(src, options) {
    if (!threeAvailable()) {
      console.warn('[ASSETS] loadTexture: THREE.js not loaded — returning null');
      return Promise.resolve(null);
    }

    var T = window.THREE;
    var url = resolve(src);
    var opts = options || {};
    var color = opts.color || '#ff00ff';
    var pattern = opts.pattern || 'checker';

    // Return from cache
    if (_cache[url] && _cache[url].type === 'texture') {
      return Promise.resolve(_cache[url].value);
    }

    return new Promise(function (resolveP) {
      var loader = new T.TextureLoader();

      loader.load(
        url,
        // onLoad
        function (texture) {
          _cache[url] = { type: 'texture', value: texture };
          resolveP(texture);
        },
        // onProgress (unused)
        undefined,
        // onError
        function () {
          console.warn('[ASSETS] Failed to load texture: ' + url + ' — using fallback');
          var canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          var ctx = canvas.getContext('2d');

          if (pattern === 'checker') {
            var cellSize = 8;
            for (var y = 0; y < 64; y += cellSize) {
              for (var x = 0; x < 64; x += cellSize) {
                ctx.fillStyle = ((x / cellSize + y / cellSize) % 2 === 0) ? color : '#000000';
                ctx.fillRect(x, y, cellSize, cellSize);
              }
            }
          } else {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 64, 64);
          }

          var fallbackTexture = new T.CanvasTexture(canvas);
          fallbackTexture._isPlaceholder = true;
          _cache[url] = { type: 'texture', value: fallbackTexture };
          resolveP(fallbackTexture);
        }
      );
    });
  }

  /**
   * Load an audio file with automatic fallback.
   * On failure, returns a short silent AudioBuffer.
   *
   * @param {string} src          - Audio URL or relative path
   * @param {AudioContext} audioContext - Web Audio API context
   * @returns {Promise<AudioBuffer>}
   */
  function loadAudio(src, audioContext) {
    if (!audioContext) {
      return Promise.reject(new Error('ASSETS.loadAudio requires an AudioContext'));
    }

    var url = resolve(src);

    // Return from cache
    if (_cache[url] && _cache[url].type === 'audio') {
      return Promise.resolve(_cache[url].value);
    }

    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        return audioContext.decodeAudioData(arrayBuffer);
      })
      .then(function (audioBuffer) {
        _cache[url] = { type: 'audio', value: audioBuffer };
        return audioBuffer;
      })
      .catch(function () {
        console.warn('[ASSETS] Failed to load audio: ' + url + ' — using silent buffer');
        var sampleRate = audioContext.sampleRate;
        var length = Math.floor(sampleRate * 0.5); // 0.5 seconds of silence
        var buffer = audioContext.createBuffer(1, length, sampleRate);
        buffer._isPlaceholder = true;
        _cache[url] = { type: 'audio', value: buffer };
        return buffer;
      });
  }

  /**
   * Preload multiple resources (images) and cache them.
   *
   * @param {string[]} urls - Array of image URLs to preload
   * @returns {Promise<void>}
   */
  function preload(urls) {
    if (!urls || !urls.length) return Promise.resolve();
    var promises = urls.map(function (url) {
      return loadImage(url);
    });
    return Promise.all(promises).then(function () {});
  }

  /**
   * Clear the internal asset cache. Forces re-fetching on next load.
   */
  function clearCache() {
    _cache = {};
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  var ASSETS = {
    // Configuration
    setBaseUrl: function (url) { _baseUrl = url || ''; },
    getBaseUrl: function () { return _baseUrl; },

    // 2D - Images
    loadImage: loadImage,

    // 2D - Placeholders
    createPlaceholder: createPlaceholder,

    // 3D - Textures (requires THREE)
    loadTexture: loadTexture,

    // 3D - Mesh placeholder (requires THREE)
    createPlaceholderMesh: createPlaceholderMesh,

    // Audio
    loadAudio: loadAudio,

    // Utilities
    isThreeAvailable: threeAvailable,
    preload: preload,
    clearCache: clearCache,
  };

  return ASSETS;

})();
/* Loaded via: window.ASSETS */

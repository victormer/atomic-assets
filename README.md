# atomic-assets

Asset loader with automatic fallbacks for 2D and 3D games. Load images, textures, and audio with graceful degradation — the game never crashes due to a missing asset.

**Zero dependencies.** Detects THREE.js at runtime for 3D features.

## Install

### CDN (recommended for Atomic Coding)

```html
<script src="https://cdn.jsdelivr.net/gh/victormer/atomic-coding@atomic-assets-v0.1.0/packages/atomic-assets/dist/atomic-assets.min.js"></script>
```

This exposes `window.ASSETS` globally.

### GitHub Packages (npm)

```bash
npm install @victormer/atomic-assets --registry=https://npm.pkg.github.com
```

```js
import ASSETS from '@victormer/atomic-assets';
```

## Quick Start

```js
// Set a base URL for your assets (optional)
ASSETS.setBaseUrl('https://example.com/game-assets/');

// Load an image — returns placeholder on failure
var img = await ASSETS.loadImage('player.png');
ctx.drawImage(img, 0, 0);

// Load a Three.js texture — returns checker pattern on failure
var tex = await ASSETS.loadTexture('brick.jpg');
var mat = new THREE.MeshStandardMaterial({ map: tex });

// Load audio — returns silence on failure
var actx = new AudioContext();
var sfx = await ASSETS.loadAudio('explosion.mp3', actx);
```

## API

### Configuration

| Method | Returns | Description |
|--------|---------|-------------|
| `ASSETS.setBaseUrl(url)` | `void` | Set base URL for relative paths |
| `ASSETS.getBaseUrl()` | `string` | Get current base URL |

### 2D: Images

#### `ASSETS.loadImage(src, options?)` → `Promise<HTMLImageElement>`

Load an image from URL. On failure, returns a placeholder image (magenta checkerboard).

**Options:**
- `width` — placeholder width (default: `64`)
- `height` — placeholder height (default: `64`)
- `color` — placeholder color (default: `'#ff00ff'`)

```js
// In an Atomic Coding atom:
async function load_sprites() {
  var player = await ASSETS.loadImage('player.png');
  var enemy = await ASSETS.loadImage('enemy.png', { width: 32, height: 32 });
  // Use with canvas 2D context
  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  ctx.drawImage(player, 100, 100);
  ctx.drawImage(enemy, 200, 200);
}
```

#### `ASSETS.createPlaceholder(width, height, options?)` → `HTMLCanvasElement`

Create a canvas placeholder with checkerboard pattern and optional label.

**Options:**
- `color` — background color (default: `'#ff00ff'`)
- `label` — text drawn at center (default: `''`)

```js
var sprite = ASSETS.createPlaceholder(32, 32, { color: '#00ff00', label: 'NPC' });
ctx.drawImage(sprite, x, y);
```

### 3D: Textures (requires THREE.js)

#### `ASSETS.loadTexture(src, options?)` → `Promise<THREE.Texture>`

Load a texture for Three.js materials. On failure, returns a procedural CanvasTexture.

**Options:**
- `color` — fallback color (default: `'#ff00ff'`)
- `pattern` — `'checker'` (default) or `'solid'`

```js
// In an Atomic Coding atom:
async function setup_materials() {
  var wallTex = await ASSETS.loadTexture('wall.jpg');
  var floorTex = await ASSETS.loadTexture('floor.jpg', { pattern: 'solid', color: '#888888' });

  var wallMat = new THREE.MeshStandardMaterial({ map: wallTex });
  var floorMat = new THREE.MeshStandardMaterial({ map: floorTex });
}
```

### 3D: Placeholder Mesh (requires THREE.js)

#### `ASSETS.createPlaceholderMesh(options?)` → `THREE.Mesh`

Create a wireframe box mesh as a stand-in for a 3D model.

**Options:**
- `width` — box width (default: `1`)
- `height` — box height (default: `1`)
- `depth` — box depth (default: `1`)
- `color` — wireframe color (default: `'#ff00ff'`)

```js
var enemyModel = ASSETS.createPlaceholderMesh({ width: 0.5, height: 1.8, depth: 0.5, color: '#ff0000' });
scene.add(enemyModel);
```

### Audio

#### `ASSETS.loadAudio(src, audioContext)` → `Promise<AudioBuffer>`

Load audio via Web Audio API. On failure, returns a 0.5s silent buffer.

```js
// In an Atomic Coding atom:
async function init_audio() {
  var actx = new AudioContext();
  var jumpSfx = await ASSETS.loadAudio('jump.mp3', actx);

  // Play the sound
  var source = actx.createBufferSource();
  source.buffer = jumpSfx;
  source.connect(actx.destination);
  source.start();
}
```

### Utilities

| Method | Returns | Description |
|--------|---------|-------------|
| `ASSETS.isThreeAvailable()` | `boolean` | Check if THREE.js is loaded |
| `ASSETS.preload(urls)` | `Promise<void>` | Preload and cache multiple images |
| `ASSETS.clearCache()` | `void` | Clear internal cache |

```js
// Preload all assets at game start
await ASSETS.preload(['bg.png', 'player.png', 'enemy.png', 'item.png']);
```

## Fallback Behavior

Every loader has a built-in fallback that activates on network errors or missing files:

| Method | Fallback |
|--------|----------|
| `loadImage` | Magenta/black checkerboard canvas with "IMG" label |
| `loadTexture` | `THREE.CanvasTexture` with checker or solid pattern |
| `loadAudio` | 0.5-second silent `AudioBuffer` |
| `createPlaceholderMesh` | Wireframe `BoxGeometry` mesh |

All fallback objects have `._isPlaceholder = true` so you can detect them:

```js
var img = await ASSETS.loadImage('maybe-missing.png');
if (img._isPlaceholder) {
  console.log('Image not found, using placeholder');
}
```

## Usage in Atomic Coding

1. Install the external for your game:
   ```
   POST /games/:name/externals  { "name": "atomic_assets" }
   ```

2. Use `ASSETS.*` in your atoms — the library is loaded before your bundle runs.

3. If using 3D features (`loadTexture`, `createPlaceholderMesh`), also install `three_js`.

## License

MIT

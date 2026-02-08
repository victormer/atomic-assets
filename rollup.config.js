import terser from '@rollup/plugin-terser';

const banner = '/* atomic-assets v0.1.0 | MIT License */';

export default [
  // UMD build (unminified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/atomic-assets.js',
      format: 'iife',
      name: 'ASSETS',
      banner,
      footer: '/* Loaded via: window.ASSETS */',
    },
  },
  // UMD build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/atomic-assets.min.js',
      format: 'iife',
      name: 'ASSETS',
      banner,
    },
    plugins: [terser()],
  },
];

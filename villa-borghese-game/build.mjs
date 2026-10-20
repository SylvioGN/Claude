// Bundles the game into one self-contained HTML file (three.js included, no network needed).
//
//   node build.mjs                      -> dist/index.html (full page) + dist/artifact.html (body fragment)
//   node build.mjs --only=world,cart    -> bundle only these feature modules (others fall back to stubs)
//   node build.mjs --out=.out/mine      -> write to another folder (use this when testing in parallel)
//   node build.mjs --dev                -> unminified, with inline source maps
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Every feature module lives in src/modules/<name>.js and exports create(ctx).
export const MODULES = [
  'world', 'cityscape', 'vegetation', 'props',
  'landmarksPincio', 'landmarksLake', 'landmarksCenter', 'landmarksEast', 'landmarksSouth',
  'cart', 'actors', 'audio', 'ui',
];

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const only = args.only ? String(args.only).split(',').map((s) => s.trim()).filter(Boolean) : MODULES;
for (const m of only) {
  if (!MODULES.includes(m)) throw new Error(`Unknown module "${m}". Known: ${MODULES.join(', ')}`);
}
const outDir = path.resolve(ROOT, args.out ? String(args.out) : 'dist');
const dev = !!args.dev;

const registryPlugin = {
  name: 'registry',
  setup(build) {
    build.onResolve({ filter: /^virtual:registry$/ }, () => ({ path: 'registry', namespace: 'virtual' }));
    build.onLoad({ filter: /.*/, namespace: 'virtual' }, () => {
      const lines = only.map((m, i) => `import * as m${i} from './src/modules/${m}.js';`);
      lines.push(`export default [${only.map((m, i) => `['${m}', m${i}]`).join(', ')}];`);
      return { contents: lines.join('\n'), resolveDir: ROOT, loader: 'js' };
    });
  },
};

const result = await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari14'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  write: false,
  legalComments: 'none',
  plugins: [registryPlugin],
  define: { __BUILD_MODULES__: JSON.stringify(only) },
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const shell = fs.readFileSync(path.join(ROOT, 'src/shell.html'), 'utf8');
const fragment = shell.replace('/*__BUNDLE__*/', () => js);
const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#7fb3d8">
<meta name="apple-mobile-web-app-capable" content="yes">
</head>
<body>
${fragment}
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), full);
fs.writeFileSync(path.join(outDir, 'artifact.html'), fragment);
const kb = (Buffer.byteLength(full) / 1024).toFixed(0);
console.log(`built ${path.relative(ROOT, outDir) || '.'}/index.html (${kb} KB) modules: ${only.join(', ')}`);

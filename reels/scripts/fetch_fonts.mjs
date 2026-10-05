#!/usr/bin/env node
// Downloads the reel's fonts from Google Fonts (SIL Open Font License) into
// public/fonts and writes public/fonts/fonts.json, which src/reel/fonts.ts
// loads. Renders then never touch the network. Add a face to FACES and rerun.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FACES = [
  { module: 'PlayfairDisplay', license: 'playfairdisplay', style: 'italic', weight: '400' },
  { module: 'Anton', license: 'anton', style: 'normal', weight: '400' },
  { module: 'GreatVibes', license: 'greatvibes', style: 'normal', weight: '400' },
  { module: 'Montserrat', license: 'montserrat', style: 'normal', weight: '600' },
];
const SUBSETS = ['latin', 'latin-ext'];

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts');
fs.mkdirSync(dir, { recursive: true });

const download = async (url, dest) => {
  if (fs.existsSync(dest)) {
    return;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url}: ${res.status} ${res.statusText}`);
  }
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`Downloaded ${path.relative(process.cwd(), dest)}`);
};

const manifest = [];
for (const face of FACES) {
  const { getInfo } = await import(`@remotion/google-fonts/${face.module}`);
  const info = getInfo();
  const files = {};
  for (const subset of SUBSETS) {
    const file = `${face.module}-${face.style}-${face.weight}-${subset}.woff2`;
    await download(info.fonts[face.style][face.weight][subset], path.join(dir, file));
    files[subset] = file;
  }
  await download(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${face.license}/OFL.txt`,
    path.join(dir, `${face.module}-OFL.txt`),
  );
  manifest.push({
    family: info.fontFamily,
    style: face.style,
    weight: face.weight,
    files,
    unicodeRanges: Object.fromEntries(SUBSETS.map((s) => [s, info.unicodeRanges[s]])),
  });
}
fs.writeFileSync(path.join(dir, 'fonts.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Fonts ready in ${path.relative(process.cwd(), dir)}`);

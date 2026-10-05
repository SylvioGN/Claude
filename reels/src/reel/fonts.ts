import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import faces from '../../public/fonts/fonts.json';

// Local copies of the Google Fonts faces (scripts/fetch_fonts.mjs), so renders never need the network.
for (const face of faces) {
  for (const [subset, file] of Object.entries(face.files)) {
    loadFont({
      family: face.family,
      url: staticFile(`fonts/${file}`),
      style: face.style,
      weight: face.weight,
      unicodeRange: face.unicodeRanges[subset as keyof typeof face.unicodeRanges],
    });
  }
}

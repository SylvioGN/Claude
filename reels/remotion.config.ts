import fs from 'node:fs';
import path from 'node:path';
import { Config } from '@remotion/cli/config';

// Master quality for Instagram Reels: H.264 + AAC at 1080x1920. Instagram
// re-encodes every upload, so we hand it as clean a file as possible.
Config.setCodec('h264');
Config.setCrf(16);
Config.setX264Preset('slow');
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setAudioCodec('aac');
Config.setAudioBitrate('320k');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setConcurrency('100%');

// Cloud sessions ship a Chromium headless shell (Playwright). Use it instead of
// letting Remotion download its own; elsewhere Remotion's default applies.
const findHeadlessShell = (): string | null => {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!fs.existsSync(root)) {
    return null;
  }
  const dirs = fs
    .readdirSync(root)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort();
  for (const dir of dirs.reverse()) {
    for (const bin of ['chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
      const candidate = path.join(root, dir, bin);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return null;
};

const headlessShell = findHeadlessShell();
if (headlessShell) {
  Config.setBrowserExecutable(headlessShell);
}

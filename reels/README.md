# Reels

A [Remotion](https://www.remotion.dev) project that turns dance clips into Instagram Reels:
1080×1920, 30 fps, H.264 + AAC, cut on the beat.

## Setup

```bash
npm install
pip install -r scripts/requirements.txt   # numpy, scipy, librosa, soundfile
```

`ffmpeg` and `ffprobe` must be on the PATH. Remotion uses the Chromium headless shell under
`/opt/pw-browsers` when it exists (cloud sessions), otherwise it downloads its own.

## Workflow

1. **Bring in the footage.** Put the videos (and the song, if there is one) in `raw/`, then:

   ```bash
   python3 scripts/prep.py
   ```

   Every video becomes `public/footage/<name>.mp4`: upright, constant frame rate, iPhone HDR
   tone-mapped to SDR, metadata (GPS included) stripped. 60/120 fps sources keep their frame rate
   for smooth slow motion. Songs become `public/music/<name>.wav`.

2. **Look at the footage.**

   ```bash
   python3 scripts/review.py sheets public/footage/<clip>.mp4          # timestamped contact sheets
   python3 scripts/review.py motion public/footage/<clip>.mp4          # biggest moves, calm spots, sharpest frames
   python3 scripts/review.py frames public/footage/<clip>.mp4 3.2 7.5  # full-size grabs
   ```

3. **Listen to the music.**

   ```bash
   python3 scripts/beats.py analyze public/music/<song>.wav                     # tempo, grid, drops, accents
   python3 scripts/beats.py sync public/music/<song>.wav public/footage/*.mp4   # where each clip sits in the song
   ```

4. **Write the edit** as `src/edits/<name>.ts` (copy `demo.ts`) and add it to `src/edits/index.ts`.

5. **Render.**

   ```bash
   npm run preview -- <id> out/<id>-preview.mp4               # half resolution, ~3x faster
   npm run render -- <id> out/<id>.mp4                        # final
   npm run still -- <id> out/<id>-cover.jpg --frame=<n>       # cover image
   npm run studio                                             # interactive preview in the browser
   ```

## The edit format

An edit (`src/reel/types.ts`) is plain data:

| Field | What it does |
| --- | --- |
| `clips` | The shots in order. Each has `src`, a length (`duration` in seconds or `beats`), and optionally `from` (source start), `speed` (a rate or `[{ at, speed }]` ramp keyframes), `focus`/`pan` (crop position, 0–1), `zoom` (constant or `[start, end]` push-in), `rotate`, `mirror`, `in` (transition), `grade` overrides and `volume` (original audio). |
| `music` | `src`, `startAt` (song second at the reel's first frame), `volume`, `fadeIn`, `fadeOut`. |
| `grid` / `beats` | The beat grid from `beats.py analyze`. Clips measured in `beats` cut exactly on it. |
| `hits` | Song seconds of the big moments (the drop): a harder pulse plus a light flash. |
| `sync` | Offsets from `beats.py sync`. A clip without `from` then starts wherever keeps the dance on the music. |
| `pulse` | Zoom bump on every beat (`0.02` = 2%). |
| `look` / `grade` | `golden`, `moody`, `rose`, `clean` or `noir`, plus overrides (contrast, saturation, warmth, fade, split toning, glow, vignette, grain, b&w). |
| `texts` | `text`, `at`, `duration`, `style` (`luxe`, `bold`, `script`, `minimal`), `position` (`top`, `center`, `bottom`) and `animation` (`rise`, `pop`, `track`, `type`). Positions stay clear of Instagram's UI. |
| `lightLeaks` | 0–1 warm light drifting over the picture. |
| `fadeOut` | Seconds to fade to black at the end; leave it out to keep the loop seamless. |

Transitions: `cut`, `flash`, `zoom`, `whip-left`, `whip-right`, `shake`, `glitch`, `blur`, `fade`.

## Privacy

`raw/`, `public/footage/`, `public/music/`, `review/` and `out/` are git-ignored, so footage and
renders never end up in the repository.

## Smoke test

```bash
python3 scripts/demo_assets.py && python3 scripts/prep.py raw/demo/*
npm run preview -- demo out/demo-preview.mp4
```

Fonts are Google Fonts under the SIL Open Font License, stored in `public/fonts`
(`node scripts/fetch_fonts.mjs` re-downloads them). Remotion is free for individuals and companies
of up to three people; see [remotion.dev/license](https://www.remotion.dev/license).

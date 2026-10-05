#!/usr/bin/env python3
"""See the footage: timestamped contact sheets, frame grabs and a motion map.

    python3 scripts/review.py sheets public/footage/take-1.mp4 [--every 0.5]
    python3 scripts/review.py frames public/footage/take-1.mp4 3.2 7.85
    python3 scripts/review.py motion public/footage/take-1.mp4

Images go to review/<name>/ (git-ignored, they show the footage).
Motion data goes to analysis/<name>.motion.json.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FONT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')
BARS = ' ▁▂▃▄▅▆▇█'


def duration_of(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def review_dir(clip):
    d = ROOT / 'review' / clip.stem
    d.mkdir(parents=True, exist_ok=True)
    return d


def sheets(clip, every, cols, rows, width):
    out = review_dir(clip)
    for old in out.glob('sheet-*.jpg'):
        old.unlink()
    font = f'fontfile={FONT}:' if FONT.exists() else ''
    label = (f"drawtext={font}text='%{{pts\\:hms}}':x=6:y=6:fontsize={max(14, width // 10)}:fontcolor=white:"
             'box=1:boxcolor=black@0.6:boxborderw=4')
    # select (not fps) keeps each thumbnail's own timestamp, so the labels are exact.
    pick = f"select='isnan(prev_selected_t)+gte(t-prev_selected_t,{every - 0.001})'"
    vf = f'{pick},scale={width}:-2,{label},tile={cols}x{rows}:padding=4:color=black'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(clip), '-vf', vf,
                    '-fps_mode', 'passthrough', '-q:v', '3', str(out / 'sheet-%02d.jpg')], check=True)
    span = every * cols * rows
    duration = duration_of(clip)
    for i, sheet in enumerate(sorted(out.glob('sheet-*.jpg'))):
        print(f'{sheet.relative_to(ROOT)}  {i * span:.1f}s - {min((i + 1) * span, duration):.1f}s')


def frames(clip, times, width):
    out = review_dir(clip)
    for t in times:
        dest = out / f'frame-{t:07.3f}s.jpg'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{t}', '-i', str(clip),
                        '-frames:v', '1', '-vf', f'scale={width}:-2', '-q:v', '2', str(dest)], check=True)
        print(dest.relative_to(ROOT))


def windows(values, rate, seconds, count, highest=True):
    """Best non-overlapping windows of `seconds` length by mean value."""
    size = max(1, int(seconds * rate))
    if len(values) < size:
        return []
    means = np.convolve(values, np.ones(size) / size, mode='valid')
    order = np.argsort(-means if highest else means)
    picked = []
    for i in order:
        if all(abs(i - j) >= size for j, _ in picked):
            picked.append((int(i), float(means[i])))
        if len(picked) == count:
            break
    return [(i / rate, (i + size) / rate, m) for i, m in sorted(picked)]


def motion(clip, rate=10, w=144, h=256):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(clip), '-vf', f'fps={rate},scale={w}:{h},format=gray',
                          '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    px = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    energy = np.abs(np.diff(px, axis=0)).mean(axis=(1, 2))
    energy = np.concatenate([[energy[0] if len(energy) else 0.0], energy])
    lap = px[:, :-2, 1:-1] + px[:, 2:, 1:-1] + px[:, 1:-1, :-2] + px[:, 1:-1, 2:] - 4 * px[:, 1:-1, 1:-1]
    sharpness = lap.var(axis=(1, 2))
    brightness = px.mean(axis=(1, 2))

    ref = np.percentile(energy, 95) or 1.0
    step = rate // 2
    timeline = ''.join(BARS[min(8, int(8 * energy[i:i + step].mean() / ref))] for i in range(0, len(energy), step))
    print(f'{clip.name}: {len(px) / rate:.1f}s, motion per 0.5s (one line = 30s):')
    for i in range(0, len(timeline), 60):
        print(f'  {i / 2:5.0f}s |{timeline[i:i + 60]}|')

    for seconds in (2, 4):
        print(f'Most movement, {seconds}s windows:')
        for a, b, m in windows(energy, rate, seconds, 4):
            print(f'  {a:6.2f}s - {b:6.2f}s  energy {m / ref:.2f}')
    print('Calmest 2s (poses, slow intros):')
    for a, b, m in windows(energy, rate, 2, 3, highest=False):
        print(f'  {a:6.2f}s - {b:6.2f}s  energy {m / ref:.2f}')

    # Cover candidates: sharp, well-exposed frames at least a second apart.
    lit = (brightness > 40) & (brightness < 215)
    candidates = [int(i) for i in np.argsort(-sharpness) if lit[i]]
    covers = []
    for i in candidates:
        if all(abs(i - j) >= rate for j in covers):
            covers.append(i)
        if len(covers) == 5:
            break
    print('Sharpest frames (cover / freeze-frame candidates): ' + ', '.join(f'{i / rate:.1f}s' for i in sorted(covers)))

    data = {'file': clip.name, 'rate': rate, 'energy': np.round(energy / ref, 3).tolist(),
            'sharpness': np.round(sharpness, 1).tolist(), 'brightness': np.round(brightness, 1).tolist()}
    dest = ROOT / 'analysis' / f'{clip.stem}.motion.json'
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(data) + '\n')
    print(f'Saved {dest.relative_to(ROOT)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('sheets', help='contact sheets with timestamps')
    s.add_argument('clip', type=Path)
    s.add_argument('--every', type=float, default=0.5, help='seconds between thumbnails (default 0.5)')
    s.add_argument('--cols', type=int, default=5)
    s.add_argument('--rows', type=int, default=4)
    s.add_argument('--width', type=int, default=216, help='thumbnail width in px')
    f = sub.add_parser('frames', help='full-size grabs at given seconds')
    f.add_argument('clip', type=Path)
    f.add_argument('times', type=float, nargs='+')
    f.add_argument('--width', type=int, default=540)
    m = sub.add_parser('motion', help='movement map, peak moments and sharpest frames')
    m.add_argument('clip', type=Path)
    args = parser.parse_args()

    if args.cmd == 'sheets':
        sheets(args.clip, args.every, args.cols, args.rows, args.width)
    elif args.cmd == 'frames':
        frames(args.clip, args.times, args.width)
    else:
        motion(args.clip)


if __name__ == '__main__':
    main()

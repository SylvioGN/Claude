#!/usr/bin/env python3
"""Normalise phone footage and music for editing.

Videos become public/footage/<name>.mp4: upright, constant frame rate, SDR
(iPhone HDR is tone-mapped), H.264 with a keyframe every second, and with all
metadata (GPS included) stripped. Audio files become public/music/<name>.wav so
the beat analysis and the render read the exact same samples. Facts about each
file land in analysis/<name>.json.

    python3 scripts/prep.py                      # everything in raw/
    python3 scripts/prep.py raw/IMG_0420.MOV --tonemap hable
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO_EXT = {'.mov', '.mp4', '.m4v', '.mkv', '.webm', '.avi', '.3gp'}
AUDIO_EXT = {'.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus'}
HDR_TRANSFERS = {'arib-std-b67', 'smpte2084'}
# Keep 25% more than 1080x1920 so punch-ins and reframing stay sharp.
COVER_W, COVER_H = 1350, 2400


def probe(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def slug(path):
    return re.sub(r'[^a-z0-9]+', '-', path.stem.lower()).strip('-') or 'clip'


def rotation(stream):
    for side in stream.get('side_data_list', []):
        if 'rotation' in side:
            return int(round(float(side['rotation'])))
    return int(stream.get('tags', {}).get('rotate', 0))


def rate(value):
    num, _, den = value.partition('/')
    den = float(den or 1)
    return float(num) / den if den else 0.0


def target_fps(fps):
    # 60 and 120 fps sources stay high so slow motion stays smooth.
    if fps < 45:
        return 30
    if fps < 90:
        return 60
    return 120


def even(v):
    return max(2, int(round(v / 2)) * 2)


def prep_video(src, out_dir, tonemap):
    info = probe(src)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    has_audio = any(s['codec_type'] == 'audio' for s in info['streams'])
    rot = rotation(video)
    w, h = video['width'], video['height']
    if rot % 180:
        w, h = h, w
    src_fps = rate(video.get('avg_frame_rate', '0/1')) or rate(video.get('r_frame_rate', '30/1'))
    fps = target_fps(src_fps)
    scale = min(1.0, max(COVER_W / w, COVER_H / h))
    out_w, out_h = even(w * scale), even(h * scale)
    transfer = video.get('color_transfer', '')
    hdr = transfer in HDR_TRANSFERS

    if hdr:
        chain = [
            f'fps={fps}',
            f'zscale=w={out_w}:h={out_h}:f=lanczos:tin={transfer}:pin=bt2020:min=bt2020nc:t=linear:npl=100',
            'format=gbrpf32le',
            'zscale=p=bt709',
            f'tonemap=tonemap={tonemap}:desat=0',
            'zscale=t=bt709:m=bt709:r=tv',
            'format=yuv420p',
        ]
    else:
        chain = [f'fps={fps}', f'scale={out_w}:{out_h}:flags=lanczos', 'format=yuv420p']

    name = slug(src)
    out = out_dir / f'{name}.mp4'
    cmd = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-stats', '-y', '-i', str(src),
        '-map', '0:v:0', '-map', '0:a:0?', '-vf', ','.join(chain),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-g', str(fps), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
        '-map_metadata', '-1', '-map_chapters', '-1', '-movflags', '+faststart', str(out),
    ]
    subprocess.run(cmd, check=True)
    duration = float(probe(out)['format']['duration'])
    facts = {
        'source': src.name, 'file': f'footage/{out.name}', 'duration': round(duration, 3),
        'fps': fps, 'sourceFps': round(src_fps, 3), 'width': out_w, 'height': out_h,
        'sourceSize': [w, h], 'rotation': rot, 'hdr': hdr, 'audio': has_audio,
    }
    print(f'  {src.name} -> public/{facts["file"]}  {out_w}x{out_h} {fps}fps {duration:.2f}s'
          f'{"  HDR tone-mapped" if hdr else ""}{"  rotated" if rot else ""}{"" if has_audio else "  (no audio)"}')
    return name, facts


def prep_audio(src, out_dir):
    name = slug(src)
    out = out_dir / f'{name}.wav'
    subprocess.run(
        ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src), '-vn', '-ac', '2', '-ar', '48000',
         '-c:a', 'pcm_s16le', '-map_metadata', '-1', str(out)],
        check=True,
    )
    duration = float(probe(out)['format']['duration'])
    print(f'  {src.name} -> public/music/{out.name}  {duration:.2f}s')
    return name, {'source': src.name, 'file': f'music/{out.name}', 'duration': round(duration, 3)}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('inputs', nargs='*', type=Path, help='files to prepare (default: everything in raw/)')
    parser.add_argument('--tonemap', default='mobius', choices=['mobius', 'hable', 'reinhard', 'clip'],
                        help='HDR to SDR operator (default: mobius)')
    args = parser.parse_args()

    inputs = args.inputs or sorted(p for p in (ROOT / 'raw').glob('*') if p.is_file())
    inputs = [p for p in inputs if p.suffix.lower() in VIDEO_EXT | AUDIO_EXT]
    if not inputs:
        sys.exit('Nothing to prepare: put videos or music in raw/ or pass file paths.')

    footage, music, analysis = ROOT / 'public/footage', ROOT / 'public/music', ROOT / 'analysis'
    for d in (footage, music, analysis):
        d.mkdir(parents=True, exist_ok=True)

    for src in inputs:
        if src.suffix.lower() in AUDIO_EXT:
            name, facts = prep_audio(src, music)
        else:
            name, facts = prep_video(src, footage, args.tonemap)
        (analysis / f'{name}.json').write_text(json.dumps(facts, indent=2) + '\n')


if __name__ == '__main__':
    main()

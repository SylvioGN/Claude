#!/usr/bin/env python3
"""Hear the music: tempo, beat grid, accents and drops; line clips up with the song.

    python3 scripts/beats.py analyze public/music/song.wav
    python3 scripts/beats.py sync public/music/song.wav public/footage/take-1.mp4 public/footage/take-2.mp4

`analyze` writes analysis/<song>.beats.json and prints the `grid` (or `beats`)
and `hits` to paste into an edit. `sync` finds where each clip's own audio sits
in the song (songTime = clipTime + offset) and merges the offsets into
analysis/sync.json, ready for the edit's `sync` field.
"""
import argparse
import json
import subprocess
from pathlib import Path

import librosa
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 22050
HOP = 256
BARS = ' ▁▂▃▄▅▆▇█'


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(SR),
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32)
    if len(y) == 0:
        raise SystemExit(f'{path} has no audio.')
    return y


def frames_to_time(frames):
    return librosa.frames_to_time(frames, sr=SR, hop_length=HOP)


def low_band(y):
    """Onset strength and energy below ~150 Hz: kicks and bass."""
    spec = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP))
    low = spec[librosa.fft_frequencies(sr=SR, n_fft=2048) < 150]
    onsets = librosa.onset.onset_strength(S=librosa.amplitude_to_db(low, ref=np.max), sr=SR, hop_length=HOP)
    return onsets, (low ** 2).sum(axis=0)


def at_times(curve, times, window=0.05):
    """Peak of a frame-rate curve within ±window of each time."""
    half = max(1, int(window * SR / HOP))
    idx = librosa.time_to_frames(times, sr=SR, hop_length=HOP)
    return np.array([curve[max(0, i - half):i + half + 1].max() if i < len(curve) else 0.0 for i in idx])


def refine(y, beats, window=0.05):
    """Move each beat onto the attack it belongs to, measured at ~3 ms resolution."""
    hop = 64
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop, n_fft=512)
    times = librosa.frames_to_time(np.arange(len(env)), sr=SR, hop_length=hop)
    refined = []
    for b in beats:
        lo, hi = np.searchsorted(times, [b - window, b + window])
        refined.append(times[lo + int(np.argmax(env[lo:hi]))] if hi - lo >= 3 else b)
    return np.array(refined)


def analyze(path):
    y = load(path)
    duration = len(y) / SR
    onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    _, beat_frames = librosa.beat.beat_track(onset_envelope=onset, sr=SR, hop_length=HOP)
    beats = refine(y, frames_to_time(beat_frames))
    if len(beats) < 8:
        raise SystemExit('Could not find a steady beat in this audio.')

    # A straight line through the beats gives a steady grid; the residual says how steady the song is.
    index = np.arange(len(beats))
    period, offset = np.polyfit(index, beats, 1)
    error = float(np.median(np.abs(beats - (offset + index * period))))
    offset = float(offset % period)
    bpm = 60.0 / period

    low, low_energy = low_band(y)
    kick = at_times(low, beats)
    strength = at_times(onset, beats)
    phase = int(np.argmax([kick[p::4].mean() for p in range(4)]))
    downbeats = beats[phase::4]

    # Accents: the beats that hit hardest overall and in the low end.
    score = strength / (strength.max() or 1) + kick / (kick.max() or 1)
    accents = beats[score >= np.percentile(score, 88)]

    # Drops: grid beats where the next 4 s carry far more low end (kick, bass) and loudness than
    # the 4 s before. Scoring whole beats keeps risers, which are all treble, from pulling it early.
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0]
    per_second = int(SR / HOP)
    span = 4 * per_second
    lift = lambda curve, i: curve[i:i + span].mean() / (curve[i - span:i].mean() + 1e-9)
    jumps = []
    for k in range(int(np.ceil((4 - offset) / period)), int((duration - 4 - offset) / period) + 1):
        t = offset + k * period
        i = int(librosa.time_to_frames(t, sr=SR, hop_length=HOP))
        if span <= i <= len(rms) - span:
            jumps.append((float(np.sqrt(lift(rms, i) * lift(low_energy, i))), float(t)))
    drops = []
    for ratio, t in sorted(jumps, reverse=True):
        if ratio > 1.4 and all(abs(t - d) > 8 for d, _ in drops):
            drops.append((t, ratio))
        if len(drops) == 3:
            break

    seconds = [rms[i:i + per_second].mean() for i in range(0, len(rms), per_second)]
    ref = np.percentile(seconds, 95) or 1.0
    energy = ''.join(BARS[min(8, int(8 * s / ref))] for s in seconds)

    steady = error < 0.02
    print(f'{path.name}: {duration:.1f}s, {bpm:.2f} BPM, {len(beats)} beats, '
          f'grid error ±{error * 1000:.0f} ms ({"steady: use grid" if steady else "drifts: use beats list"})')
    print('Energy, one char per second (one line = 60s):')
    for i in range(0, len(energy), 60):
        print(f'  {i:4d}s |{energy[i:i + 60]}|')
    print('Drops / big lifts: ' + (', '.join(f'{t:.2f}s (x{r:.1f})' for t, r in sorted(drops)) or 'none found'))
    print('First downbeats: ' + ', '.join(f'{t:.2f}' for t in downbeats[:8]))
    print('Accents: ' + ', '.join(f'{t:.2f}' for t in accents[:24]) + (' ...' if len(accents) > 24 else ''))
    print('\nFor the edit:')
    if steady:
        print(f'  grid: {{ bpm: {bpm:.3f}, offset: {offset:.3f} }},')
    else:
        print(f'  beats: <the "beats" array in analysis/{path.stem}.beats.json>,')
    hits = sorted(d for d, _ in drops)
    print(f'  hits: [{", ".join(f"{h:.3f}" for h in hits)}],')

    data = {
        'file': path.name, 'duration': round(duration, 3), 'bpm': round(bpm, 4), 'offset': round(offset, 4),
        'gridError': round(error, 4), 'beats': np.round(beats, 4).tolist(), 'downbeats': np.round(downbeats, 4).tolist(),
        'accents': np.round(accents, 4).tolist(), 'drops': [round(d, 3) for d, _ in sorted(drops)],
        'energy': np.round(np.array(seconds) / ref, 3).tolist(),
    }
    dest = ROOT / 'analysis' / f'{path.stem}.beats.json'
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(data) + '\n')
    print(f'\nSaved {dest.relative_to(ROOT)}')


def features(y):
    """Onset and harmony curves, each standardised, at the same frame rate."""
    onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP)
    chroma = librosa.feature.chroma_cens(y=y, sr=SR, hop_length=HOP)
    n = min(len(onset), chroma.shape[1])
    z = lambda a: (a - a.mean(axis=-1, keepdims=True)) / (a.std(axis=-1, keepdims=True) + 1e-9)
    return z(onset[:n]), z(chroma[:, :n])


def sync(master, clips):
    song_onset, song_chroma = features(load(master))
    offsets = {}
    for clip in clips:
        onset, chroma = features(load(clip))
        lags = signal.correlation_lags(len(song_onset), len(onset), mode='full')
        score = signal.correlate(song_onset, onset, mode='full', method='fft') / len(onset)
        harmony = sum(signal.correlate(song_chroma[k], chroma[k], mode='full', method='fft')
                      for k in range(12)) / (12 * len(onset))
        combined = score + harmony
        k = int(np.argmax(combined))
        # Sub-frame refinement on the peak.
        if 0 < k < len(combined) - 1:
            a, b, c = combined[k - 1:k + 2]
            shift = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0.0
        else:
            shift = 0.0
        offset = float((lags[k] + shift) * HOP / SR)
        # Confidence: how far the peak stands above the best match more than 0.3 s away.
        guard = int(0.3 * SR / HOP)
        rest = np.concatenate([combined[:max(0, k - guard)], combined[k + guard + 1:]])
        margin = float((combined[k] - rest.max()) / (combined.std() + 1e-9)) if len(rest) else 0.0
        verdict = 'strong' if margin > 3 else 'ok' if margin > 1.5 else 'weak: check by eye'
        print(f'{clip.name}: songTime = clipTime {"+" if offset >= 0 else "-"} {abs(offset):.3f}s  '
              f'(confidence {margin:.1f}, {verdict})')
        if margin <= 3:
            # Repeated choruses match more than once; list the runners-up so the edit can pick.
            others = []
            for i in np.argsort(-combined):
                if abs(i - k) > 4 * guard and all(abs(i - j) > 4 * guard for j in others):
                    others.append(int(i))
                if len(others) == 2:
                    break
            print('    also plausible: ' + ', '.join(f'{lags[i] * HOP / SR:+.3f}s' for i in others))
        try:
            key = clip.resolve().relative_to(ROOT / 'public').as_posix()
        except ValueError:
            key = clip.name
        offsets[key] = round(offset, 3)

    dest = ROOT / 'analysis' / 'sync.json'
    existing = json.loads(dest.read_text()) if dest.exists() else {}
    existing.update(offsets)
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(existing, indent=2) + '\n')
    print('\nFor the edit:\n  sync: {')
    for key, value in offsets.items():
        print(f"    '{key}': {value},")
    print('  },')
    print(f'Saved {dest.relative_to(ROOT)}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('analyze', help='tempo, grid, accents and drops')
    a.add_argument('audio', type=Path)
    s = sub.add_parser('sync', help="find each clip's offset inside the song")
    s.add_argument('master', type=Path)
    s.add_argument('clips', type=Path, nargs='+')
    args = parser.parse_args()
    if args.cmd == 'analyze':
        analyze(args.audio)
    else:
        sync(args.master, args.clips)


if __name__ == '__main__':
    main()

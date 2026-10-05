#!/usr/bin/env python3
"""Synthetic test material for the `demo` edit: a smoke test for the whole pipeline.

Writes raw/demo/demo-hdr.mov (iPhone-like: HEVC 10-bit HLG, 60 fps, stored sideways
with a rotation flag), raw/demo/demo-sdr.mp4 (landscape H.264, 30 fps) and
raw/demo/demo-beat.wav (120 BPM, drop at 16 s). The clips' audio is the song as a
phone would hear it, starting at song time 10 s and 13 s respectively, so
`beats.py sync` has something real to find. Then: python3 scripts/prep.py raw/demo/*
"""
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
SONG_SECONDS = 40
CLIP_SECONDS = 16
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
rng = np.random.default_rng(7)


def envelope(n, decay):
    return np.exp(-np.arange(n) / SR * decay)


def song():
    out = np.zeros(SR * SONG_SECONDS)

    def add(at, sound, gain=1.0):
        i = int(round(at * SR))
        n = min(len(sound), len(out) - i)
        out[i:i + n] += gain * sound[:n]

    n = int(0.35 * SR)
    freq = 45 + 90 * np.exp(-np.arange(n) / SR * 30)
    kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * envelope(n, 9)
    hat = np.diff(rng.standard_normal(int(0.05 * SR) + 1)) * envelope(int(0.05 * SR), 90)
    b, a = signal.butter(2, [1000, 3000], btype='band', fs=SR)
    clap = signal.lfilter(b, a, rng.standard_normal(int(0.2 * SR))) * envelope(int(0.2 * SR), 25)
    crash = np.diff(rng.standard_normal(2 * SR + 1)) * envelope(2 * SR, 2.5)

    chords = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]
    bar = 2.0
    for k in range(int(SONG_SECONDS / bar)):
        tt = np.arange(int(bar * SR)) / SR
        shape = np.minimum(1, tt / 0.3) * np.minimum(1, (bar - tt) / 0.3)
        chord = chords[k % 4]
        add(k * bar, sum(np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.003 * tt) for f in chord) * shape, 0.05)
        if k * bar >= 16:
            for e in range(8):
                te = np.arange(int(0.24 * SR)) / SR
                add(k * bar + e * 0.25, np.sin(2 * np.pi * chord[0] / 2 * te) * np.exp(-te * 8), 0.3)

    for i in range(int(SONG_SECONDS / 0.25)):
        add(i * 0.25, hat, 0.12)
    for beat in range(int(SONG_SECONDS / 0.5)):
        t = beat * 0.5
        if t >= 16 or beat % 4 == 0:
            add(t, kick, 0.9)
        if t >= 16 and beat % 4 in (1, 3):
            add(t, clap, 0.5)
    riser = np.arange(4 * SR) / (4 * SR)
    add(12, np.diff(rng.standard_normal(4 * SR + 1)) * riser ** 2, 0.15)
    add(16, crash, 0.3)
    return 0.9 * out / np.abs(out).max()


def phone_mic(audio):
    b, a = signal.butter(4, 6000, fs=SR)
    noisy = signal.lfilter(b, a, audio) * 0.6 + 0.02 * rng.standard_normal(len(audio))
    return np.clip(noisy, -1, 1)


def make_clip(dest, audio, width, height, fps, label, dancer_x, busy, hdr):
    """testsrc2 plus an orange 'dancer' that moves hard during `busy` and a burned-in source clock."""
    a, b = busy
    move = f"if(between(t,{a},{b}),{width * 0.3:.0f},{width * 0.06:.0f})*sin(t*5)"
    graph = (
        f'testsrc2=s={width}x{height}:r={fps}:d={CLIP_SECONDS}{",hue=h=140" if not hdr else ""}[bg];'
        f'color=c=orange:s={width // 5}x{height // 4}:r={fps}:d={CLIP_SECONDS}[dancer];'
        f"[bg][dancer]overlay=x='{width * dancer_x:.0f}-overlay_w/2+{move}':y='(main_h-overlay_h)/2',"
        f"drawtext=fontfile={FONT}:text='{label} %{{pts\\:hms}}':fontsize={height // 27}:fontcolor=white:"
        f'box=1:boxcolor=black@0.6:boxborderw=12:x=(w-tw)/2:y=h*0.7'
    )
    if hdr:
        # Real HLG: convert the SDR picture into BT.2020 / HLG, then store it sideways like an iPhone does.
        graph += (',setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv,format=yuv420p,'
                  'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt2020:t=arib-std-b67:m=bt2020nc:r=tv,'
                  'format=yuv420p10le,transpose=1')
        codec = ['-c:v', 'libx265', '-preset', 'ultrafast', '-crf', '20', '-tag:v', 'hvc1',
                 '-x265-params', 'colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:log-level=error',
                 '-color_primaries', 'bt2020', '-color_trc', 'arib-std-b67', '-colorspace', 'bt2020nc']
    else:
        graph += ',format=yuv420p'
        codec = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-colorspace', 'bt709',
                 '-color_primaries', 'bt709', '-color_trc', 'bt709']

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'mic.wav'
        sf.write(wav, np.stack([audio, audio], axis=1), SR)
        encoded = Path(tmp) / f'encoded{dest.suffix}'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-filter_complex', graph, '-i', str(wav),
                        *codec, '-c:a', 'aac', '-b:a', '192k', '-shortest', str(encoded)], check=True)
        if hdr:
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-display_rotation:v:0', '90',
                            '-i', str(encoded), '-c', 'copy', str(dest)], check=True)
        else:
            encoded.replace(dest)
    print(f'Wrote {dest.relative_to(ROOT)}')


def main():
    raw = ROOT / 'raw' / 'demo'
    raw.mkdir(parents=True, exist_ok=True)
    music = song()
    sf.write(raw / 'demo-beat.wav', np.stack([music, music], axis=1), SR, subtype='PCM_16')
    print(f'Wrote {(raw / "demo-beat.wav").relative_to(ROOT)}')
    mic = lambda start: phone_mic(music[int(start * SR):int((start + CLIP_SECONDS) * SR)])
    make_clip(raw / 'demo-hdr.mov', mic(10), 1080, 1920, 60, 'HDR', 0.5, (5, 9), hdr=True)
    make_clip(raw / 'demo-sdr.mp4', mic(13), 1920, 1080, 30, 'SDR', 0.35, (2, 6), hdr=False)


if __name__ == '__main__':
    main()

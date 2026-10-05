import type { ReelEdit } from '../reel/types';

/**
 * Smoke test for the whole pipeline on synthetic footage (`python3 scripts/demo_assets.py`).
 * The grid and sync numbers below are what scripts/beats.py measures on those files.
 */
export const demo: ReelEdit = {
  id: 'demo',
  music: { src: 'music/demo-beat.wav', startAt: 12, fadeOut: 0.5 },
  grid: { bpm: 120.005, offset: 0.007 },
  hits: [16.004],
  sync: { 'footage/demo-hdr.mp4': 9.992, 'footage/demo-sdr.mp4': 12.991 },
  look: 'golden',
  pulse: 0.02,
  lightLeaks: 0.4,
  clips: [
    { src: 'footage/demo-hdr.mp4', beats: 4, in: 'fade', zoom: [1, 1.08] },
    { src: 'footage/demo-sdr.mp4', beats: 2, in: 'flash', focus: { x: 0.35 } },
    {
      src: 'footage/demo-hdr.mp4',
      beats: 4,
      in: 'whip-left',
      speed: [
        { at: 0, speed: 1 },
        { at: 0.6, speed: 0.35 },
        { at: 1.6, speed: 1 },
      ],
    },
    { src: 'footage/demo-sdr.mp4', beats: 2, in: 'zoom', pan: { x: [0.3, 0.7] } },
    { src: 'footage/demo-hdr.mp4', beats: 2, in: 'glitch' },
    { src: 'footage/demo-sdr.mp4', beats: 2, in: 'shake', grade: { bw: true, contrast: 1.25 } },
    { src: 'footage/demo-hdr.mp4', beats: 2, in: 'blur', mirror: true },
    { src: 'footage/demo-sdr.mp4', beats: 2, in: 'whip-right' },
  ],
  texts: [
    { text: 'wait for the drop', at: 0.3, duration: 1.6, style: 'luxe', animation: 'rise' },
    { text: 'DROP', at: 4, duration: 1, style: 'bold', animation: 'pop' },
    { text: 'Golden hour', at: 6, duration: 1.8, style: 'script', position: 'top', animation: 'type' },
    { text: '@yourhandle', at: 8, duration: 2, style: 'minimal', position: 'bottom', animation: 'track' },
  ],
};

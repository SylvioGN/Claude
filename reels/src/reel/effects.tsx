import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export const Vignette: React.FC<{ amount: number }> = ({ amount }) =>
  amount > 0 ? (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 70% at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,${0.85 * amount}) 100%)`,
      }}
    />
  ) : null;

/** Film grain: fresh seeded noise every frame at half resolution, softly upscaled. */
export const Grain: React.FC<{ amount: number }> = ({ amount }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || amount <= 0) {
      return;
    }
    const image = ctx.createImageData(w, h);
    let s = (frame + 1) * 2654435761;
    for (let i = 0; i < image.data.length; i += 4) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const v = s >>> 24;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [frame, w, h, amount]);

  if (amount <= 0) {
    return null;
  }
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: 0.4 * amount }}>
      <canvas ref={ref} width={w} height={h} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  );
};

/** Warm light drifting across the frame. */
export const LightLeaks: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (intensity <= 0) {
    return null;
  }
  const t = frame / fps;
  const ax = 82 + 22 * Math.sin(t * 0.37);
  const ay = 16 + 12 * Math.cos(t * 0.29);
  const bx = 14 + 18 * Math.cos(t * 0.23 + 1);
  const by = 84 + 10 * Math.sin(t * 0.31 + 2);
  const breathe = 0.75 + 0.25 * Math.sin(t * 0.9);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: intensity * breathe,
        background: [
          `radial-gradient(circle at ${ax}% ${ay}%, rgba(255,140,60,0.55), rgba(255,140,60,0) 45%)`,
          `radial-gradient(circle at ${bx}% ${by}%, rgba(255,70,130,0.45), rgba(255,70,130,0) 40%)`,
        ].join(', '),
      }}
    />
  );
};

export const Wash: React.FC<{ color: string; opacity: number }> = ({ color, opacity }) =>
  opacity > 0.005 ? <AbsoluteFill style={{ backgroundColor: color, opacity: Math.min(1, opacity) }} /> : null;

/** Areas Instagram covers with its own UI on a Reel (1080×1920). Studio-only guide. */
export const SafeZones: React.FC = () => {
  const zone = (style: React.CSSProperties, label: string) => (
    <div
      style={{
        position: 'absolute',
        background: 'rgba(255,0,60,0.28)',
        border: '2px dashed rgba(255,255,255,0.7)',
        color: 'white',
        font: '600 26px sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {label}
    </div>
  );
  return (
    <AbsoluteFill>
      {zone({ left: 0, right: 0, top: 0, height: 220 }, 'Reels header')}
      {zone({ left: 0, right: 0, bottom: 0, height: 420 }, 'Caption / audio')}
      {zone({ right: 0, width: 150, top: 1000, bottom: 420 }, 'Buttons')}
    </AbsoluteFill>
  );
};

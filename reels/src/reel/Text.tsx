import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import './fonts';
import type { TextOverlay, TextStyle } from './types';

const STYLES: Record<TextStyle, { size: number; letterSpacing: number; css: React.CSSProperties }> = {
  luxe: {
    size: 96,
    letterSpacing: 0.01,
    css: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontStyle: 'italic',
      fontWeight: 400,
      lineHeight: 1.08,
      textShadow: '0 6px 40px rgba(0,0,0,0.55)',
    },
  },
  bold: {
    size: 150,
    letterSpacing: 0.01,
    css: {
      fontFamily: 'Anton, Impact, sans-serif',
      textTransform: 'uppercase',
      lineHeight: 0.95,
      textShadow: '0 8px 34px rgba(0,0,0,0.5)',
    },
  },
  script: {
    size: 150,
    letterSpacing: 0,
    css: {
      fontFamily: '"Great Vibes", cursive',
      lineHeight: 1.05,
      textShadow: '0 0 30px rgba(255,190,150,0.55), 0 4px 24px rgba(0,0,0,0.45)',
    },
  },
  minimal: {
    size: 40,
    letterSpacing: 0.42,
    css: {
      fontFamily: 'Montserrat, sans-serif',
      fontWeight: 600,
      textTransform: 'uppercase',
      lineHeight: 1.5,
      textShadow: '0 2px 18px rgba(0,0,0,0.6)',
    },
  },
};

// Keeps text clear of Instagram's header, caption and side buttons.
const POSITIONS: Record<NonNullable<TextOverlay['position']>, React.CSSProperties> = {
  top: { justifyContent: 'flex-start', padding: '300px 90px 0' },
  center: { justifyContent: 'center', padding: '0 90px 160px' },
  bottom: { justifyContent: 'flex-end', padding: '0 170px 520px 90px' },
};

const EXIT_FRAMES = 8;

export const Text: React.FC<{ overlay: TextOverlay; durationInFrames: number }> = ({ overlay, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = STYLES[overlay.style ?? 'luxe'];
  const animation = overlay.animation ?? 'rise';

  const leaving = interpolate(frame, [durationInFrames - EXIT_FRAMES, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const easeOut = Easing.out(Easing.cubic);

  let wholeScale = 1;
  let wholeOpacity = 1;
  let letterSpacing = style.letterSpacing;
  let visibleChars = Infinity;
  if (animation === 'pop') {
    const s = spring({ frame, fps, config: { damping: 11, mass: 0.6 } });
    wholeScale = 0.6 + 0.4 * s;
    wholeOpacity = Math.min(1, frame / 4);
  } else if (animation === 'track') {
    const p = easeOut(Math.min(1, frame / 22));
    letterSpacing += (1 - p) * 0.5;
    wholeOpacity = p;
  } else if (animation === 'type') {
    visibleChars = Math.floor(frame / 1.5);
  }

  let charIndex = 0;
  let wordIndex = 0;
  const lines = overlay.text.split('\n').map((line, li) => (
    <div key={li}>
      {line.split(' ').map((word, wi) => {
        const index = wordIndex++;
        const start = charIndex;
        charIndex += word.length + 1;
        let opacity = 1;
        let y = 0;
        let blur = 0;
        if (animation === 'rise') {
          const p = easeOut(Math.min(1, Math.max(0, (frame - index * 3) / 12)));
          opacity = p;
          y = (1 - p) * 40;
          blur = (1 - p) * 10;
        }
        const shown = animation === 'type' ? word.slice(0, Math.max(0, visibleChars - start)) : word;
        return (
          <span
            key={wi}
            style={{
              display: 'inline-block',
              whiteSpace: 'pre',
              opacity,
              transform: `translateY(${y}px)`,
              filter: blur > 0.1 ? `blur(${blur}px)` : undefined,
            }}
          >
            {shown}
            {wi < line.split(' ').length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  ));

  return (
    <AbsoluteFill style={{ alignItems: 'center', textAlign: 'center', ...POSITIONS[overlay.position ?? 'center'] }}>
      <div
        style={{
          ...style.css,
          fontSize: overlay.size ?? style.size,
          letterSpacing: `${letterSpacing}em`,
          color: overlay.color ?? '#ffffff',
          opacity: wholeOpacity * (1 - leaving),
          transform: `scale(${wholeScale}) translateY(${-10 * leaving}px)`,
          filter: leaving > 0.01 ? `blur(${8 * leaving}px)` : undefined,
        }}
      >
        {lines}
      </div>
    </AbsoluteFill>
  );
};

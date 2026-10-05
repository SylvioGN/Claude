import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Easing,
  Freeze,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { toneTables } from './looks';
import { WHIP_HALF, type TimedClip } from './timeline';
import { coverScale, enterFx, exitFx, neutralFx } from './transitions';
import type { Grade, Transition } from './types';

const R_ONLY = '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
const G_ONLY = '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0';
const B_ONLY = '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';

/** One SVG filter per clip, built from only the stages this frame needs. */
const FxFilter: React.FC<{
  id: string;
  tones: [string, string, string] | null;
  glow: number;
  rgbSplit: number;
  blur: number;
  motionBlur: number;
}> = ({ id, tones, glow, rgbSplit, blur, motionBlur }) => {
  const stages: React.ReactNode[] = [];
  let last = 'SourceGraphic';
  if (tones) {
    stages.push(
      <feComponentTransfer key="tone" in={last} result="tone">
        <feFuncR type="table" tableValues={tones[0]} />
        <feFuncG type="table" tableValues={tones[1]} />
        <feFuncB type="table" tableValues={tones[2]} />
      </feComponentTransfer>,
    );
    last = 'tone';
  }
  if (glow > 0) {
    // Isolate the highlights, blur them and screen them back on top.
    stages.push(
      <feComponentTransfer key="hi" in={last} result="hi">
        <feFuncR type="linear" slope={2.2} intercept={-1.4} />
        <feFuncG type="linear" slope={2.2} intercept={-1.4} />
        <feFuncB type="linear" slope={2.2} intercept={-1.4} />
      </feComponentTransfer>,
      <feGaussianBlur key="hiBlur" in="hi" stdDeviation={26} result="hiBlur" />,
      <feComponentTransfer key="glow" in="hiBlur" result="glow">
        <feFuncR type="linear" slope={glow} />
        <feFuncG type="linear" slope={glow} />
        <feFuncB type="linear" slope={glow} />
      </feComponentTransfer>,
      <feBlend key="bloom" in={last} in2="glow" mode="screen" result="bloom" />,
    );
    last = 'bloom';
  }
  if (rgbSplit > 0.5) {
    stages.push(
      <feColorMatrix key="r" in={last} type="matrix" values={R_ONLY} result="r" />,
      <feOffset key="r2" in="r" dx={rgbSplit} dy={0} result="r2" />,
      <feColorMatrix key="g" in={last} type="matrix" values={G_ONLY} result="g" />,
      <feColorMatrix key="b" in={last} type="matrix" values={B_ONLY} result="b" />,
      <feOffset key="b2" in="b" dx={-rgbSplit} dy={0} result="b2" />,
      <feBlend key="rg" in="r2" in2="g" mode="screen" result="rg" />,
      <feBlend key="rgb" in="rg" in2="b2" mode="screen" result="split" />,
    );
    last = 'split';
  }
  if (blur + motionBlur > 0.3) {
    stages.push(
      <feGaussianBlur key="blur" in={last} stdDeviation={`${blur + motionBlur} ${blur}`} edgeMode="duplicate" />,
    );
  }
  if (stages.length === 0) {
    return null;
  }
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          {stages}
        </filter>
      </defs>
    </svg>
  );
};

export const ClipLayer: React.FC<{
  clip: TimedClip;
  /** The next clip's entry effect, which this clip exits with. */
  exit: Transition | undefined;
  grade: Grade;
}> = ({ clip, exit, grade }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const tones = useMemo(() => toneTables(grade), [grade]);

  const f = frame - clip.preRoll;
  const roll = Math.round(WHIP_HALF * fps);
  const fx = neutralFx();
  enterFx(fx, clip.in, f, fps, roll, `clip-${clip.index}`);
  exitFx(fx, exit, clip.durationInFrames - f, fps, roll);

  const p = Math.min(1, Math.max(0, f / Math.max(1, clip.durationInFrames - 1)));
  const ease = Easing.inOut(Easing.sin);
  const zoom = Array.isArray(clip.zoom)
    ? interpolate(ease(p), [0, 1], clip.zoom)
    : (clip.zoom ?? 1);
  const focusX = clip.pan?.x ? interpolate(ease(p), [0, 1], clip.pan.x) : (clip.focus?.x ?? 0.5);
  const focusY = clip.pan?.y ? interpolate(ease(p), [0, 1], clip.pan.y) : (clip.focus?.y ?? 0.5);
  const rotate = clip.rotate ?? 0;

  const layerScale = fx.keepCovered
    ? Math.max(fx.scale, coverScale(fx.rotate, fx.x, fx.y, width, height))
    : fx.scale;
  const videoScale = zoom * coverScale(rotate, 0, 0, width, height);

  const filterId = `fx-${clip.index}`;
  const hasSvg = tones || grade.glow > 0 || fx.rgbSplit > 0.5 || fx.blur + fx.motionBlur > 0.3;
  const filter = [
    hasSvg ? `url(#${filterId})` : '',
    `contrast(${grade.contrast})`,
    `saturate(${grade.bw ? 0 : grade.saturation})`,
    `brightness(${grade.brightness * fx.exposure})`,
  ].join(' ');

  const sourceTime = clip.sourceTimes[Math.min(clip.sourceTimes.length - 1, Math.max(0, frame))];

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${fx.x}%, ${fx.y}%) rotate(${fx.rotate}deg) scale(${layerScale})${clip.mirror ? ' scaleX(-1)' : ''}`,
        overflow: 'hidden',
      }}
    >
      <FxFilter
        id={filterId}
        tones={tones}
        glow={grade.glow}
        rgbSplit={fx.rgbSplit}
        blur={fx.blur}
        motionBlur={fx.motionBlur}
      />
      <Freeze frame={sourceTime * fps}>
        <OffthreadVideo
          src={staticFile(clip.src)}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${focusX * 100}% ${focusY * 100}%`,
            transform: `scale(${videoScale}) rotate(${rotate}deg)`,
            transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
            filter,
          }}
        />
      </Freeze>
      {fx.flash > 0.005 ? <AbsoluteFill style={{ backgroundColor: '#fff4ea', opacity: Math.min(1, fx.flash) }} /> : null}
      {fx.black > 0.005 ? <AbsoluteFill style={{ backgroundColor: '#000', opacity: Math.min(1, fx.black) }} /> : null}
    </AbsoluteFill>
  );
};

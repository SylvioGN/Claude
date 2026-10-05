import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Html5Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  type CalculateMetadataFunction,
} from 'remotion';
import { parseMedia } from '@remotion/media-parser';
import { ClipLayer } from './ClipLayer';
import { Grain, LightLeaks, SafeZones, Vignette, Wash } from './effects';
import { resolveGrade } from './looks';
import { Text } from './Text';
import { resolveTimeline, sourceEnd, type Timeline } from './timeline';
import type { ReelEdit, ReelProps } from './types';

const DEFAULT_FPS = 30;

/** 0 → 1 over `length` frames; a zero length means "already at 1". */
const ramp = (f: number, length: number) => (length > 0 ? Math.min(1, Math.max(0, f / length)) : 1);

/** Zoom bump that punches on each beat and decays; heavy hits punch harder. */
const beatPulse = (t: number, beats: number[], hits: number[], amount: number) => {
  if (amount <= 0) {
    return 1;
  }
  let scale = 1;
  for (const b of beats) {
    if (b > t) {
      break;
    }
    if (t - b < 0.5) {
      const isHit = hits.some((h) => Math.abs(h - b) < 0.06);
      scale = 1 + amount * (isHit ? 2.5 : 1) * Math.exp(-(t - b) / 0.1);
    }
  }
  return scale;
};

const hitFlash = (t: number, hits: number[]) => {
  let opacity = 0;
  for (const h of hits) {
    if (t >= h && t - h < 0.15) {
      opacity = Math.max(opacity, 0.28 * (1 - (t - h) / 0.15) ** 2);
    }
  }
  return opacity;
};

export const Reel: React.FC<ReelProps> = ({ edit, showSafeZones }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const timeline = useMemo(() => resolveTimeline(edit, fps), [edit, fps]);
  const grade = useMemo(() => resolveGrade(edit.look, edit.grade), [edit]);
  const clipGrades = useMemo(
    () => timeline.clips.map((clip) => resolveGrade(edit.look, edit.grade, clip.grade)),
    [edit, timeline],
  );
  const t = frame / fps;
  const music = edit.music;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${beatPulse(t, timeline.beats, timeline.hits, edit.pulse ?? 0)})` }}>
        {timeline.clips.map((clip, i) => (
          <Sequence
            key={i}
            name={`${i + 1}. ${clip.src}`}
            from={clip.startFrame - clip.preRoll}
            durationInFrames={clip.preRoll + clip.durationInFrames + clip.postRoll}
            premountFor={fps}
          >
            <ClipLayer clip={clip} exit={timeline.clips[i + 1]?.in} grade={clipGrades[i]} />
          </Sequence>
        ))}
      </AbsoluteFill>

      <LightLeaks intensity={edit.lightLeaks ?? 0} />
      <Vignette amount={grade.vignette} />
      <Grain amount={grade.grain} />
      <Wash color="#fff4ea" opacity={hitFlash(t, timeline.hits)} />

      {(edit.texts ?? []).map((overlay, i) => {
        const length = Math.max(1, Math.round(overlay.duration * fps));
        return (
          <Sequence key={i} name={`Text: ${overlay.text}`} from={Math.round(overlay.at * fps)} durationInFrames={length}>
            <Text overlay={overlay} durationInFrames={length} />
          </Sequence>
        );
      })}

      {edit.fadeOut ? (
        <Wash color="#000" opacity={ramp(frame + 1 - (durationInFrames - edit.fadeOut * fps), edit.fadeOut * fps)} />
      ) : null}

      {music ? (
        <Html5Audio
          src={staticFile(music.src)}
          trimBefore={(music.startAt ?? 0) * fps}
          volume={(f) =>
            (music.volume ?? 1) *
            Math.min(ramp(f, (music.fadeIn ?? 0) * fps), ramp(durationInFrames - f, (music.fadeOut ?? 0) * fps))
          }
        />
      ) : null}

      {timeline.clips
        .filter((clip) => (clip.volume ?? 0) > 0 && typeof (clip.speed ?? 1) === 'number')
        .map((clip) => (
          <Sequence key={`audio-${clip.index}`} from={clip.startFrame} durationInFrames={clip.durationInFrames} layout="none">
            <Html5Audio
              src={staticFile(clip.src)}
              trimBefore={clip.sourceTimes[clip.preRoll] * fps}
              playbackRate={(clip.speed as number | undefined) ?? 1}
              volume={clip.volume}
            />
          </Sequence>
        ))}

      {showSafeZones ? <SafeZones /> : null}
    </AbsoluteFill>
  );
};

const durations = new Map<string, Promise<number | null>>();
const durationOf = (src: string) => {
  let duration = durations.get(src);
  if (!duration) {
    duration = parseMedia({
      src: new URL(staticFile(src), window.location.origin).toString(),
      fields: { durationInSeconds: true },
      acknowledgeRemotionLicense: true,
    }).then((r) => r.durationInSeconds);
    durations.set(src, duration);
  }
  return duration;
};

/** Fail early, with a readable message, when an edit asks for footage or music that isn't there. */
const validate = async (edit: ReelEdit, timeline: Timeline, fps: number) => {
  const problems: string[] = [];
  const check = async (src: string, needed: number, what: string) => {
    try {
      const duration = await durationOf(src);
      if (duration !== null && needed > duration + 0.5 / fps) {
        problems.push(`${what} needs public/${src} up to ${needed.toFixed(2)}s, but it is ${duration.toFixed(2)}s long.`);
      }
    } catch {
      problems.push(`${what}: can't read public/${src}.`);
    }
  };
  await Promise.all([
    ...timeline.clips.map((clip) => check(clip.src, sourceEnd(clip, fps), `Clip ${clip.index + 1}`)),
    ...(edit.music
      ? [check(edit.music.src, (edit.music.startAt ?? 0) + timeline.durationInFrames / fps, 'The music')]
      : []),
  ]);
  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
};

export const calculateReelMetadata: CalculateMetadataFunction<ReelProps> = async ({ props }) => {
  const fps = props.edit.fps ?? DEFAULT_FPS;
  const timeline = resolveTimeline(props.edit, fps);
  await validate(props.edit, timeline, fps);
  return { fps, durationInFrames: timeline.durationInFrames };
};

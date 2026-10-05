import type { Clip, ReelEdit, Transition } from './types';

/** Whips overlap the two shots for this long on each side of the cut (s). */
export const WHIP_HALF = 0.135;

export const isWhip = (t: Transition | undefined) => t === 'whip-left' || t === 'whip-right';

export type TimedClip = Clip & {
  index: number;
  /** First frame after the cut into this clip. */
  startFrame: number;
  durationInFrames: number;
  /** Extra frames rendered before / after the clip so a whip can slide it in / out. */
  preRoll: number;
  postRoll: number;
  /** Source time (s) for every rendered frame, pre-roll included. */
  sourceTimes: number[];
};

export type Timeline = {
  clips: TimedClip[];
  /** Beat times on the reel's timeline (s). */
  beats: number[];
  /** Heavy hits on the reel's timeline (s). */
  hits: number[];
  durationInFrames: number;
};

const smoothstep = (p: number) => p * p * (3 - 2 * p);

/** Playback rate `t` seconds into a clip; keyframes are eased into each other. */
export const speedAt = (speed: Clip['speed'], t: number): number => {
  if (speed === undefined) {
    return 1;
  }
  if (typeof speed === 'number') {
    return speed;
  }
  if (speed.length === 0) {
    return 1;
  }
  if (t <= speed[0].at) {
    return speed[0].speed;
  }
  for (let i = 1; i < speed.length; i++) {
    const b = speed[i];
    if (t <= b.at) {
      const a = speed[i - 1];
      return a.speed + (b.speed - a.speed) * smoothstep((t - a.at) / (b.at - a.at));
    }
  }
  return speed[speed.length - 1].speed;
};

const beatsOnTimeline = (edit: ReelEdit): number[] => {
  const startAt = edit.music?.startAt ?? 0;
  if (edit.beats) {
    return edit.beats.map((b) => b - startAt).filter((b) => b > -0.05);
  }
  if (edit.grid) {
    const period = 60 / edit.grid.bpm;
    const first = Math.ceil((startAt - edit.grid.offset) / period - 0.05);
    // Ten minutes of grid is more than any reel needs.
    const count = Math.ceil(600 / period);
    return Array.from({ length: count }, (_, i) => edit.grid!.offset + (first + i) * period - startAt);
  }
  return [];
};

const nearestIndex = (values: number[], t: number) => {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - t) < Math.abs(values[best] - t)) {
      best = i;
    }
  }
  return best;
};

const label = (clip: Clip, index: number) => `Clip ${index + 1} (${clip.src})`;

export const resolveTimeline = (edit: ReelEdit, fps: number): Timeline => {
  const beats = beatsOnTimeline(edit);
  const startAt = edit.music?.startAt ?? 0;
  const roll = Math.round(WHIP_HALF * fps);

  let cursor = 0;
  let startFrame = 0;
  const clips = edit.clips.map((clip, index): TimedClip => {
    let end: number;
    if (clip.duration !== undefined) {
      end = cursor + clip.duration;
    } else if (clip.beats !== undefined) {
      if (beats.length < 2) {
        throw new Error(`${label(clip, index)} is measured in beats, but the edit has no grid or beats.`);
      }
      const target = nearestIndex(beats, cursor) + clip.beats;
      const period = beats[beats.length - 1] - beats[beats.length - 2];
      end = target < beats.length ? beats[target] : beats[beats.length - 1] + (target - beats.length + 1) * period;
    } else {
      throw new Error(`${label(clip, index)} needs a duration or a beat count.`);
    }

    const endFrame = Math.round(end * fps);
    const durationInFrames = endFrame - startFrame;
    if (durationInFrames < 1) {
      throw new Error(`${label(clip, index)} is shorter than one frame.`);
    }

    const offset = edit.sync?.[clip.src];
    const sourceStart = clip.from ?? (offset === undefined ? 0 : startAt + startFrame / fps - offset);
    if (sourceStart < 0) {
      throw new Error(`${label(clip, index)} would start ${(-sourceStart).toFixed(2)}s before its source begins.`);
    }

    const preRoll = index > 0 && isWhip(clip.in) ? roll : 0;
    const postRoll = isWhip(edit.clips[index + 1]?.in) ? roll : 0;

    // Integrate the speed curve frame by frame; the pre-roll runs backwards at the opening speed.
    const sourceTimes: number[] = [];
    const openingSpeed = speedAt(clip.speed, 0);
    for (let k = preRoll; k > 0; k--) {
      sourceTimes.push(Math.max(0, sourceStart - (k * openingSpeed) / fps));
    }
    let t = sourceStart;
    for (let f = 0; f < durationInFrames + postRoll; f++) {
      sourceTimes.push(t);
      t += speedAt(clip.speed, (f + 0.5) / fps) / fps;
    }

    cursor = end;
    startFrame = endFrame;
    return { ...clip, index, startFrame: endFrame - durationInFrames, durationInFrames, preRoll, postRoll, sourceTimes };
  });

  const hits = (edit.hits ?? []).map((h) => h - startAt).filter((h) => h > -0.05);
  return { clips, beats, hits, durationInFrames: startFrame };
};

/** Last source time (s) a clip shows, including the frame's own length. */
export const sourceEnd = (clip: TimedClip, fps: number) => {
  const last = clip.sourceTimes[clip.sourceTimes.length - 1];
  return last + speedAt(clip.speed, (clip.durationInFrames + clip.postRoll) / fps) / fps;
};

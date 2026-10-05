/** Effect on the cut into a clip. The outgoing clip plays the matching exit. */
export type Transition =
  | 'cut'
  | 'flash'
  | 'zoom'
  | 'whip-left'
  | 'whip-right'
  | 'shake'
  | 'glitch'
  | 'blur'
  | 'fade';

/** Speed keyframe: `at` is seconds into the clip (timeline time), `speed` the playback rate. */
export type SpeedKey = { at: number; speed: number };

export type Rgb = [number, number, number];

export type Grade = {
  /** 1 = neutral. */
  contrast: number;
  saturation: number;
  brightness: number;
  /** -1 cool .. 1 warm. */
  warmth: number;
  /** 0..1 lifted blacks for a matte film look. */
  fade: number;
  /** Split toning: colour pushed into the shadows / highlights (each channel roughly -0.1..0.1). */
  shadows: Rgb;
  highlights: Rgb;
  /** 0..1 highlight bloom. */
  glow: number;
  /** 0..1 dark edges. */
  vignette: number;
  /** 0..1 film grain. */
  grain: number;
  bw: boolean;
};

export type Clip = {
  /** File under public/, e.g. "footage/take-1.mp4". */
  src: string;
  /** Source time (s) the clip starts at. Omit to derive it from `edit.sync`, keeping the moves on the music. */
  from?: number;
  /** Length on the timeline in seconds... */
  duration?: number;
  /** ...or in beats of the music, cutting exactly on a beat. */
  beats?: number;
  /** Playback rate, or keyframes for a smooth speed ramp. */
  speed?: number | SpeedKey[];
  /** Crop focus inside the 9:16 frame, 0..1 (0.5 = centre). */
  focus?: { x?: number; y?: number };
  /** Move the focus across the clip: [start, end]. */
  pan?: { x?: [number, number]; y?: [number, number] };
  /** Constant zoom, or a slow push from [start, end]. */
  zoom?: number | [number, number];
  /** Degrees, e.g. to level a tilted phone. */
  rotate?: number;
  mirror?: boolean;
  in?: Transition;
  grade?: Partial<Grade>;
  /** Original audio volume. Only constant-speed clips play their audio. */
  volume?: number;
};

export type TextStyle = 'luxe' | 'bold' | 'script' | 'minimal';
export type TextAnimation = 'rise' | 'pop' | 'track' | 'type';

export type TextOverlay = {
  /** Use \n for line breaks. */
  text: string;
  /** Timeline seconds. */
  at: number;
  duration: number;
  style?: TextStyle;
  position?: 'top' | 'center' | 'bottom';
  animation?: TextAnimation;
  size?: number;
  color?: string;
};

export type ReelEdit = {
  /** Composition id: letters, numbers and dashes. */
  id: string;
  fps?: number;
  clips: Clip[];
  music?: {
    /** File under public/. */
    src: string;
    /** Song time (s) at the reel's first frame. */
    startAt?: number;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;
  };
  /** Steady beat grid in song time, from scripts/beats.py... */
  grid?: { bpm: number; offset: number };
  /** ...or explicit song-time beats for music that drifts. */
  beats?: number[];
  /** Song times of the heavy hits: bigger pulse and a light flash. */
  hits?: number[];
  /** Per-source offsets from `scripts/beats.py sync`: songTime = sourceTime + offset. */
  sync?: Record<string, number>;
  /** Zoom bump on every beat (0.02 = 2%). */
  pulse?: number;
  /** Named starting point for the grade; `grade` overrides individual values. */
  look?: LookName;
  grade?: Partial<Grade>;
  texts?: TextOverlay[];
  /** 0..1 warm light leaks drifting over the picture. */
  lightLeaks?: number;
  /** Seconds of fade to black at the end; 0 keeps the loop seamless. */
  fadeOut?: number;
};

export type LookName = 'golden' | 'moody' | 'rose' | 'clean' | 'noir';

export type ReelProps = {
  edit: ReelEdit;
  showSafeZones: boolean;
};

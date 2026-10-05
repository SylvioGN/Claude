import type { Grade, LookName } from './types';

export const NEUTRAL: Grade = {
  contrast: 1,
  saturation: 1,
  brightness: 1,
  warmth: 0,
  fade: 0,
  shadows: [0, 0, 0],
  highlights: [0, 0, 0],
  glow: 0,
  vignette: 0,
  grain: 0,
  bw: false,
};

export const LOOKS: Record<LookName, Grade> = {
  // Warm golden skin with a soft highlight bloom.
  golden: {
    contrast: 1.08,
    saturation: 1.1,
    brightness: 1.02,
    warmth: 0.35,
    fade: 0.04,
    shadows: [0.01, -0.005, 0.02],
    highlights: [0.04, 0.015, -0.03],
    glow: 0.35,
    vignette: 0.35,
    grain: 0.12,
    bw: false,
  },
  // Dark and contrasty, teal shadows against warm skin: night-out energy.
  moody: {
    contrast: 1.18,
    saturation: 0.92,
    brightness: 0.96,
    warmth: 0.12,
    fade: 0.06,
    shadows: [-0.02, 0.025, 0.05],
    highlights: [0.05, 0.02, -0.02],
    glow: 0.2,
    vignette: 0.55,
    grain: 0.2,
    bw: false,
  },
  // Soft pink and dreamy.
  rose: {
    contrast: 1.02,
    saturation: 1.05,
    brightness: 1.03,
    warmth: 0.12,
    fade: 0.1,
    shadows: [0.03, 0, 0.03],
    highlights: [0.05, 0, 0.03],
    glow: 0.45,
    vignette: 0.3,
    grain: 0.1,
    bw: false,
  },
  // Bright and crisp, barely graded.
  clean: {
    contrast: 1.06,
    saturation: 1.08,
    brightness: 1.03,
    warmth: 0.05,
    fade: 0,
    shadows: [0, 0, 0],
    highlights: [0, 0, 0],
    glow: 0.1,
    vignette: 0.15,
    grain: 0.05,
    bw: false,
  },
  // High-contrast black and white.
  noir: {
    contrast: 1.3,
    saturation: 0,
    brightness: 1,
    warmth: 0,
    fade: 0.05,
    shadows: [0, 0, 0],
    highlights: [0, 0, 0],
    glow: 0.25,
    vignette: 0.5,
    grain: 0.3,
    bw: true,
  },
};

export const resolveGrade = (look: LookName | undefined, ...overrides: (Partial<Grade> | undefined)[]): Grade =>
  Object.assign({}, look ? LOOKS[look] : NEUTRAL, ...overrides);

const STEPS = 17;

/**
 * feComponentTransfer tables (R, G, B) for lifted blacks, warmth and split toning.
 * Returns null when the grade leaves the tones untouched.
 */
export const toneTables = (grade: Grade): [string, string, string] | null => {
  const { fade, warmth, shadows, highlights } = grade;
  if (fade === 0 && warmth === 0 && shadows.every((v) => v === 0) && highlights.every((v) => v === 0)) {
    return null;
  }
  const lift = fade * 0.25;
  // Warmth pushes the mid-tones towards orange (or blue when negative).
  const warm = [0.08 * warmth, 0.015 * warmth, -0.08 * warmth];
  const table = (c: number) => {
    const values: string[] = [];
    for (let i = 0; i < STEPS; i++) {
      const x = i / (STEPS - 1);
      const v = lift + (1 - lift) * x + shadows[c] * (1 - x) ** 2 + highlights[c] * x ** 2 + warm[c] * 4 * x * (1 - x);
      values.push(Math.min(1, Math.max(0, v)).toFixed(4));
    }
    return values.join(' ');
  };
  return [table(0), table(1), table(2)];
};

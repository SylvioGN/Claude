import type { ReelEdit } from '../reel/types';
import { demo } from './demo';

/** Every edit listed here becomes a composition: `npx remotion render <id>`. */
export const edits: ReelEdit[] = [demo];

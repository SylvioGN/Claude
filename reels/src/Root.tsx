import React from 'react';
import { Composition } from 'remotion';
import { edits } from './edits';
import { Reel, calculateReelMetadata } from './reel/Reel';

/** One 1080×1920 composition per edit in src/edits; its length comes from the clips. */
export const RemotionRoot: React.FC = () => (
  <>
    {edits.map((edit) => (
      <Composition
        key={edit.id}
        id={edit.id}
        component={Reel}
        width={1080}
        height={1920}
        fps={edit.fps ?? 30}
        durationInFrames={1}
        defaultProps={{ edit, showSafeZones: false }}
        calculateMetadata={calculateReelMetadata}
      />
    ))}
  </>
);

# Editing dance reels

README.md has the setup and commands. This file is how to make an edit people stop scrolling for.

## Before cutting anything

- Run `prep.py`, then `review.py sheets` and `review.py motion` on every clip and actually look at
  the sheets. Note the strongest moves, the best facial expressions, eye contact with the camera,
  the sharpest frames, and anything to avoid (blur, bad framing, someone walking through).
- Run `beats.py analyze` on the song and `beats.py sync` on the clips. Pick the song section
  (usually the build into the drop or the chorus) and set `music.startAt` to a downbeat.

## The edit

- **Hook in the first second.** Open on the most striking moment: the best move, a look into the
  lens, a hair flip in slow motion. Never open on a slow start or the dancer walking into frame.
- **Cut on the beat.** Measure clips in `beats`: 2–4 bars in calm parts, 1–2 beats around the drop.
  Big moves land on `hits`.
- **Keep the dance on the music.** Use `sync` (omit `from`) so the choreography stays in time
  across cuts. Only break sync deliberately, for slow motion.
- **Slow motion sells it.** Ramp to 0.3–0.5x on body rolls, hip moves and hair flips, then snap
  back to 1x on the next beat. It is only smooth on 60 fps footage (prep keeps it).
- **Framing.** Keep the dancer large and centred (`focus`). Punch in (`zoom` 1.1–1.3) for details; a slow
  push-in (`zoom: [1, 1.08]`) adds tension in sensual sections.
- **Transitions.** Hard cuts plus `flash`/`zoom` on accents; whips for outfit or location changes;
  `glitch`/`shake` only on hard hits. Don't stack effects on every cut.
- **Look.** Default to `golden` (warm glowing skin) or `rose`; `moody` for night/club footage;
  `noir` for one contrasting moment. Keep skin tones natural.
- **Length.** 7–20 s. End on a frame that flows back into the opening so the loop is seamless
  (no `fadeOut`).
- **Text.** Little or none; one short line in `luxe` or `minimal` reads as confident.
- **Safe zones.** Faces and text stay out of the top 220 px, the bottom 420 px and the right
  150 px (`showSafeZones` in the Studio).
- **Tasteful.** Sexy means confident, alluring and cinematic, never explicit.

## Checking the result

- Render a `preview` first. Grab frames around every cut (ffmpeg `select`) and look at them; check
  the music timing with `beats.py analyze` on the render (the drop should land where planned).
- Pick a cover from the sharpest frames and render it with `npm run still`.
- If the song is a popular track, tell the user they may get better reach by adding it from
  Instagram's audio library and lining it up in-app, since the edit is already cut to it.

## Rules

- Never commit footage, music, review images or renders (they are git-ignored; keep it that way).
- Ask before posting or sending any footage anywhere.

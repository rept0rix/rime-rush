# Changelog

## [Unreleased]

## [v0.3.8]
### Security
- TanStack Start XSS fix confirmed: `@tanstack/react-start` 1.168.60 (`@tanstack/start-server-core` 1.169.39).
### Fixes
- `/privacy` and `/support` (no `.html`) now return the static pages via CDN rewrites.
- Clearer continue screen: short death cause (fell / rat / bat / ember / raider / hazard), `REVIVE · N coins` and a PLAY AGAIN button.
- Coach hint sits above the phone safe-area bottom (touch pads, HUD row and results already respect it).

## [v0.3.7]
- Visible touch pads on touch/narrow screens: ◀ LEFT, ▶ RIGHT (left thumb), ATK and a big ▲ JUMP (right thumb). Jump is now wired on touch.
- First-PLAY coach line says how to jump on touch and keyboard; moved above the pads.
- Haptics skip navigator.vibrate before the first user gesture (no blocked-call console spam).

## [v0.3.6]
- First-run ramp on floors 1-8: shorter gaps (72 up to the normal 88 by floor 8), wider platforms pulled off the walls, no creep until floor 4, no double spawns until floor 9, slower early rats. Floors 9+ unchanged.

## [v0.3.5]
- Climber outfits: Classic / Scarf / Stripe per climber, saved, shown in hub + lobby + climb

## [v0.3.4]
- 12-climber roster with names + portraits in hub (grid); distinct tints on field; lobby auto-unique colors

## [v0.3.3]
- Stickier climb feel: longer coyote/jump buffer, forgiving ledge overlap, clearer land squash through rejump

## [v0.3.2] — 2026-09-19
- Short clear land settle squash on ledge (snappy, not rubber)
- Soft ME ice glow halo (concentric #7ee7ff ellipses) instead of sharp square + diamond pip

## [v0.3.1] — 2026-09-14
- Full-height page (no bottom clip)
- Louder death whoosh on YOU FELL
- Kenney CC0 jump / double / super / land SFX

## [v0.3.0] — 2026-09-07
- Rival strip on timeline top (name, power, points, level, tiny avatar)
- English-only UI at runtime
- Plaque app icons and favicon
- Kill mechanical TTS that spoke actions

## [v0.2.0] — 2026-09-06
- One music bed (no lobby+climb stack)
- Multiplayer end: spectate winner, then close room with Home / Room

## [v0.1.0] — 2026-09-02
- Public play at https://rime-rush.vercel.app
- Neon shared board, combat i-frames, always-on mute

# RIME RUSH — Product Requirements

**Version:** 0.4 · **Updated:** 2026-08-31 · **Status:** Playable alpha  
**Owner:** Naor Yanko · **Repo:** [rept0rix/rime-rush](https://github.com/rept0rix/rime-rush)

This is the source of truth for *what the game is*, *who it is for*, and *what we ship next*. The README is the map. This file is the contract.

---

## 1. One-liner

An endless vertical ice-tower climber: chain jumps into combos, hunt and get hunted, climb past everyone else on the live tower.

משפט אחד בעברית: טיפוס קרח אינסופי — קומבו, יריבים, מגדל חי.

---

## 2. Why this exists

Phone arcades died into grey settings screens and endless menus. RIME RUSH should feel like a cabinet:

- You tap PLAY and you are already falling upward.
- The world looks hand-painted, not generated from rectangles.
- Other people are on the same tower, not in a friend list.
- Sound, shake, mute, profile — all plaques, never OS widgets.

If a session does not produce a story you would tell a friend in one sentence ("I hit x32 and an ember raider knocked me off"), the build failed.

---

## 3. Players

| Persona | What they want | What we give |
|---|---|---|
| **Kid / casual** | Instant play, loud juice, no tutorial wall | Big PLAY plaque, tap-anywhere, coach line for 3s |
| **Climber** | Beat yesterday's floor | Combo scoring, daily board, continue |
| **Social** | See friends on the tower | Presence, ROOM code, notes, live ghosts |
| **Signed-in** | Keep identity | Google / X avatar, logout, delete-account confirm |

Primary device: **phone**. Desktop is a first-class keyboard cousin, not a port.

Language: English UI art (PLAY / ROOM plaques). Copy can be EN/HE in `src/game/i18n.ts`. Default ship language: English plaques, Hebrew-friendly type.

---

## 4. Core loop

```
menu  →  PLAY  →  climb  →  combo grows  →  heat (music, speed, creeps)
                              ↓
                         fall / pit
                              ↓
                      continue? → back on tower
                              ↓
                         you fell  →  board / replay / home
```

**Win condition:** there isn't one. Height is the score. Combo is the skill. Survival is the tax.

**Fail condition:** camera leaves you. Pit, lunge, or idle death.

Scoring:

- Floor reached (primary, shown on board)
- Score (combo-weighted)
- Best combo (flex)

---

## 5. Pillars (non-negotiable)

1. **Feel over chrome.** If a control is a Material toggle, it is wrong. Plaques, wood, ice.
2. **Combo is the game.** Speed, jump, music stems, rival aggression all scale with it.
3. **The tower is shared.** Even in solo you see ghosts / bots. Isolation is a bug.
4. **Start in one tap.** No name wall, no loading gate, no how-to page.
5. **Mute means mute.** Music, stems, SFX, voice. One tile.
6. **Mobile does not crash.** One bad frame never kills the RAF loop.

---

## 6. Current product (ships today)

### 6.1 Hub

- Centered stack: logo → live line → PLAY. ROOM stays bottom-right.
- Profile (avatar if signed in), coins, board trophy, alerts bell.
- Settings live in pause: sound, shake, resume, home.
- Profile: status, logout (confirm), delete account (confirm).
- **No** empty "how to play" screen.

### 6.2 Run

- Fixed-timestep Canvas climber (`src/game/engine.ts`).
- 30 ledge styles from a single atlas + 9-slice + per-style FX.
- Hopper sprite (idle/run/jump/spin) + 3 alt skins.
- Creeps: rat, bat, ember, raider — hunt / telegraph / lunge.
- Ember raid bots on the tower.
- Weapons (blade / gun), pickups, powers, pit.
- Combo HUD only for the local climber (no sticker-bomb on every ghost).
- Pause overlay with mute + shake plaques.

### 6.3 Audio

- Four Pixabay stems: lobby, climb, heat, rush.
- Mix follows combo / scene. Capped gain. Mute pauses and zeros every element.
- Stems do **not** download until first unlock (PLAY).

### 6.4 Identity & data

- Guest local save (name, coins, mute, shake, bests).
- Optional Google / X via Better Auth.
- Scores, profiles, presence, notes, friends — Postgres (Neon) or PGLite.
- Presence ping is throttled (no flood on remount).

### 6.5 Live / multiplayer (today)

- **Live tower:** other climbers appear as ghosts from presence.
- **ROOM:** P2P WebRTC last-stand / race with a short code.
- Not yet a dedicated 50-player simulation server.

---

## 7. Out of scope (now)

- Tutorial / how-to page
- IAP / ads
- User-generated levels
- Full 3D
- Chat
- Season pass

---

## 8. Roadmap

### P0 — stability (always on)

- No white-screen, no stuck LOADING, no silent mute fail on iOS.
- Play starts on first tap, every device.
- Assets: menu is < 5 images. Rest loads after PLAY.

### P1 — dedicated live server

The user-facing ask: *move off the preview host onto a server that holds ≥ 50 concurrent climbers, then split into teams.*

| Need | Spec |
|---|---|
| Capacity | 50 simultaneous players without RAF/presence collapse |
| Authority | Server ticks floor occupancy; client still renders locally |
| Teams | **RIME** vs **EMBER** — spawn sides, score as faction |
| Rooms | Auto-shard when a tower exceeds ~16; codes still work |
| Ghosts | Interpolation, not raw ping flood |

Until this lands, P2P rooms stay as the party mode and presence stays cosmetic.

### P2 — juice

- Ledge FX pass (sparkle / drip / glow still uneven)
- Enemy silhouettes closer to CraftPix fighters
- Combo callouts only for local, bigger when it matters
- Music ducking when voice / SFX peak

### P3 — meta

- Daily seed tower
- Cosmetics shop (coins already exist)
- Clan / faction home
- Hebrew full art pass if plaques get localized

---

## 9. Technical contract

| Layer | Choice | Constraint |
|---|---|---|
| Loop | Canvas 2D, `FIXED_DT = 1/60` | try/catch per frame |
| View | 390×logical height, scale to CSS | dpr cap 1.25 on mobile |
| Sprites | atlas + hopper frames | menu loads idle only |
| Audio | WebAudio + HTMLAudio stems | mute = gain 0 + `el.pause()` + `el.muted` |
| UI | React 19, no game state in JSX besides HUD | engine is a class, not a hook |
| Auth | Better Auth, Google + X | delete = confirm modal |
| DB | PGLite default, `DATABASE_URL` → Neon | migrations in `/migrations` |
| Live | presence ≤ 1 Hz, P2P for rooms | no 50-player claim until P1 |

Mobile Safari: `roundRect` polyfill, no negative `drawImage`, empty buttons have a hit child.

---

## 10. Success metrics

A build is good when:

1. Cold open → PLAY is tappable in under 2s on mid-range Android.
2. A new player reaches floor 8 without reading anything.
3. Mute silences music on iPhone (not only SFX).
4. A 2-minute climb does not crash, hitch-loop, or freeze input.
5. After death, board + replay are one tap; no overlapping YOU FELL / CONTINUE.

North-star (post P1): 50 names on one tower, two colors, nobody asking "is anyone here?"

---

## 11. Changelog (product)

| Date | What changed in the product |
|---|---|
| 2026-08-31 | Repo published. PRD written. README is the GitHub face. |
| 2026-08-27 | Loading gate removed. Logo + PLAY stacked center. Assets deferred. Music compressed. |
| 2026-08-26 | 30-ledge atlas, creep sprites, mute path, HUD declutter, crash hardening. |
| 2026-08-24 | Arcade plaques for settings. Profile logout / delete with confirm. How-to removed. |
| earlier | Attract demo, P2P rooms, Better Auth, combo engine. |

---

## 12. Open questions

- Is the 50-player mode one shared endless tower or instanced matches?
- Do factions lock per account or per run?
- Do we keep P2P rooms after the dedicated server exists?

Until those are decided, P1 implements **one shared tower + faction tint**, shard at 16, and leaves ROOM codes as private instances.

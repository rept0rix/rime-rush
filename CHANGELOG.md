# Changelog

גרסה חיה: v0.3.7 | עובדים על: v0.3.8 | השינוי: תיקון XSS ב-TanStack Start

## [v0.3.8] — 2026-10-05

### Security
- **PATCH:** Fix TanStack Start XSS (GHSA-qx66-fv34-fjm8 / CVE-2026-102989) by bumping `@tanstack/react-start` to `1.168.60` (pulls `@tanstack/start-server-core@1.169.39`) and aligning `@tanstack/react-router` / `@tanstack/router-plugin`.
- Serve extensionless `/privacy` and `/support` as CDN rewrites to the static HTML pages.
- Clearer death screen: short English cause line (fell / rat / creep / hazard) and an obvious revive cost + PLAY AGAIN skip.
- Phone HUD: lift ATK / ROOM / result CTAs above the bottom safe area so labels are not clipped on ~390px viewports.

## [v0.3.7] — 2026-10-01

- Touch pads (live: `2315acc`).

## [v0.3.6] — earlier

- Privacy policy and support pages (`public/privacy.html`, `public/support.html`).

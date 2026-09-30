# Notes — AI Talk Radio (Ungated)

Engineering notes, the audit trail of the cleanup pass, and the limits worth knowing before deploying.

## Provenance

This repo was scaffolded in Google AI Studio and pushed to GitHub on 2026-09-29 as
`DeepSeekOracle/-Autonomous-AI-Talk-Radio` (two commits: *Initial commit*,
*feat: initialize AI Talk Radio application*). It arrived as a bare export — package named
`react-example` at version `0.0.0`, no README, no license file, no lockfile, no tests — which is what
the cleanup pass below addressed.

The sibling build `DeepSeekOracle/ai-talk-radio` is the **Studio Desk**: VoiceStudio OmniVoice / Edge /
Gemini engines, MP3 packs from `/api/shows/<id>/download`, a Dockerfile, server-side show storage and
an agent skill pack. That repo is the deployed Space. **This** repo is the browser-first build: one
process, no server-side archive, voicing done in the listener's browser.

Naming: the repository name carries a leading hyphen, and `ai-talk-radio` is already taken by the desk
build, so a rename would want to be something like `autonomous-ai-talk-radio`.

## Cleanup pass — what was wrong, and what changed

| # | Found | Evidence | Fix |
| --- | --- | --- | --- |
| 1 | `npm install` failed on a clean machine | `ERESOLVE`: root `esbuild ^0.25.0` vs `vite@8.3.1` peer range `^0.27 \|\| ^0.28` | `esbuild` → `^0.28.0`; install then added 180 packages in 11 s |
| 2 | `package.json` was still the AI Studio template | `"name": "react-example"`, `"version": "0.0.0"`, no description/license/author/repository/engines | real metadata, `homepage`, `repository`, `engines.node >= 20`, `selfcheck` script |
| 3 | No docs | no README, no license file, no notes anywhere in the tree | `README.md`, this file, `LICENSE` (Apache-2.0 — matches the SPDX header in every source file and the Space frontmatter) |
| 4 | Vite config used `__dirname` | build warned it is unsupported by Vite's upcoming native config loader | `import.meta.dirname`; the warning is gone |
| 5 | **A static host silently swallowed "Produce Show"** | `ShowGenerator` POSTed to `/api/radio/generate-show` and only checked `data.show`. On a static host that route returns `index.html` with HTTP 200, so `response.json()` threw, the catch cleared the status line, and the user saw nothing happen | the client now checks `response.ok` **and** the content-type, and on any failure writes the episode locally (`src/lib/localShow.ts`). Verified in a browser against `dist/` with no API at all |
| 6 | Unknown `/api/*` routes answered the SPA shell | production catch-all `app.get('*')` returned `index.html` with HTTP 200 for `/api/anything` | explicit JSON `404` with the route list, registered before the static/SPA handler, so #5 cannot silently recur |
| 7 | The Gemini model id was hard-coded | `model: 'gemini-3.8-flash'` twice, with no way to override | `GEMINI_MODEL` env, same default, logged at boot; a wrong or unavailable id degrades to engine 2 |
| 8 | No public-input hygiene | unbounded `express.json()`, topic interpolated straight into the prompt | `express.json({ limit: '64kb' })`, topic clamped to 240 chars |
| 9 | The pack the desk advertises did not exist here | `ShowNotesModal` offered JSON only | `src/lib/packZip.ts` (store-only ZIP, no dependency) + **Download Pack (.zip)** button; the archive was validated with Python's `zipfile.testzip()` |
| 10 | Speakers were 180 ms apart | `audioEngine` — read as talking over each other | 650 ms, the same beat the desk sessions run at (the pacing lesson that took the desk from 205 → ~150 wpm) |
| 11 | No way to check the offline path | — | `scripts/selfcheck.ts` → `npm run selfcheck`, exit non-zero on failure |
| 12 | Bundling the server broke production hosting | with `dist-server/server.js`, `__dirname` pointed inside the bundle, so `NODE_ENV=production` answered **404 for `/` and every asset** while the API kept working | built assets now resolve from `process.cwd()` (`DIST_DIR`), with a startup warning when `dist/` is missing |
| 13 | No deployment path | the app only ran through `tsx` in dev | `Dockerfile` (build client + server bundle, run `node dist-server/server.js` on `PORT=7860`), `.dockerignore`, `npm run build:server` / `start:compiled` / `verify`, and a Space README with the frontmatter and the secret that enables the Gemini path |
| 14 | A missing asset answered with the SPA shell | in the container, `GET /assets/<absent>.js` returned `index.html` at HTTP 200, so a browser reports a MIME type error instead of a clean miss | the shell fallback now skips `/assets/*` and any path with a file extension — those 404 as `text/plain` |

## Design notes

- **The fallback contract.** Each layer assumes the one below it will fail: Gemini → server
  synthesizer → browser writer. There is no user-visible error state; the producer panel shows an
  `Engine:` badge so it is always clear which one produced the episode.
- **Timing.** Segments carry `timestampMs` / `durationMs`. The audio engine schedules by duration, the
  transcript highlights by index, and speech length is computed from word count at 150 wpm + 900 ms of
  breath — so the transcript and the voice stay in step.
- **Voices.** Host names resolve to `SPEAKERS` profiles (`devon`, `maya`, `zack`, `aris`, `casey`,
  `victoria`) so casting survives the fallback; unknown ids (callers) take alternating male/female
  voices by `index % 2`.
- **The ZIP is store-only on purpose** — no dependency, no compression step, opens anywhere, and the
  payload is text the listener may want to read directly.
- **Static-host contract.** Any endpoint added later must also be added to the JSON 404 list, or a
  static deploy will start answering HTTP 200 with HTML for it.

## Known limits

- Audio is browser speech synthesis, and the Web Speech API cannot be captured to a file, so the pack
  carries script + transcript + notes rather than an MP3. Builds that need media files render
  server-side (the sibling desk repo).
- Episodes live in React state: reload returns to the starter shows. There is no server-side archive
  in this build.
- No rate limiting, by design ("ungated"). Point the Gemini path at a key you are willing to see
  exhausted; engine 2 covers the gap.
- Browsers without Web Speech (most headless setups) get the transcript and the studio visuals without
  voice.
- Not deployed yet: the public static Space currently serves the sibling desk build.

## Deployment

| Surface | What runs | How |
| --- | --- | --- |
| Static host | the built client only; engine 3 writes episodes | `npm run build`, serve `dist/` |
| Node host | client + API in one process | `npm run build && npm run build:server`, then `NODE_ENV=production npm run start:compiled` |
| Container / HF Docker Space | same, on `PORT=7860` | `docker build -t ai-talk-radio . && docker run -p 7860:7860 ai-talk-radio` |

`GEMINI_API_KEY` is a runtime secret (Space secret / `-e` / `.env`), never baked into the image. The
public deployment this repo mirrors is the AI Studio build at `https://talkradio.ai.studio/`, which runs
the same Express server with a key present (`/api/radio/status` there answers `hasKey: true`). This
cleanup pass makes the repo self-hosting: the same behaviour with a key, and a working studio without
one.

## Sensible next steps

- Give this build its own static deployment (`dist/` is deployable as-is) so the two builds do not
  compete for one URL.
- Optional `npm run verify` = `lint && build && selfcheck` for one-command gates.
- Optional: rename the repository to drop the leading hyphen.

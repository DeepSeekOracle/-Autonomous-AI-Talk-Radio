# AI Talk Radio (Ungated)

A talk-radio studio that runs in a browser. Give it a topic; it writes an episode — two hosts with
opposing personalities, a caller patched in from Line One, show notes, takeaways and a transcript —
then voices it live through the Web Speech API and hands you the episode pack as a zip.

No login. No daily cap. If the server path is unavailable (a static host, an exhausted Gemini quota,
no key at all) the studio writes the episode itself and stays on air.

- **Live studio (this build, static Space):** https://deepseekoracle-autonomous-ai-talk-radio.static.hf.space
- **Live desk (sibling build, renders MP3 packs):** https://deepseekoracle-ai-talk-radio.static.hf.space
- **Signal hub / Studio Desk section:** https://chatagent.ca/signal/#studio-desk
- **This repository:** https://github.com/DeepSeekOracle/-Autonomous-AI-Talk-Radio

## Quickstart

```bash
npm install          # Node 20+
npm run dev          # studio + API on http://127.0.0.1:3000
```

Other scripts:

```bash
npm run build        # vite build -> dist/ (deployable to any static host)
npm run lint         # tsc --noEmit (the project typechecks with zero errors)
npm run selfcheck    # asserts the local writer + the episode pack writer still work
PORT=3111 npm start  # run the transmitter on another port
```

Optional `.env` (see `.env.example`):

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | enables the managed Gemini writing path | unset — local synthesizer only |
| `GEMINI_MODEL` | model id used for show writing | `gemini-3.8-flash` |
| `PORT` / `HOST` | transmitter bind address | `3000` / `0.0.0.0` |
| `APP_URL` | self-referential links | unset |

## How a show gets made

Three engines, in order. The studio never shows an error state to the listener — a failure at any
step falls through to the next one, and the last one is local:

| # | Engine | When it runs | What it produces |
| --- | --- | --- | --- |
| 1 | **Gemini** (server) | `GEMINI_API_KEY` is set and the model answers | a full JSON episode: title, hosts, 6–8 timed segments, callers, notes, takeaways |
| 2 | **Server synthesizer** | no key, or the Gemini call fails or is rate-limited | the same show shape, written by `generateFallbackShow()` in `server.ts` |
| 3 | **Local synthesizer** (browser) | the API is missing or does not return JSON — e.g. a static host | the same show shape, written by `src/lib/localShow.ts` |

The studio tells you which engine produced the episode: the producer panel shows an `Engine:` badge
after every run.

Voicing is done in the browser: `window.speechSynthesis` for the dialogue, plus a Web Audio chain for
the processing (equaliser presets, punch/AM/clean), station idents, the news chime and the soundboard.
The audio engine schedules each segment from its `durationMs`, holds ~650 ms between speakers, and
pauses on `pause()` without dropping the transcript sync.

## API

```bash
curl localhost:3000/api/health
# {"status":"online","name":"AI Talk Radio (Ungated)","hasKey":false,"model":"gemini-3.8-flash",
#  "engine":"local-synthesizer","channelCount":4,"features":[...]}

curl -X POST localhost:3000/api/radio/generate-show \
  -H 'Content-Type: application/json' \
  -d '{"topic":"the hard stop","tone":"unfiltered-ungated","ungated":true}'
# {"success":true,"source":"gemini"|"synthesizer-engine","show":{...}}

curl -X POST localhost:3000/api/radio/caller-take \
  -H 'Content-Type: application/json' \
  -d '{"callerName":"Dana","location":"Oslo","topic":"local inference","take":"it doubled our on-call load"}'
# {"success":true,"segments":[3 host reactions]}
```

`GET /api/radio/status` is an alias of `/api/health`. Unknown `/api/*` routes answer **JSON 404**,
never the SPA shell — a JSON client that receives `index.html` with HTTP 200 cannot tell a failed
generation from a successful one.

## The episode pack

`Show Notes → Download Pack (.zip)` writes `show_notes.json`, `transcript.txt` (timecoded),
`script.txt` (speaker, segment tag, emotion) and a `README.txt`, all in one store-only zip built in
the browser with no dependency (`src/lib/packZip.ts`).

This build voices audio live in the browser, and the Web Speech API cannot be captured to a file, so
the pack carries the script, transcript and notes rather than a media file. MP3 packs are what the
sibling desk build renders — VoiceStudio / Edge / Gemini engines, served from
`/api/shows/<id>/download`.

## Deploying

**Static host** (the app runs with no API at all): `npm run build`, then serve `dist/`. Engine 3 takes
over, and the studio still produces episodes and packs.

**Node host:** `npm run build && npm run build:server`, then `NODE_ENV=production npm run start:compiled`.
The bundled server serves the app and the API from one process on `PORT` (default 3000), with a SPA
fallback for deep links and JSON 404s for unknown `/api/*` routes.

**Container / Hugging Face Docker Space:**

```bash
docker build -t ai-talk-radio .
docker run -p 7860:7860 -e GEMINI_API_KEY=... ai-talk-radio
```

The image builds the client and the server bundle, then runs `node dist-server/server.js` with
`NODE_ENV=production` on `PORT=7860` (the port Docker Spaces expect). `GEMINI_API_KEY` belongs in the
Space's **secrets**, never in the image or the repo — without it the studio writes episodes with the
local synthesizer and stays fully functional.

## Studio standards

The writing rules are in the code, not in the prompt only: one idea per turn, 22–32 words per line,
dialogue paced at **~150 wpm** (the pace the published desk sessions run at), ~650 ms between
speakers so callers get room to arrive, emotion carried by word choice and punctuation rather than
performance notes, host asks short and callers answer long, and a flat close with no summing up.

## Verification

Everything below was run against this tree, on Windows with Node 24:

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | 0 errors |
| Build | `npm run build` | `dist/` 1.37 kB html + 50 kB css + 325 kB js (98 kB gzip), 4 s |
| Offline writer + pack | `npm run selfcheck` | `selfcheck OK` — 8 segments, 272 words, 116 s, 11 kB pack |
| API, no key | `POST /api/radio/generate-show` | `source: synthesizer-engine`, 8 segments, 1 caller |
| API 404 contract | `GET /api/does-not-exist` | `404 application/json` |
| Static host | `dist/` served with no `/api`, driven in a browser | episode produced and voiced, engine 3 |
| Pack integrity | Python `zipfile.testzip()` on a rendered pack | `None` (every CRC verified) |

## Layout

```
server.ts                 express + vite middleware: /api/health, /api/radio/*, show writing, fallback engine
src/App.tsx               studio shell: tabs, player state, caller patching, engine wiring
src/lib/audioEngine.ts    speech synthesis + Web Audio DSP, station idents, segment scheduling
src/lib/localShow.ts      the offline episode writer (engine 3)
src/lib/packZip.ts        store-only ZIP writer + episode pack files
src/components/           LivePlayer, Transcript, StationTuner, CallerHotline, ShowGenerator,
                          Soundboard, ShowNotesModal, Navbar
src/data.ts               speakers, stations, starter episodes
scripts/selfcheck.ts      the gate: writer + pack assertions
```

## License

Apache-2.0 — see `LICENSE`. Built by Justin Helmer (Lightfather · Excavationpro · DeepSeekOracle) for
the LYGO Signal network. Engineering notes and the audit trail live in `NOTES.md`.

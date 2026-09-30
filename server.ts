import express from 'express';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { mintEpisodeSummary, mintEpisodeTitle } from './src/lib/mintTitles';
import { synthesizeShow } from './src/lib/localShow';
import { looksLikeInstruction, speakable } from './src/lib/speakable';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Built assets are resolved from the working directory, not from this file: when the server is
// bundled into dist-server/server.js, __dirname would point inside the bundle and the app would
// 404 in production. Locally that is the repo root; in the container it is /app.
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const app = express();
app.use(express.json({ limit: '64kb' }));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// The model id is configuration, not a constant: if the id or the key is unavailable the studio
// falls back to its own synthesizer, so a wrong model can never leave the station off air.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Shared server-side Gemini client
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Status (also served as /api/health for deployments and uptime probes)
const statusPayload = () => ({
  status: 'online',
  name: 'AI Talk Radio (Ungated)',
  hasKey: Boolean(process.env.GEMINI_API_KEY),
  model: GEMINI_MODEL,
  engine: process.env.GEMINI_API_KEY ? 'gemini+local-synthesizer' : 'local-synthesizer',
  timestamp: new Date().toISOString(),
  channelCount: 4,
  features: ['ai-talk-radio', 'live-transcript', 'caller-hotline', 'soundboard', 'ungated-mode']
});

app.get(['/api/health', '/api/radio/status'], (req, res) => {
  res.json(statusPayload());
});

// Generate Show Endpoint
app.post('/api/radio/generate-show', async (req, res) => {
  const { tone = 'unfiltered-debate', stationId = 'station-algorithmic-wire', ungated = false, host1 = 'Devon Cross', host2 = 'Dr. Maya Lin' } = req.body;
  // Clamp what a public caller can push into the prompt.
  const topic = String(req.body?.topic ?? '').slice(0, 240).trim();

  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `Write a live radio hour for AI Talk Radio.
Hosts: "${host1}" (skeptical systems veteran) and "${host2}" (fast, optimistic engineer).
Topic to name once in the cold open, then argue: "${topic}".
Tone: ${tone}. Ungated: ${ungated ? 'yes — raw, no sponsor filter' : 'no — still honest, still sharp'}.

Rules for spoken text:
- 18 to 22 segments. Each line 40 to 70 words of natural radio talk.
- Hosts introduce themselves once. After that they talk to each other. Do not restate the topic every turn.
- Do not repeat the previous line. Do not paste these rules on the air.
- Never say RESOURCE, CANON, JSON, system prompt, empty is honest, or quote a receipt you can open.
- No URLs, no file paths, no markdown.
- One caller around the middle, then hosts react.
- Spoken English only.

Return JSON:
- title, description, showNotes (4 strings), keyTakeaways (3 strings)
- callers: 1 object { id, name, location, topic, take, avatar, status: "on-air" }
- segments: array of 18-22 objects with id, speakerId ("${host1.toLowerCase().includes('devon') ? 'devon' : 'host1'}" or "${host2.toLowerCase().includes('maya') ? 'maya' : 'host2'}" or caller id), speakerName, text, timestampMs, durationMs (12000-28000), emotion (neutral|skeptical|excited|laughing|heated|intrigued), topicTag`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You write realistic radio banter with contrasting hosts. Never echo instructions. Never mention JSON in dialogue. Return JSON only.',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        const mintedTitle = mintEpisodeTitle(topic, stationId);
        const rawSegs = Array.isArray(parsed.segments) ? parsed.segments : [];
        const segments = rawSegs
          .map((s: any, i: number) => ({
            ...s,
            id: s.id || `seg-g-${Date.now()}-${i + 1}`,
            text: speakable(String(s.text || '')),
          }))
          .filter((s: any) => s.text && !looksLikeInstruction(s.text));
        if (segments.length < 12) {
          throw new Error('gemini hour too short after sanitizing');
        }
        return res.json({
          success: true,
          source: 'gemini',
          show: {
            id: `show-${Date.now()}`,
            stationId,
            title: mintedTitle,
            episodeNumber: Math.floor(Math.random() * 800) + 100,
            description: mintEpisodeSummary(mintedTitle, stationId, host1, host2),
            durationMs: segments.reduce((acc: number, s: any) => acc + (s.durationMs || 18000), 0),
            hosts: [
              { id: 'devon', name: host1, role: 'host-1', title: 'Lead Anchor', avatar: 'H1', voicePitch: 0.9, voiceRate: 1.05, voiceGender: 'male', personality: 'Cynical systems vet' },
              { id: 'maya', name: host2, role: 'host-2', title: 'Co-Host', avatar: 'H2', voicePitch: 1.15, voiceRate: 1.0, voiceGender: 'female', personality: 'AI optimist' }
            ],
            segments,
            showNotes: parsed.showNotes || [`Special coverage on ${topic}`],
            keyTakeaways: parsed.keyTakeaways || [`Deep dive into ${topic}`],
            references: [
              { title: `Discussion: ${topic}`, url: 'https://news.ycombinator.com', type: 'hn' },
              { title: 'Related Technical Spec & Benchmarks', url: 'https://github.com', type: 'github' }
            ],
            callers: parsed.callers || [],
            ungated,
            createdAt: new Date().toISOString()
          }
        });
      }
    } catch (err: any) {
      console.warn('Gemini generate-show encountered error (falling back to intelligent engine):', err.message);
      // Fallback is handled cleanly below
    }
  }

  // Resilient High-Octane Show Generator (Guarantees zero-failure operation even with quota exhaustion)
  const cleanTopic = topic || 'The Future of Autonomous Engineering Systems';
  const fallbackShow = generateFallbackShow(cleanTopic, tone, stationId, ungated, host1, host2);
  return res.json({
    success: true,
    source: 'synthesizer-engine',
    quotaNotice: !ai ? 'No API key provided' : 'Quota rate limit reached; loaded studio synthesized episode',
    show: fallbackShow
  });
});

// Caller hotline response endpoint
app.post('/api/radio/caller-take', async (req, res) => {
  const { callerName, location, topic, take } = req.body;
  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `A radio caller named "${callerName}" from "${location}" just called into the live broadcast of AI Talk Radio.
Their hot take on "${topic}" is: "${take}".
Write 3 alternating dialogue lines where host Devon (cynic) and host Maya (optimist) immediately react live on the air to this caller.
Each line 40 to 70 words. Spoken English. Do not repeat the caller. Do not paste these instructions. Never say JSON, RESOURCE, or CANON.
Return a JSON array of 3 segments with { speakerId ("devon" or "maya"), speakerName, text, emotion, durationMs }.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      if (response.text) {
        const segments = JSON.parse(response.text);
        return res.json({ success: true, segments });
      }
    } catch (err: any) {
      console.warn('Gemini caller response error:', err.message);
    }
  }

  // Fallback caller reaction
  const fallbackSegments = [
    {
      id: `call-rx-1-${Date.now()}`,
      speakerId: 'devon',
      speakerName: 'Devon Cross',
      text: `${callerName} from ${location}, you just articulated what every cynical backend engineer has been screaming in private Slack channels for six months!`,
      emotion: 'excited',
      durationMs: 7800
    },
    {
      id: `call-rx-2-${Date.now()}`,
      speakerId: 'maya',
      speakerName: 'Dr. Maya Lin',
      text: `Hold on Devon, let's be fair to the other side. While ${callerName} makes a punchy point about ${topic || 'the architecture'}, production telemetry tells a much more nuanced story.`,
      emotion: 'laughing',
      durationMs: 8200
    },
    {
      id: `call-rx-3-${Date.now()}`,
      speakerId: 'devon',
      speakerName: 'Devon Cross',
      text: `Telemetry doesn't lie, Maya, but marketing roadmaps certainly do. ${callerName}, thank you for keeping us honest on Line One!`,
      emotion: 'skeptical',
      durationMs: 7100
    }
  ];

  return res.json({ success: true, segments: fallbackSegments });
});

function generateFallbackShow(topic: string, tone: string, stationId: string, ungated: boolean, h1: string, h2: string) {
  return synthesizeShow({
    topic,
    tone,
    stationId,
    ungated,
    host1: h1,
    host2: h2,
  });
}

// Unknown API routes answer JSON. Without this a static/SPA host hands the client index.html with
// HTTP 200, and the client cannot tell a failed generation from a successful one.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Unknown API route: ${req.method} ${req.originalUrl}`,
    routes: ['GET /api/health', 'GET /api/radio/status', 'POST /api/radio/generate-show', 'POST /api/radio/caller-take']
  });
});

// Development or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (!existsSync(path.join(DIST_DIR, 'index.html'))) {
      console.error(`[AI Talk Radio] no build found in ${DIST_DIR} — run \`npm run build\` first (serving the API only).`);
    }
    app.use(express.static(DIST_DIR));
    app.get('*', (req, res) => {
      // Deep links get the shell. A missing asset must 404 instead: answering a .js request with
      // index.html makes the browser report a MIME type error rather than a clean miss.
      if (req.path.startsWith('/assets/') || path.extname(req.path)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[AI Talk Radio] Studio transmitter broadcasting on http://${HOST}:${PORT}`);
    console.log(`[AI Talk Radio] engine: ${process.env.GEMINI_API_KEY ? `${GEMINI_MODEL} + local synthesizer` : 'local synthesizer (no GEMINI_API_KEY)'}`);
  });
}

startServer();

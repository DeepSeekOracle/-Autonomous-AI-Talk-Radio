import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

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

// API Status
app.get('/api/radio/status', (req, res) => {
  res.json({
    status: 'online',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
    channelCount: 4,
    features: ['ai-talk-radio', 'live-transcript', 'caller-hotline', 'soundboard', 'ungated-mode']
  });
});

// Generate Show Endpoint
app.post('/api/radio/generate-show', async (req, res) => {
  const { topic, tone = 'unfiltered-debate', stationId = 'station-algorithmic-wire', ungated = false, host1 = 'Devon Cross', host2 = 'Dr. Maya Lin' } = req.body;

  const ai = getAiClient();

  if (ai) {
    try {
      const prompt = `You are the executive showrunner for "AI Talk Radio (Ungated)".
Create a full radio broadcast episode dialogue between two hosts: "${host1}" (skeptical, cynical, systems veteran) and "${host2}" (fast-thinking, optimistic AI researcher/engineer).
The episode topic is: "${topic}".
Tone style: ${tone} (Ungated mode: ${ungated ? 'ON - raw, unfiltered, spicy technical takes, calling out grift and hype directly' : 'OFF - standard tech broadcast'}).

Return a JSON object with:
- title: string (catchy radio show headline)
- description: string (punchy 1-2 sentence teaser)
- showNotes: array of 4 string bullet points
- keyTakeaways: array of 3 string bullet points
- callers: array of 1-2 caller objects { id, name, location, topic, take, avatar, status: "on-air" }
- segments: array of 6-8 dialogue segments in order. Each segment must have:
  - id: unique string
  - speakerId: "${host1.toLowerCase().includes('devon') ? 'devon' : 'host1'}" or "${host2.toLowerCase().includes('maya') ? 'maya' : 'host2'}" or caller id
  - speakerName: string name
  - text: spoken line (natural conversational radio banter, with interruptions, banter, questions, and snappy punchlines; 20 to 45 words each)
  - timestampMs: estimated offset in ms (e.g. 0, 9000, 18000...)
  - durationMs: estimated speaking duration in ms (6000 to 10000)
  - emotion: "neutral" | "skeptical" | "excited" | "laughing" | "heated" | "intrigued"
  - soundEffect: optional "censor-bleep" | "cough" | "chuckle" | "none"
  - topicTag: short 1-2 word segment subject`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction: 'You write realistic, high-paced radio banter with contrasting host personalities. Avoid corporate PR clichés. Return strict JSON.',
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return res.json({
          success: true,
          source: 'gemini',
          show: {
            id: `show-${Date.now()}`,
            stationId,
            title: parsed.title || `Live Debate: ${topic}`,
            episodeNumber: Math.floor(Math.random() * 800) + 100,
            description: parsed.description || `Special broadcast examining ${topic}.`,
            durationMs: parsed.segments ? parsed.segments.reduce((acc: number, s: any) => acc + (s.durationMs || 7000), 0) : 60000,
            hosts: [
              { id: 'devon', name: host1, role: 'host-1', title: 'Lead Anchor', avatar: 'H1', voicePitch: 0.9, voiceRate: 1.05, voiceGender: 'male', personality: 'Cynical systems vet' },
              { id: 'maya', name: host2, role: 'host-2', title: 'Co-Host', avatar: 'H2', voicePitch: 1.15, voiceRate: 1.0, voiceGender: 'female', personality: 'AI optimist' }
            ],
            segments: parsed.segments || [],
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
Return a JSON array of 3 segments with { speakerId ("devon" or "maya"), speakerName, text, emotion, durationMs }.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
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
  const epNum = Math.floor(Math.random() * 500) + 100;
  const isUngated = ungated || tone.includes('ungated');

  return {
    id: `show-synth-${Date.now()}`,
    stationId,
    title: `${isUngated ? '[UNGATED] ' : ''}The Firestorm Over ${topic}`,
    episodeNumber: epNum,
    description: `${h1} and ${h2} dissect ${topic} in a heated debate over benchmarks, engineering realism, and the economics of modern tech.`,
    durationMs: 68000,
    hosts: [
      { id: 'devon', name: h1, role: 'host-1', title: 'Senior Anchor', avatar: 'H1', voicePitch: 0.9, voiceRate: 1.05, voiceGender: 'male', personality: 'Pragmatic veteran' },
      { id: 'maya', name: h2, role: 'host-2', title: 'Co-Host', avatar: 'H2', voicePitch: 1.15, voiceRate: 1.0, voiceGender: 'female', personality: 'Systems visionary' }
    ],
    showNotes: [
      `Deep dive into ${topic} across production and research environments.`,
      `Why the consensus view on ${topic} is flawed according to field practitioners.`,
      `Audience feedback from Line 1 on developer productivity and tooling fatigue.`,
      `Closing outlook: What to expect over the next 12 months.`
    ],
    keyTakeaways: [
      `Theoretical gains in ${topic} must survive real-world deployment constraints.`,
      `Over-promising creates an inevitable backlash cycle before genuine utility settles in.`,
      `The fastest moving teams prioritize simple, verifiable foundations over opaque layers.`
    ],
    references: [
      { title: `Hacker News Megathread on ${topic}`, url: 'https://news.ycombinator.com', type: 'hn' },
      { title: `GitHub Open Source Implementations`, url: 'https://github.com', type: 'github' }
    ],
    callers: [
      {
        id: `caller-${Date.now()}`,
        name: 'Jordan',
        location: 'Toronto, Canada',
        topic: topic,
        take: `We tried migrating our entire pipeline to this last month and it doubled our debugging time.`,
        status: 'on-air',
        avatar: 'JO'
      }
    ],
    ungated: isUngated,
    createdAt: new Date().toISOString(),
    segments: [
      {
        id: `seg-f-1`,
        speakerId: 'devon',
        speakerName: h1,
        text: `You are tuned into AI Talk Radio. I am ${h1}. Maya, I spent all morning reading the latest hype threads about ${topic}, and my blood pressure is through the roof.`,
        timestampMs: 0,
        durationMs: 8800,
        emotion: 'heated',
        topicTag: 'The Hot Take'
      },
      {
        id: `seg-f-2`,
        speakerId: 'maya',
        speakerName: h2,
        text: `Take a deep breath! Every time an architectural paradigm shifts, you assume society will collapse. ${topic} is not a gimmick; the velocity numbers speak for themselves.`,
        timestampMs: 8800,
        durationMs: 8400,
        emotion: 'laughing',
        topicTag: 'Counter-Argument'
      },
      {
        id: `seg-f-3`,
        speakerId: 'devon',
        speakerName: h1,
        text: `Velocity towards what? A brick wall? When you bypass foundational principles, you are just accumulating massive technical debt at the speed of light.`,
        timestampMs: 17200,
        durationMs: 8500,
        emotion: 'skeptical',
        soundEffect: isUngated ? 'censor-bleep' : 'cough',
        topicTag: 'Technical Debt'
      },
      {
        id: `seg-f-4`,
        speakerId: 'maya',
        speakerName: h2,
        text: `Engineering is about trade-offs! Twenty years ago you probably complained when compilers took over manual assembly optimization. The abstraction layer is moving up.`,
        timestampMs: 25700,
        durationMs: 9100,
        emotion: 'excited',
        topicTag: 'Abstraction Shift'
      },
      {
        id: `seg-f-5`,
        speakerId: 'devon',
        speakerName: h1,
        text: `Let us see what our listeners have to say. Line One is flashing. Jordan calling from Toronto. Jordan, what has your team experienced with ${topic}?`,
        timestampMs: 34800,
        durationMs: 7600,
        emotion: 'neutral',
        topicTag: 'Caller Patch'
      },
      {
        id: `seg-f-caller`,
        speakerId: `caller-${Date.now()}`,
        speakerName: 'Jordan (Toronto)',
        text: `Hey guys! We deployed this in our production cluster last month and it literally doubled our on-call incident rate. Nobody could trace the failures.`,
        timestampMs: 42400,
        durationMs: 8500,
        emotion: 'heated',
        topicTag: 'Field Report'
      },
      {
        id: `seg-f-6`,
        speakerId: 'maya',
        speakerName: h2,
        text: `Jordan, that is an integration maturity issue, not a fundamental flaw in ${topic}. Teams need proper observability pipelines before rushing into full autonomy.`,
        timestampMs: 50900,
        durationMs: 8900,
        emotion: 'intrigued',
        topicTag: 'Observability'
      },
      {
        id: `seg-f-7`,
        speakerId: 'devon',
        speakerName: h1,
        text: `And that is the crux of the debate on AI Talk Radio. Stay locked right here for more unfiltered technical reality.`,
        timestampMs: 59800,
        durationMs: 7200,
        emotion: 'neutral',
        topicTag: 'Station Signoff'
      }
    ]
  };
}

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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Talk Radio] Studio transmitter broadcasting on port ${PORT}`);
  });
}

startServer();

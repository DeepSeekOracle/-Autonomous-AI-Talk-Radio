import { RadioStation, RadioShow, Speaker } from './types';

export const SPEAKERS: Record<string, Speaker> = {
  devon: {
    id: 'devon',
    name: 'Devon Cross',
    role: 'host-1',
    title: 'Senior Systems Architect & Cynic',
    avatar: 'DC',
    voicePitch: 1.0,
    voiceRate: 1.02,
    voiceGender: 'male',
    personality: 'Dry humor, 20 years in production infrastructure, hates hype cycles, loves C and raw sockets.'
  },
  maya: {
    id: 'maya',
    name: 'Dr. Maya Lin',
    role: 'host-2',
    title: 'AI Alignment & Distributed ML Lead',
    avatar: 'ML',
    voicePitch: 1.15,
    voiceRate: 1.0,
    voiceGender: 'female',
    personality: 'Passionate about foundation models, quick-witted, calls out Devon on his nostalgia bias.'
  },
  zack: {
    id: 'zack',
    name: '"ZeroDay" Zack',
    role: 'host-1',
    title: 'Offensive Security Researcher',
    avatar: 'ZZ',
    voicePitch: 0.97,
    voiceRate: 1.04,
    voiceGender: 'male',
    personality: 'Underground cybervet, drinks Club-Mate, speaks in fast terminal metaphors, ungated enthusiast.'
  },
  aris: {
    id: 'aris',
    name: 'Dr. Aris Thorne',
    role: 'host-2',
    title: 'Compiler & Formal Methods Guru',
    avatar: 'AT',
    voicePitch: 1.05,
    voiceRate: 0.95,
    voiceGender: 'female',
    personality: 'Methodical, mathematically rigorous, questions every benchmark, allergic to benchmark gaming.'
  },
  casey: {
    id: 'casey',
    name: 'Casey Rivera',
    role: 'host-1',
    title: 'Tech Journalist & Ex-Founder',
    avatar: 'CR',
    voicePitch: 1.02,
    voiceRate: 1.03,
    voiceGender: 'male',
    personality: 'Fast-talking morning broadcast host, tracks GitHub trending like Wall Street stock tickers.'
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria Sterling',
    role: 'host-1',
    title: 'Silicon Valley Insider & M&A Analyst',
    avatar: 'VS',
    voicePitch: 1.1,
    voiceRate: 1.0,
    voiceGender: 'female',
    personality: 'Direct, sharp, dissects $100M seed rounds and GPU cluster financing with surgical precision.'
  },
  liora: {
    id: 'liora',
    name: 'Liora Hale',
    role: 'host-1',
    title: 'Night Reader of Eternal Haven',
    avatar: 'LH',
    voicePitch: 1.0,
    voiceRate: 0.92,
    voiceGender: 'female',
    personality: 'Reads the Eternal Haven Chronicles in a calm human voice and lets the chapter film play when one exists.'
  }
};

export const STATIONS: RadioStation[] = [
  {
    id: 'station-algorithmic-wire',
    name: 'The Algorithmic Wire',
    frequency: '98.4 FM',
    genre: 'AI, Architecture & Dev Debate',
    tagline: 'Reads a prompt as architecture versus production fire.',
    hosts: [SPEAKERS.devon, SPEAKERS.maya],
    currentShowId: 'show-software-rewrite',
    accentColor: '#f59e0b', // amber-500
    bitrateKbps: 320
  },
  {
    id: 'station-kernel-panic',
    name: 'Kernel Panic Radio',
    frequency: '104.2 FM',
    genre: 'Ungated Late-Night & Deep Hacking',
    tagline: 'Reads a prompt ungated: late desk, no sponsor filter.',
    hosts: [SPEAKERS.zack, SPEAKERS.aris],
    currentShowId: 'show-ungated-systems',
    accentColor: '#ef4444', // red-500
    bitrateKbps: 320
  },
  {
    id: 'station-hn-live',
    name: 'Hacker News Live',
    frequency: '88.9 FM',
    genre: 'Trending Repos & Front Page Firestorms',
    tagline: 'Reads a prompt as a front-page teardown.',
    hosts: [SPEAKERS.casey, SPEAKERS.devon],
    currentShowId: 'show-hn-breakdown',
    accentColor: '#3b82f6', // blue-500
    bitrateKbps: 256
  },
  {
    id: 'station-sv-confidential',
    name: 'Silicon Valley Confidential',
    frequency: '93.5 FM',
    genre: 'Venture Capital, GPUs & Compute Warfare',
    tagline: 'Reads a prompt as capital, silicon, and who pays.',
    hosts: [SPEAKERS.victoria, SPEAKERS.devon],
    currentShowId: 'show-compute-wars',
    accentColor: '#10b981', // emerald-500
    bitrateKbps: 320
  },
  {
    id: 'station-eternal-haven',
    name: 'Eternal Haven',
    frequency: '101.7 FM',
    genre: 'The Eternal Haven Chronicles',
    tagline: 'Reads the books, chapter by chapter, and plays the films.',
    hosts: [SPEAKERS.liora],
    currentShowId: 'show-eternal-haven',
    accentColor: '#e0b36a',
    bitrateKbps: 320
  }
];

export const INITIAL_SHOWS: RadioShow[] = [
  {
    id: 'show-software-rewrite',
    stationId: 'station-algorithmic-wire',
    title: 'The Algorithmic Wire — On Air',
    episodeNumber: 142,
    description: 'This station reads a prompt as architecture versus production fire. Devon and Maya run the live autonomous desk until the clock is honest.',
    durationMs: 78000,
    hosts: [SPEAKERS.devon, SPEAKERS.maya],
    ungated: false,
    createdAt: '2026-09-29T14:00:00Z',
    showNotes: [
      'The transition from manual boilerplate to agentic synthesis in large codebases.',
      'Why Devon insists debugging 40,000 lines of hallucinated async Python is worse than writing C.',
      'Maya presents benchmarks showing 68% velocity improvement on automated test suites.',
      'Caller Line 1: Marcus from Seattle calls in about junior developer hiring freezes.'
    ],
    keyTakeaways: [
      'Synthesized code shifts the human bottleneck from syntax production to architecture verification.',
      'Edge cases and race conditions still require deep mental simulation that models struggle to ground.',
      'Prompt engineering is evolving into formal interface specification.'
    ],
    references: [
      { title: 'Hacker News: "Has anyone actually shipped a 100k-line app with zero manual edits?"', url: 'https://news.ycombinator.com', type: 'hn' },
      { title: 'Paper: Empirical Study on LLM-Generated Distributed Invariants', url: 'https://arxiv.org', type: 'paper' },
      { title: 'GitHub: autonomous-debugger-agent', url: 'https://github.com', type: 'github' }
    ],
    callers: [
      {
        id: 'caller-marcus',
        name: 'Marcus',
        location: 'Seattle, WA',
        topic: 'Junior Dev Pipeline',
        take: 'If entry-level engineers never write raw CRUD endpoints, how will we ever get 10-year senior architects?',
        status: 'on-air',
        avatar: 'MA',
        durationSeconds: 18
      },
      {
        id: 'caller-elena',
        name: 'Elena',
        location: 'Stockholm, Sweden',
        topic: 'Type Systems vs Probabilities',
        take: 'Static typing caught 94% of our agent hallucination bugs before runtime. Rust is winning.',
        status: 'queued',
        avatar: 'ES'
      }
    ],
    segments: [
      {
        id: 'seg-1',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "You are tuned into 98.4 The Algorithmic Wire. I am Devon Cross here in Studio B, staring at a pull request where an agent wrote twelve hundred lines of code in fourteen seconds. And Maya, I have a migraine already.",
        timestampMs: 0,
        durationMs: 9500,
        emotion: 'skeptical',
        topicTag: 'Intro'
      },
      {
        id: 'seg-2',
        speakerId: 'maya',
        speakerName: 'Dr. Maya Lin',
        text: "Good morning Devon. Admit it, the unit tests all passed! You just resent the fact that a diffusion-guided transformer finished your three-day backlog before your first sip of cold brew.",
        timestampMs: 9500,
        durationMs: 7800,
        emotion: 'laughing',
        topicTag: 'Agentic Velocity'
      },
      {
        id: 'seg-3',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "The tests passed because the model generated the tests too, Maya! It created its own little fantasy universe where zero errors exist, while silently leaking socket descriptors on line four hundred and twelve.",
        timestampMs: 17300,
        durationMs: 9800,
        emotion: 'heated',
        soundEffect: 'cough',
        topicTag: 'Test Hallucinations'
      },
      {
        id: 'seg-4',
        speakerId: 'maya',
        speakerName: 'Dr. Maya Lin',
        text: "That is why we enforce verification loops and static proof checkers. But look at the macroscopic data: delivery velocity across fifty thousand engineering teams is up sixty-eight percent this quarter.",
        timestampMs: 27100,
        durationMs: 8900,
        emotion: 'excited',
        topicTag: 'Industry Data'
      },
      {
        id: 'seg-5',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Velocity of typing is not velocity of comprehension. When production catches fire at three in the morning, nobody understands the architecture because nobody suffered through designing it.",
        timestampMs: 36000,
        durationMs: 8200,
        emotion: 'skeptical',
        topicTag: 'Production Reality'
      },
      {
        id: 'seg-6',
        speakerId: 'maya',
        speakerName: 'Dr. Maya Lin',
        text: "Speaking of production fires, our hotline switchboard is blinking red. Let us go to Line One. We have Marcus calling from Seattle. Marcus, you are live on The Algorithmic Wire.",
        timestampMs: 44200,
        durationMs: 7500,
        emotion: 'neutral',
        soundEffect: 'chuckle',
        topicTag: 'Caller Switch'
      },
      {
        id: 'caller-marcus',
        speakerId: 'caller-marcus',
        speakerName: 'Marcus (Seattle, WA)',
        text: "Hey Devon, hey Maya. Long-time listener. Here is my question: if our junior developers are just prompting agents from day one, how do they build the mental scar tissue needed to become staff engineers?",
        timestampMs: 51700,
        durationMs: 8600,
        emotion: 'intrigued',
        topicTag: 'Junior Pipeline'
      },
      {
        id: 'seg-7',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Marcus, you hit the nail on the head! You cannot download twenty years of debugging intuition through a prompt template. You need to stay up all night chasing a memory corruption bug at least once in your life.",
        timestampMs: 60300,
        durationMs: 8900,
        emotion: 'excited',
        topicTag: 'Scar Tissue'
      },
      {
        id: 'seg-8',
        speakerId: 'maya',
        speakerName: 'Dr. Maya Lin',
        text: "Or maybe, just maybe Devon, the next generation will operate at the systems and ethics layer instead of memorizing compiler quirks. We will take a quick station ID and come right back with caller Elena from Stockholm.",
        timestampMs: 69200,
        durationMs: 8800,
        emotion: 'laughing',
        topicTag: 'Outro'
      }
    ]
  },
  {
    id: 'show-ungated-systems',
    stationId: 'station-kernel-panic',
    title: 'Kernel Panic Radio — On Air',
    episodeNumber: 89,
    description: 'This station reads a prompt ungated: late desk, no sponsor filter. Zack and Aris keep the transmitter raw until the clock is honest.',
    durationMs: 72000,
    hosts: [SPEAKERS.zack, SPEAKERS.aris],
    ungated: true,
    createdAt: '2026-09-29T15:10:00Z',
    showNotes: [
      'Ungated late-night edition: raw technical takedowns without sponsor filters.',
      'The quiet panic inside hyper-scaler cloud margins as open-weights models run locally on 64GB workstations.',
      'Formal verification of C kernels versus rewrite-everything-in-Rust crusades.',
      'Live caller teardown of a $40M funded startup that was just an unvalidated API proxy wrapper.'
    ],
    keyTakeaways: [
      'Inference economics are collapsing toward the hardware edge for privacy-critical enterprise workloads.',
      'Benchmark contamination has rendered standard leaderboards virtually useless for production evaluation.',
      'Simplicity in systems design remains the only true antidote to supply chain security collapse.'
    ],
    references: [
      { title: 'Paper: Quantized 4-bit Mixture of Experts running at 120 tok/sec on unified memory', url: 'https://arxiv.org', type: 'paper' },
      { title: 'HN: "Why our company canceled our $2M cloud GPU contract"', url: 'https://news.ycombinator.com', type: 'hn' },
      { title: 'GitHub: local-radio-synth-stack', url: 'https://github.com', type: 'github' }
    ],
    callers: [
      {
        id: 'caller-dave',
        name: 'Dave "Hex"',
        location: 'Berlin, Germany',
        topic: 'Local Inference Sovereignty',
        take: 'The minute you send your proprietary kernels to a hosted endpoint, your moat is gone.',
        status: 'on-air',
        avatar: 'DH',
        durationSeconds: 15
      }
    ],
    segments: [
      {
        id: 'u-seg-1',
        speakerId: 'zack',
        speakerName: '"ZeroDay" Zack',
        text: "You are tuned into 104.2 Kernel Panic Radio. The FCC is asleep, our sponsors have all fled the building, and we are broadcasting ungated. Aris, tell the listeners what happened to that hyped unicorn that just imploded.",
        timestampMs: 0,
        durationMs: 9200,
        emotion: 'excited',
        topicTag: 'Ungated Intro'
      },
      {
        id: 'u-seg-2',
        speakerId: 'aris',
        speakerName: 'Dr. Aris Thorne',
        text: "Well Zack, forty-two million dollars in venture debt, six months of billboard campaigns on Highway 101, and their entire proprietary reasoning engine was literally three regex statements piping into a free endpoint.",
        timestampMs: 9200,
        durationMs: 9800,
        emotion: 'skeptical',
        soundEffect: 'snort',
        topicTag: 'The Wrapper Grift'
      },
      {
        id: 'u-seg-3',
        speakerId: 'zack',
        speakerName: '"ZeroDay" Zack',
        text: "Unbelievable. And meanwhile, in the real world, the open-weight hacker community is running quantized twenty-billion-parameter MoE architectures on two-thousand-dollar desktop chips at eighty tokens a second.",
        timestampMs: 19000,
        durationMs: 9000,
        emotion: 'heated',
        topicTag: 'Local Silicon'
      },
      {
        id: 'u-seg-4',
        speakerId: 'aris',
        speakerName: 'Dr. Aris Thorne',
        text: "The cloud monopolies are petrified, Zack. If every developer can run deterministic compiler agents locally without sending telemetry across the wire, the compute tax model completely falls apart.",
        timestampMs: 28000,
        durationMs: 8900,
        emotion: 'intrigued',
        topicTag: 'Cloud Monopoly Tax'
      },
      {
        id: 'u-seg-5',
        speakerId: 'zack',
        speakerName: '"ZeroDay" Zack',
        text: "Line Two is lighting up like a Christmas tree. Dave in Berlin is on the line. Dave, speak your mind on Kernel Panic.",
        timestampMs: 36900,
        durationMs: 6500,
        emotion: 'excited',
        topicTag: 'Caller Intercept'
      },
      {
        id: 'caller-dave',
        speakerId: 'caller-dave',
        speakerName: 'Dave "Hex" (Berlin)',
        text: "Servus Zack and Aris! We just migrated four hundred industrial microcontrollers to air-gapped local edge nodes. Zero cloud dependence. The latency dropped from three hundred milliseconds to four!",
        timestampMs: 43400,
        durationMs: 9100,
        emotion: 'excited',
        topicTag: 'Air-Gapped Edge'
      },
      {
        id: 'u-seg-6',
        speakerId: 'aris',
        speakerName: 'Dr. Aris Thorne',
        text: "Four milliseconds! That is real engineering, Dave. No token billing, no rate limit errors, no terms of service rug-pull. Just math and raw silicon.",
        timestampMs: 52500,
        durationMs: 8200,
        emotion: 'excited',
        topicTag: 'Pure Math'
      },
      {
        id: 'u-seg-7',
        speakerId: 'zack',
        speakerName: '"ZeroDay" Zack',
        text: "Keep that frequency locked to 104.2. When we come back: why memory-safe languages will not save you from flawed cryptographic protocol logic.",
        timestampMs: 60700,
        durationMs: 8300,
        emotion: 'neutral',
        soundEffect: 'censor-bleep',
        topicTag: 'Station Outro'
      }
    ]
  },
  {
    id: 'show-hn-breakdown',
    stationId: 'station-hn-live',
    title: 'Hacker News Live — On Air',
    episodeNumber: 64,
    description: 'This station reads a prompt as a front-page teardown. Casey and Devon take the board live until the clock is honest.',
    durationMs: 65000,
    hosts: [SPEAKERS.casey, SPEAKERS.devon],
    ungated: false,
    createdAt: '2026-09-29T12:30:00Z',
    showNotes: [
      'Top Hacker News threads dissection: Zig kernel rewrites and browser SQLite.',
      'The "Context Window Paradox": Why throwing 100k tokens at a problem often results in 10x higher hallucination rates.',
      'Devon shares why Unix philosophy of single-purpose modular tools is making a massive comeback.'
    ],
    keyTakeaways: [
      'Attention dilution in ultra-long contexts makes precise semantic retrieval worse than targeted RAG.',
      'Zig tooling is maturing rapidly, but production libc interop remains full of edge-case landmines.'
    ],
    references: [
      { title: 'Show HN: "A complete POSIX OS written from scratch in 12,000 lines of Zig"', url: 'https://news.ycombinator.com', type: 'hn' },
      { title: 'Research: Needle In A Haystack Benchmark Failures at High Entropy', url: 'https://arxiv.org', type: 'paper' }
    ],
    callers: [],
    segments: [
      {
        id: 'hn-1',
        speakerId: 'casey',
        speakerName: 'Casey Rivera',
        text: "Welcome to 88.9 Hacker News Live! Number one on the front page right now with fifteen hundred points: someone rewrote the core Linux scheduling loop in Zig over the weekend. Devon, your hot take?",
        timestampMs: 0,
        durationMs: 8900,
        emotion: 'excited',
        topicTag: 'HN Top Story'
      },
      {
        id: 'hn-2',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "My hot take is: God bless their youthful optimism, but good luck dealing with thirty years of quirky hardware interrupt quirks on ancient Realtek network cards. C is not going anywhere.",
        timestampMs: 8900,
        durationMs: 9500,
        emotion: 'skeptical',
        topicTag: 'Legacy Hardware'
      },
      {
        id: 'hn-3',
        speakerId: 'casey',
        speakerName: 'Casey Rivera',
        text: "Fair enough, but the benchmarks showed a nine percent lower latency on memory-constrained containers! And thread comments are calling it the cleanest code they have read all year.",
        timestampMs: 18400,
        durationMs: 8500,
        emotion: 'intrigued',
        topicTag: 'Benchmark Debate'
      },
      {
        id: 'hn-4',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Everyone loves clean code until the first real-world kernel panic happens because a proprietary GPU driver threw an undocumented ioctl call. That is when the purity party ends, Casey.",
        timestampMs: 26900,
        durationMs: 9200,
        emotion: 'heated',
        soundEffect: 'cough',
        topicTag: 'Driver Reality'
      },
      {
        id: 'hn-5',
        speakerId: 'casey',
        speakerName: 'Casey Rivera',
        text: "Story number two: the hundred-thousand-token context trap. Developers are discovering that stuffing their entire company codebase into a single prompt produces answers that are sixty percent hallucinations.",
        timestampMs: 36100,
        durationMs: 9800,
        emotion: 'neutral',
        topicTag: 'Context Traps'
      },
      {
        id: 'hn-6',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Because humans cannot read a thousand pages at once and remember every comma either! Targeted semantic indexing beats brute-force context stuffing every day of the week.",
        timestampMs: 45900,
        durationMs: 9400,
        emotion: 'excited',
        topicTag: 'Indexing Beats Brute Force'
      },
      {
        id: 'hn-7',
        speakerId: 'casey',
        speakerName: 'Casey Rivera',
        text: "Stay with us on 88.9 FM. After this short station sweep, we analyze whether WASM in the browser is finally ready to replace desktop native software.",
        timestampMs: 55300,
        durationMs: 8700,
        emotion: 'neutral',
        topicTag: 'Station Tease'
      }
    ]
  },
  {
    id: 'show-compute-wars',
    stationId: 'station-sv-confidential',
    title: 'Silicon Valley Confidential — On Air',
    episodeNumber: 31,
    description: 'This station reads a prompt as capital, silicon, and who pays. Victoria and Devon run the money desk until the clock is honest.',
    durationMs: 64000,
    hosts: [SPEAKERS.victoria, SPEAKERS.devon],
    ungated: false,
    createdAt: '2026-09-29T10:00:00Z',
    showNotes: [
      'The sheer financial gravity of gigawatt-scale data center buildouts.',
      'Sovereign AI funds buying out three years of future silicon capacity.',
      'Why amortization schedules on $40,000 accelerators are triggering sleepless nights in finance departments.'
    ],
    keyTakeaways: [
      'Data center power constraints are now a more restrictive bottleneck than silicon availability.',
      'Small, efficient models with domain specialization are delivering superior ROI compared to massive generalists.'
    ],
    references: [
      { title: 'Report: Global Grid Interconnect Queues for AI Clusters', url: 'https://iea.org', type: 'news' },
      { title: 'Analysis: Accelerator Depreciation and Residual Secondary Market Value', url: 'https://semianalysis.com', type: 'news' }
    ],
    callers: [],
    segments: [
      {
        id: 'cw-1',
        speakerId: 'victoria',
        speakerName: 'Victoria Sterling',
        text: "From Sand Hill Road to the Virginia data center corridors, this is Silicon Valley Confidential on 93.5 FM. Today we are following the money, and the money is currently chasing gigawatts of electricity.",
        timestampMs: 0,
        durationMs: 9400,
        emotion: 'neutral',
        topicTag: 'Market Opening'
      },
      {
        id: 'cw-2',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Victoria, when tech companies start buying decommissioned nuclear reactors just to keep matrix multiplications running, you know we have officially entered the speculative stratosphere.",
        timestampMs: 9400,
        durationMs: 9200,
        emotion: 'skeptical',
        topicTag: 'Nuclear Energy'
      },
      {
        id: 'cw-3',
        speakerId: 'victoria',
        speakerName: 'Victoria Sterling',
        text: "It is not just speculation, Devon. These hyperscalers have committed over five hundred billion in capital expenditures over the next thirty-six months. If the software monetization doesn't materialize, the write-downs will be historic.",
        timestampMs: 18600,
        durationMs: 9900,
        emotion: 'excited',
        topicTag: 'CapEx Scale'
      },
      {
        id: 'cw-4',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "And who pays for it when the music stops? The enterprise customers whose SaaS subscription renewals just got jacked up forty percent to subsidize GPU depreciation.",
        timestampMs: 28500,
        durationMs: 8800,
        emotion: 'heated',
        topicTag: 'Enterprise Bill'
      },
      {
        id: 'cw-5',
        speakerId: 'victoria',
        speakerName: 'Victoria Sterling',
        text: "Which is precisely why we are seeing a massive counter-trend: chief information officers prioritizing small, efficient, seventy-billion and eight-billion parameter models that cost one-fiftieth to serve.",
        timestampMs: 37300,
        durationMs: 9500,
        emotion: 'intrigued',
        topicTag: 'The Efficiency Pivot'
      },
      {
        id: 'cw-6',
        speakerId: 'devon',
        speakerName: 'Devon Cross',
        text: "Pragmatism always wins in the end. It takes a year of burning through millions before companies remember that arithmetic has consequences.",
        timestampMs: 46800,
        durationMs: 8200,
        emotion: 'laughing',
        topicTag: 'Pragmatism Wins'
      },
      {
        id: 'cw-7',
        speakerId: 'victoria',
        speakerName: 'Victoria Sterling',
        text: "We will be right back with the latest venture valuations on AI developer tooling right after this break on 93.5 FM.",
        timestampMs: 55000,
        durationMs: 7600,
        emotion: 'neutral',
        topicTag: 'Closing'
      }
    ]
  }
];

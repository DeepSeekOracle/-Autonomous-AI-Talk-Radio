/**
 * Local show synthesizer — the studio's own writer.
 *
 * Writes a full spoken hour (~8–12 minutes) in English radio banter.
 * Mill prompts, protocol tags, and URLs stay in the notes, not on the air.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { RadioShow, ScriptSegment, Caller } from '../types';
import { SPEAKERS } from '../data';
import { mintEpisodeSummary, mintEpisodeTitle, topicCore } from './mintTitles';
import { speakable } from './speakable';

export interface SynthesizeOptions {
  topic: string;
  tone: string;
  stationId: string;
  ungated: boolean;
  host1: string;
  host2: string;
  facts?: string[];
  sourceUrl?: string;
  sourceName?: string;
  band?: string;
  writerNotes?: string;
}

const WPM = 150;
const GAP_MS = 650;

const STATION_NAME: Record<string, string> = {
  'station-algorithmic-wire': 'The Algorithmic Wire',
  'station-kernel-panic': 'Kernel Panic Radio',
  'station-hn-live': 'Hacker News Live',
  'station-sv-confidential': 'Silicon Valley Confidential',
};

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const durationFor = (text: string): number => Math.round((words(text) / WPM) * 60000) + 900;

const voiceIdFor = (name: string, fallback: string): string => {
  const hit = Object.entries(SPEAKERS).find(([, s]) => s.name.toLowerCase() === name.toLowerCase());
  return hit ? hit[0] : fallback;
};

const givenName = (name: string): string => {
  const cleaned = name.replace(/^Dr\.?\s+/i, "").replace(/["']/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /zeroday/i.test(parts[0])) return parts[1];
  return parts[0] || name;
};

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const airFact = (raw: string): string => {
  const t = speakable(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 40) return "";
  const cut = t.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return cut.length > 280 ? `${cut.slice(0, 277).replace(/\s+\S*$/, "")}.` : cut;
};

type Line = { by: 1 | 2 | "caller"; text: string; tag: string; emotion: ScriptSegment["emotion"] };

function writeHour(opts: {
  topic: string;
  core: string;
  h1: string;
  h2: string;
  fact1: string;
  fact2: string;
  source: string;
  ungated: boolean;
  band?: string;
  seed: number;
  stationName: string;
}): Line[] {
  const { topic, core, h1, h2, fact1, fact2, source, ungated, band, seed, stationName } = opts;
  const first = givenName(h1);
  const second = givenName(h2);
  const feedBeat =
    band === "world" || band === "earth"
      ? "This hour is reading a public feed, not a sealed ledger. If the page is empty, we say it is empty."
      : "If we cannot open the page on a machine we own, we treat it as weather.";
  const closeTag = ungated ? "Ungated, and unsponsored." : "That is the broadcast.";

  const receiptA = fact1
    ? `Hold on. I actually opened a public page instead of quoting the hallway. It says this. ${fact1} That is the floor for this hour. Everything else is atmosphere around it, and atmosphere is allowed to be pretty without being true.`
    : `I went looking for a page we can still open on a machine we own. Nothing landed that I would bet a pager on. So we work from the claim itself. We do not invent a citation just to fill dead air. Empty is a finding.`;

  const receiptB = fact2
    ? `Second pass, same rule. ${fact2} If that disagrees with the demo, the demo loses. I do not care how pretty the slide was, or how many people clapped in the recording. A receipt beats a round of applause.`
    : `Second pass is the boring one, and boring is the job. Pin the interface. Keep the messy middle swappable. Never let a layer you cannot read reverse a decision you cannot undo. If that sounds like a lecture, it is one we earned the hard way.`;

  const callerTake = fact1
    ? `Hey, long time sitting in the car for this. We treated the headline as weather. The wins were real only where we could still explain a failure to a junior at two in the morning. Once the layer was doing the thinking, on-call went blind, and ${core} stopped being a tool and started being a rumor we were legally on the hook for.`
    : `We shipped the demo into production because the meeting wanted a win before Friday. Two weeks later nobody could explain a red alert without opening a vendor tab. The useful part of ${core} was the interface. The rest was a story we told ourselves so the slide would land.`;

  const lines: Line[] = [
    {
      by: 1,
      tag: "Cold Open",
      emotion: "heated",
      text: `You are tuned to ${stationName}. I am ${h1}. ${second} is across the desk. Tonight's hour is ${topic}. We name it once, then we argue it, and we do not read the operator notes on the air. ${feedBeat} If you just sat down, stay. This is a working hour, not a trailer.`,
    },
    {
      by: 2,
      tag: "First Take",
      emotion: "intrigued",
      text: `${second} here. I want the useful part of this, not the trailer they cut for the timeline. Every time the ground moves, we bury the working piece under a keynote and then act surprised when Tuesday is on fire. Start with what still has to be true after the clip stops looping. If it only works in the recording, it does not work.`,
    },
    {
      by: 1,
      tag: "The Push",
      emotion: "skeptical",
      text: `Naming a thing is not adopting it. If a team cannot explain a failure without opening a vendor dashboard, they did not adopt ${core}. They rented a story, and the rent comes due at three in the morning. I want the failure mode in plain English, with a clock on it, and a name attached to the pager.`,
    },
    {
      by: 2,
      tag: "The Hold",
      emotion: "excited",
      text: `Then hold the interface and let the middle move. That is the part that actually ships. You pin a boundary, you keep a receipt, and you refuse to rewrite the whole stack in one branch because a demo looked fast on a stage. Speed without a hold is just a prettier outage, and prettier outages still page the same people.`,
    },
    {
      by: 1,
      tag: "Receipt One",
      emotion: "neutral",
      text: receiptA,
    },
    {
      by: 2,
      tag: "Receipt Two",
      emotion: "intrigued",
      text: receiptB,
    },
    {
      by: 1,
      tag: "The Cost",
      emotion: "skeptical",
      text: `Then name the cost, because the slide never does. Who stays up when this lies. Who can still ship if ${source} goes dark for a week. If the answer is nobody, you built a shrine with a status page. I will take a slower tool that I can still read at three in the morning over a miracle I cannot audit, every night of the year.`,
    },
    {
      by: 2,
      tag: "Local Machine",
      emotion: "excited",
      text: `That is why the local machine still matters, and I will keep saying it until the budget meeting hears it. A box you can unplug is a kind of honesty. Not romance. If the work only exists while someone else's cluster is kind to you, you do not own the work. You are visiting it, and visitors do not get a vote when the bill arrives.`,
    },
    {
      by: 1,
      tag: "Consent",
      emotion: "heated",
      text: `Consent is not a footer. If a system posts, ships, or speaks without a yes, it is already misaligned, and no amount of brand language will wash that out. Protocol zero is firmware for a reason. You do not get to skip the gate because the demo was late or the room was excited. The gate is the product.`,
    },
    {
      by: 2,
      tag: "Observability",
      emotion: "intrigued",
      text: `Observability is the whole argument wearing work clothes. If you cannot see the failure, you cannot be on call for it. People call that maturity. I call it the difference between a tool and a weather report you are legally responsible for. A dashboard that only sings when the vendor is happy is a lullaby, not a desk.`,
    },
    {
      by: 1,
      tag: "Time",
      emotion: "neutral",
      text: `Time is the scarce resource. Invite once. Overlay once. Then build local. The demo culture pretends attention is free. It is not. Every extra layer you cannot explain is a meeting you will pay for later, with interest, and the interest is paid in nights and in people who stop trusting the desk.`,
    },
    {
      by: 2,
      tag: "Junior Floor",
      emotion: "excited",
      text: `And spare me the myth that juniors will just prompt their way into staff. Someone still has to know where the floor is. If the next desk never writes the boring path, fine, as long as someone in the building can still find it when the lights go out. Scar tissue is not a vibe. It is a map you earned.`,
    },
    {
      by: 1,
      tag: "Caller Patch",
      emotion: "neutral",
      text: `Line One is lit. Someone who had to live with this hour, not just quote it in a thread. Go ahead, you are on the air. Keep it to what you saw with your own hands, not what the slide promised, and not what the vendor said in the hallway after the talk.`,
    },
    {
      by: "caller",
      tag: "Field Report",
      emotion: "heated",
      text: callerTake,
    },
    {
      by: 2,
      tag: "Caller Hold",
      emotion: "intrigued",
      text: `That is the honest version, and it never makes the keynote. If you cannot explain the failure, you have not adopted the tool. You have rented it. Thank you for saying the quiet part without a press kit. We will not launder that into a success story just because the numbers looked green for a quarter.`,
    },
    {
      by: 1,
      tag: "Scar Tissue",
      emotion: "skeptical",
      text: `Scar tissue is not nostalgia, ${second}. It is the night you chased a leak because nobody else knew the map, and the only light was the one you brought. If the next desk never has to do that, fine, as long as someone still can. A generation that only prompts is a generation that cannot find the floor when the lights go out.`,
    },
    {
      by: 2,
      tag: "Map and Gate",
      emotion: "neutral",
      text: `A map is a proposal. A gate is a yes. Mixing them is how rumor becomes liturgy, and liturgy is how a public feed gets treated like a sealed record. We can point at a page. We cannot pretend a pretty overlay is proof. That distinction is the whole ethics of this desk in one sentence, and we will keep repeating the sentence until it sticks.`,
    },
    {
      by: 1,
      tag: "What Holds",
      emotion: seed % 2 ? "heated" : "skeptical",
      text: `What holds is boring on purpose. Hash what you ship. Keep a copy you can open on Tuesday. Do not let a slogan reverse a decision you cannot undo. ${core} is interesting. The hold is the job. I will die on that hill and I will still be on time for the next hour, because the next hour does not care about our feelings.`,
    },
    {
      by: 2,
      tag: "Twelve Months",
      emotion: "excited",
      text: `Over the next year the teams that survive this will look slow in meetings and fast in incidents. They will quote pages they can still open. They will drop tools that cannot explain themselves. That is not a vibe and it is not a brand. That is how you still have a desk in December when the budget people come back with a knife.`,
    },
    {
      by: 1,
      tag: "Money Desk",
      emotion: "skeptical",
      text: `And someone still has to pay for the silicon. If the hour cannot say who writes the check, it is not a strategy, it is a mood. Capital will fund a miracle until the miracle needs a plumber. Then it funds the plumber, or it walks. I would rather be the plumber. Plumbers sleep, eventually.`,
    },
    {
      by: 2,
      tag: "Ruling",
      emotion: "neutral",
      text: `Then we can rule it. Quote the feed. Keep the receipts. Never let a layer you cannot read reverse a decision you cannot undo. If that sounds harsh, good. Harsh is cheaper than a silent rewrite, and a silent rewrite is how a desk loses the room without noticing until the room is gone.`,
    },
    {
      by: 1,
      tag: "Last Beat",
      emotion: "laughing",
      text: `I will take harsh over holy every night we are on this transmitter. We will be here when the next claim walks in wearing a timestamp and a smile. Bring a page we can open, or bring silence. Both are honest. One of them is rarer, and rarity is not a substitute for proof.`,
    },
    {
      by: 2,
      tag: "Handoff",
      emotion: "intrigued",
      text: `We named the hour once. We argued it. We let Line One talk. The receipts stay on the table when we leave. If you are still with us, you already know the rule: the useful part is the part you can still explain. The rest is weather. We do not broadcast weather as gospel.`,
    },
    {
      by: 1,
      tag: "Signoff",
      emotion: "neutral",
      text: `${closeTag} Stay with us. The next hour will mint itself. We named ${topic} once, we argued it, and we are leaving the receipts on the table. ${first} and ${second}, ${stationName}, still on the clock.`,
    },
  ];

  return lines;
}

export function synthesizeShow(opts: SynthesizeOptions): RadioShow {
  const topicRaw = opts.topic.trim() || "The Future of Autonomous Engineering Systems";
  const topic = speakable(topicRaw).slice(0, 160) || topicRaw.slice(0, 160);
  const core = topicCore(topic) || topic;
  const h1 = speakable(opts.host1 || "Devon Cross") || "Devon Cross";
  const h2 = speakable(opts.host2 || "Dr. Maya Lin") || "Dr. Maya Lin";
  const id1 = voiceIdFor(opts.host1 || h1, "devon");
  const id2 = voiceIdFor(opts.host2 || h2, "maya");
  const ungated = opts.ungated || opts.tone.includes("ungated");
  const fact1 = opts.facts?.[0] ? airFact(opts.facts[0]) : "";
  const fact2 = opts.facts?.[1] ? airFact(opts.facts[1]) : "";
  const source = speakable(opts.sourceName || "the public page") || "the public page";
  const seed = hash(`${opts.stationId}|${topic}|${h1}`);

  const script = writeHour({
    topic,
    core,
    h1,
    h2,
    fact1,
    fact2,
    source,
    ungated,
    band: opts.band,
    seed,
    stationName: STATION_NAME[opts.stationId] || "AI Talk Radio",
  });

  const seen = new Set<string>();
  const unique = script.filter((line) => {
    const key = line.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return line.text.trim().length > 0;
  });

  const caller: Caller = {
    id: `caller-local-${Date.now()}`,
    name: "Jordan",
    location: "Toronto, Canada",
    topic,
    take: unique.find((l) => l.by === "caller")?.text || "",
    status: "on-air",
    avatar: "JO",
  };

  let cursor = 0;
  const segments: ScriptSegment[] = unique.map((line, idx) => {
    const text = speakable(line.text);
    const durationMs = durationFor(text);
    const segment: ScriptSegment = {
      id: `seg-local-${Date.now()}-${idx + 1}`,
      speakerId: line.by === 1 ? id1 : line.by === 2 ? id2 : caller.id,
      speakerName: line.by === 1 ? h1 : line.by === 2 ? h2 : `${caller.name} (${caller.location})`,
      text,
      timestampMs: cursor,
      durationMs,
      emotion: line.emotion,
      topicTag: line.tag,
    };
    cursor += durationMs + GAP_MS;
    return segment;
  });

  const title = mintEpisodeTitle(topic, opts.stationId);
  const notesPrompt = opts.writerNotes ? speakable(opts.writerNotes).slice(0, 220) : "";

  return {
    id: `show-local-${Date.now()}`,
    stationId: opts.stationId,
    title,
    episodeNumber: Math.floor(Math.random() * 800) + 100,
    description: mintEpisodeSummary(title, opts.stationId, h1, h2),
    durationMs: segments.reduce((acc, s) => acc + s.durationMs, 0),
    hosts: [
      { id: id1, name: h1, role: "host-1", title: "Lead Anchor", avatar: "H1", voicePitch: SPEAKERS[id1]?.voicePitch ?? 0.9, voiceRate: SPEAKERS[id1]?.voiceRate ?? 1.0, voiceGender: SPEAKERS[id1]?.voiceGender ?? "male", personality: SPEAKERS[id1]?.personality ?? "Cynical systems vet" },
      { id: id2, name: h2, role: "host-2", title: "Co-Host", avatar: "H2", voicePitch: SPEAKERS[id2]?.voicePitch ?? 1.15, voiceRate: SPEAKERS[id2]?.voiceRate ?? 1.0, voiceGender: SPEAKERS[id2]?.voiceGender ?? "female", personality: SPEAKERS[id2]?.personality ?? "AI optimist" },
    ],
    segments,
    showNotes: [
      opts.sourceUrl
        ? `Source (${opts.sourceName || "public"}): ${opts.sourceUrl}`
        : `Desk topic with no extra URL — LYGO Signal hour.`,
      `Public Witness / Earth overlays are RESOURCE. Dual ledgers and the Star Chart stay CANON.`,
      fact1 ? `Receipt 1: ${fact1.slice(0, 220)}` : `No Wikipedia extract landed. Empty is honest.`,
      notesPrompt ? `Writer notes (not spoken): ${notesPrompt}` : `Working rule: adopt the interface, keep the receipts, explain every failure.`,
    ],
    keyTakeaways: [
      `A headline is weather. A hash you can open is a receipt.`,
      `If a team cannot explain a failure, they have rented the tool instead of adopting it.`,
      `Pin the boundary. Keep the messy middle swappable. Never rewrite the whole stack in one branch.`,
    ],
    references: [
      opts.sourceUrl
        ? { title: opts.sourceName || "Source", url: opts.sourceUrl, type: opts.band === "hn" ? "hn" : "news" }
        : { title: "LYGO Signal", url: "https://chatagent.ca/signal/", type: "news" },
      { title: "Public Witness", url: "https://chatagent.ca/witness/", type: "news" },
    ],
    callers: [caller],
    ungated,
    createdAt: new Date().toISOString(),
  };
}

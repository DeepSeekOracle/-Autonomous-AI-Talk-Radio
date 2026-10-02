/**
 * Local show synthesizer — the studio's own writer.
 *
 * Assembles a spoken hour from the desk writer.
 * Mill prompts, protocol tags, and URLs stay in the notes, not on the air.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { RadioShow, ScriptSegment, Caller } from '../types';
import { SPEAKERS } from '../data';
import { mintEpisodeSummary, mintEpisodeTitle, topicCore } from './mintTitles';
import { looksLikeInstruction, speakable } from './speakable';
import { callerFor, deskTakeaways, writeDeskScript } from './deskWriter';

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

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const airFact = (raw: string): string => {
  const t = speakable(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 40 || looksLikeInstruction(t) || /may refer to|disambiguation/i.test(t)) return "";
  const cut = t.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return cut.length > 280 ? `${cut.slice(0, 277).replace(/\s+\S*$/, "")}.` : cut;
};

export function synthesizeShow(opts: SynthesizeOptions): RadioShow {
  const topicRaw = opts.topic.trim() || "The Future of Autonomous Engineering Systems";
  const topic = speakable(topicRaw).slice(0, 160) || "the claim on the desk tonight";
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

  const stationName = STATION_NAME[opts.stationId] || "AI Talk Radio";
  const script = writeDeskScript({
    topic,
    core,
    h1,
    h2,
    fact1,
    fact2,
    source,
    ungated,
    band: opts.band,
    tone: opts.tone,
    seed,
    stationId: opts.stationId,
    stationName,
  });

  const seen = new Set<string>();
  const unique = script.filter((line) => {
    const key = line.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return line.text.trim().length > 0;
  });

  const card = callerFor(seed);
  const caller: Caller = {
    id: `caller-local-${Date.now()}`,
    name: card.name,
    location: card.location,
    topic,
    take: unique.find((l) => l.by === "caller")?.text || "",
    status: "on-air",
    avatar: card.avatar,
  };

  let cursor = 0;
  const segments: ScriptSegment[] = unique.flatMap((line, idx) => {
    const text = speakable(line.text);
    if (!text || looksLikeInstruction(text)) return [];
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
    return [segment];
  });

  const title = mintEpisodeTitle(topic, opts.stationId);
  const notesPrompt = opts.writerNotes ? speakable(opts.writerNotes).slice(0, 220) : "";
  const takeaways = deskTakeaways({
    topic, core, h1, h2, fact1, fact2, source, ungated, band: opts.band, tone: opts.tone, seed, stationId: opts.stationId, stationName,
  });

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
      notesPrompt ? `Writer notes (not spoken): ${notesPrompt}` : `Desk ruling (not spoken): ${takeaways[0]}`,
    ],
    keyTakeaways: takeaways,
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

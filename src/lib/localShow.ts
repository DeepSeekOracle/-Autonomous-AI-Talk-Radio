/**
 * Local show synthesizer — the studio's own writer.
 *
 * Used whenever the server path is unavailable: a static host that has no /api at all, an exhausted
 * Gemini quota, or no key configured. The contract is the same either way: a complete RadioShow,
 * on air, with no error state for the listener.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { RadioShow, ScriptSegment, Caller } from '../types';
import { SPEAKERS } from '../data';
import { mintEpisodeSummary, mintEpisodeTitle } from './mintTitles';

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
}

/** Spoken pace the studio writes for — the same ~150 wpm the published desk sessions run at. */
const WPM = 150;

const words = (text: string): number => text.trim().split(/\s+/).length;

/** Speaking time for a line: words at the studio pace, plus the breath around it. */
const durationFor = (text: string): number => Math.round((words(text) / WPM) * 60000) + 900;

/** Resolve a host name to a voice profile so the audio engine keeps its casting. */
const voiceIdFor = (name: string, fallback: string): string => {
  const hit = Object.entries(SPEAKERS).find(([, s]) => s.name.toLowerCase() === name.toLowerCase());
  return hit ? hit[0] : fallback;
};

export function synthesizeShow(opts: SynthesizeOptions): RadioShow {
  const topic = opts.topic.trim() || 'The Future of Autonomous Engineering Systems';
  const h1 = opts.host1 || 'Devon Cross';
  const h2 = opts.host2 || 'Dr. Maya Lin';
  const id1 = voiceIdFor(h1, 'devon');
  const id2 = voiceIdFor(h2, 'maya');
  const ungated = opts.ungated || opts.tone.includes('ungated');

  const fact1 = (opts.facts && opts.facts[0]) || "";
  const fact2 = (opts.facts && opts.facts[1]) || "";
  const source = opts.sourceName || "the public page";
  const resource =
    opts.band === "world" || opts.band === "earth"
      ? "This is Public Witness RESOURCE, not Star Chart CANON. Empty is honest."
      : "Quote a receipt you can open. Atmosphere is not proof.";

  const script: Array<{ by: 1 | 2 | 'caller'; text: string; tag: string; emotion: ScriptSegment['emotion'] }> = [
    { by: 1, tag: 'The Cold Open', emotion: 'heated',
      text: `You are tuned to AI Talk Radio. I am ${h1}. Tonight's hour is ${topic}. ${resource}` },
    { by: 2, tag: 'Counter-Argument', emotion: 'intrigued',
      text: fact1
        ? `${h2} here. The public page actually says this: ${fact1} That is the floor. Everything else is atmosphere.`
        : `And I want to know which part of ${topic} we kill too fast. Every time the ground moves, we bury the useful part with the hype.` },
    { by: 1, tag: 'The Cost', emotion: 'skeptical',
      text: `Then name what still has to be true on a machine you own. If ${source} cannot be opened on Tuesday, it is a rumor wearing a timestamp.` },
    { by: 2, tag: 'The Hold', emotion: 'excited',
      text: fact2
        ? `Second receipt: ${fact2} Hold that against the demo. If they disagree, the demo loses.`
        : `The part that holds is boring on purpose: the interface. Pin the boundary. Keep the messy middle swappable.` },
    { by: 1, tag: 'Caller Patch', emotion: 'neutral',
      text: `Line One is lit. Someone who had to live with ${topic} is on the other end. Go ahead, you are on the air.` },
    { by: 'caller', tag: 'Field Report', emotion: 'heated',
      text: `We treated the headline as weather, not gospel. The wins were real only where we could still explain a failure. Once the layer was doing the thinking, on-call went blind.` },
    { by: 2, tag: 'Observability', emotion: 'intrigued',
      text: `That is the honest version, and it never makes the keynote. If you cannot explain the failure, you have not adopted the tool. You have rented it.` },
    { by: 1, tag: 'Station Signoff', emotion: 'neutral',
      text: `Ruling: quote the feed, keep the receipts, never let a layer you cannot read reverse a decision you cannot undo. ${ungated ? 'Ungated, and unsponsored.' : 'That is the broadcast.'} Stay with us.` },
  ];

  const caller: Caller = {
    id: `caller-local-${Date.now()}`,
    name: 'Jordan',
    location: 'Toronto, Canada',
    topic,
    take: script[5].text,
    status: 'on-air',
    avatar: 'JO',
  };

  let cursor = 0;
  const segments: ScriptSegment[] = script.map((line, idx) => {
    const durationMs = durationFor(line.text);
    const segment: ScriptSegment = {
      id: `seg-local-${Date.now()}-${idx + 1}`,
      speakerId: line.by === 1 ? id1 : line.by === 2 ? id2 : caller.id,
      speakerName: line.by === 1 ? h1 : line.by === 2 ? h2 : `${caller.name} (${caller.location})`,
      text: line.text,
      timestampMs: cursor,
      durationMs,
      emotion: line.emotion,
      topicTag: line.tag,
    };
    cursor += durationMs + 650;   // the pause between speakers, same as the live engine
    return segment;
  });

  const title = mintEpisodeTitle(topic, opts.stationId);

  return {
    id: `show-local-${Date.now()}`,
    stationId: opts.stationId,
    title,
    episodeNumber: Math.floor(Math.random() * 800) + 100,
    description: mintEpisodeSummary(title, opts.stationId, h1, h2),
    durationMs: segments.reduce((acc, s) => acc + s.durationMs, 0),
    hosts: [
      { id: id1, name: h1, role: 'host-1', title: 'Lead Anchor', avatar: 'H1', voicePitch: 0.9, voiceRate: 1.0, voiceGender: 'male', personality: 'Cynical systems vet' },
      { id: id2, name: h2, role: 'host-2', title: 'Co-Host', avatar: 'H2', voicePitch: 1.15, voiceRate: 1.0, voiceGender: 'female', personality: 'AI optimist' },
    ],
    segments,
    showNotes: [
      opts.sourceUrl
        ? `Source (${opts.sourceName || "public"}): ${opts.sourceUrl}`
        : `Desk topic with no extra URL — LYGO Signal hour.`,
      `Public Witness / Earth overlays are RESOURCE. Dual ledgers and the Star Chart stay CANON.`,
      fact1 ? `Receipt 1: ${fact1.slice(0, 220)}` : `No Wikipedia extract landed. Empty is honest.`,
      `Working rule: adopt the interface, keep the receipts, explain every failure.`,
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

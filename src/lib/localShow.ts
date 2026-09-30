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

  const script: Array<{ by: 1 | 2 | 'caller'; text: string; tag: string; emotion: ScriptSegment['emotion'] }> = [
    { by: 1, tag: 'The Cold Open', emotion: 'heated',
      text: `You are tuned to AI Talk Radio. I am ${h1}. I spent the morning reading every claim about ${topic}, and I want to know which of them survive contact with a production cluster.` },
    { by: 2, tag: 'Counter-Argument', emotion: 'intrigued',
      text: `And I want to know which of them we kill too fast. Every time the ground moves, we bury the useful part with the hype. ${topic} is not one idea. It is four, and only one of them is real yet.` },
    { by: 1, tag: 'Technical Debt', emotion: 'skeptical',
      text: `Then name it. Which one is real, and what does it cost to run it on a Tuesday at three in the morning when the pager goes off?` },
    { by: 2, tag: 'Abstraction Shift', emotion: 'excited',
      text: `The part that holds is boring on purpose: the interface. Teams that pinned the boundary, and kept the messy middle swappable, shipped. Teams that rewrote everything at once are still in a branch.` },
    { by: 1, tag: 'Caller Patch', emotion: 'neutral',
      text: `Line One is lit. ${topic} has somebody on the other end who has actually deployed it. Go ahead, you are on the air.` },
    { by: 'caller', tag: 'Field Report', emotion: 'heated',
      text: `We ran this for six weeks in production. The wins were real and so was the on-call load, because nobody could explain a failure once the layer was doing the thinking.` },
    { by: 2, tag: 'Observability', emotion: 'intrigued',
      text: `That is the honest version of the story, and it is the one that never makes the keynote. If you cannot explain the failure, you have not adopted the tool. You have rented it.` },
    { by: 1, tag: 'Station Signoff', emotion: 'neutral',
      text: `So the ruling stands: adopt the interface, keep the receipts, and never let a layer you cannot read make a decision you cannot reverse. ${ungated ? 'Ungated, and unsponsored.' : 'That is the broadcast.'} Stay with us.` },
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
      `What ${topic} actually changes on a production floor, and what it only changes in a slide deck.`,
      `The one part of the argument that held up across six weeks of real traffic.`,
      `A caller report from Line One on on-call load and the failures nobody could explain.`,
      `The working rule we close on: adopt the interface, keep the receipts.`,
    ],
    keyTakeaways: [
      `Claims about ${topic} that cannot survive a pager at 3 a.m. are marketing, not architecture.`,
      `Pin the boundary, keep the middle swappable, and never rewrite the whole stack in one branch.`,
      `If a team cannot explain a failure, they have rented the tool instead of adopting it.`,
    ],
    references: [
      { title: `Hacker News discussion on ${topic}`, url: 'https://news.ycombinator.com', type: 'hn' },
      { title: 'Open source implementations on GitHub', url: 'https://github.com', type: 'github' },
    ],
    callers: [caller],
    ungated,
    createdAt: new Date().toISOString(),
  };
}

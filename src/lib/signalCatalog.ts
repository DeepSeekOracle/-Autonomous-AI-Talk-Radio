/**
 * Finished LYGO Signal hours. Eternity plays one of these between live hours.
 * The list is the public catalog, so a new finished episode joins the wheel
 * without a studio rebuild.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { RadioShow, RadioStation } from '../types';

export type SignalEpisode = {
  slug: string;
  title: string;
  audio: string;
  page: string;
  seconds: number;
  speakers: string[];
};

const MIRROR = 'https://cdn.jsdelivr.net/gh/DeepSeekOracle/chatagent@main/signal/shows.json';
const ORIGIN = 'https://chatagent.ca/signal/shows.json';

let cache: { at: number; episodes: SignalEpisode[] } | null = null;

type SignalTurn = { seconds: number; speaker: string; text: string };
type SignalScript = { summary: string; turns: SignalTurn[] };

const scripts = new Map<string, SignalScript | null>();

function asEpisode(row: unknown): SignalEpisode | null {
  if (!row || typeof row !== 'object') return null;
  const item = row as Record<string, unknown>;
  const slug = String(item.slug || '');
  const title = String(item.title || '').trim();
  const audio = String(item.audio || '');
  if (!slug || !title || !audio.startsWith('https://')) return null;
  const speakers = Array.isArray(item.speakers)
    ? item.speakers.filter((name) => typeof name === 'string' && name.trim())
    : [];
  const seconds = Number(item.seconds);
  return {
    slug,
    title,
    audio,
    page: String(item.page || 'https://chatagent.ca/signal/'),
    seconds: Number.isFinite(seconds) && seconds > 30 ? seconds : 600,
    speakers: speakers as string[],
  };
}

export async function loadSignalCatalog(): Promise<SignalEpisode[]> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.episodes;
  const urls = ['/signal/shows.json', MIRROR, ORIGIN];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const rows = (data as { shows?: unknown[] })?.shows;
      if (!Array.isArray(rows)) continue;
      const seen = new Set<string>();
      const episodes = rows
        .map(asEpisode)
        .filter((ep): ep is SignalEpisode => {
          if (!ep || seen.has(ep.title)) return false;
          seen.add(ep.title);
          return true;
        });
      if (!episodes.length) continue;
      cache = { at: Date.now(), episodes };
      return episodes;
    } catch {
      /* the next mirror can answer */
    }
  }
  return [];
}

function asTurn(row: unknown): SignalTurn | null {
  if (!row || typeof row !== 'object') return null;
  const item = row as Record<string, unknown>;
  const text = String(item.text || '').replace(/\s+/g, ' ').trim();
  const speaker = String(item.speaker || '').trim();
  const seconds = Number(item.seconds);
  if (!text || !speaker || !Number.isFinite(seconds) || seconds < 0) return null;
  return { seconds, speaker, text };
}

/** The published timestamped script, when the episode page has one. */
export async function loadSignalScript(slug: string): Promise<SignalScript | null> {
  if (scripts.has(slug)) return scripts.get(slug) || null;
  const urls = [
    `/signal/${slug}/show_notes.json`,
    `https://cdn.jsdelivr.net/gh/DeepSeekOracle/chatagent@main/signal/${slug}/show_notes.json`,
    `https://chatagent.ca/signal/${slug}/show_notes.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json() as { summary?: unknown; transcript?: unknown[] };
      const turns = Array.isArray(data.transcript)
        ? data.transcript.map(asTurn).filter((turn): turn is SignalTurn => Boolean(turn))
        : [];
      if (turns.length < 4) continue;
      const script = { summary: String(data.summary || '').replace(/\s+/g, ' ').trim(), turns };
      scripts.set(slug, script);
      return script;
    } catch {
      /* the next copy can answer */
    }
  }
  scripts.set(slug, null);
  return null;
}

function scriptSegments(ep: SignalEpisode, turns: SignalTurn[], durationMs: number) {
  return turns.map((turn, index) => {
    const start = Math.round(turn.seconds * 1000);
    const next = turns[index + 1] ? Math.round(turns[index + 1].seconds * 1000) : durationMs;
    return {
      id: `seg-signal-${ep.slug}-${index}`,
      speakerId: 'signal-reel',
      speakerName: turn.speaker,
      text: turn.text,
      timestampMs: start,
      durationMs: Math.max(1000, next - start),
      emotion: 'neutral' as const,
      topicTag: 'LYGO Signal',
    };
  });
}

/** One unheard finished hour, on the desk that asked for the next show. */
export async function pickSignalHour(
  episodes: SignalEpisode[],
  used: Set<string>,
  station: RadioStation,
): Promise<RadioShow | null> {
  const fresh = episodes.filter((ep) => !used.has(ep.title));
  if (!fresh.length) return null;
  const ep = fresh[Math.floor(Math.random() * fresh.length)];
  const cast = ep.speakers.length ? ep.speakers.join(', ') : 'LYGO Signal';
  const durationMs = Math.round(ep.seconds * 1000);
  const script = await loadSignalScript(ep.slug).catch(() => null);
  const segments = script?.turns.length
    ? scriptSegments(ep, script.turns, durationMs)
    : [
        {
          id: `seg-signal-${ep.slug}`,
          speakerId: 'signal-reel',
          speakerName: cast,
          text: ep.title,
          timestampMs: 0,
          durationMs,
          emotion: 'neutral' as const,
          topicTag: 'LYGO Signal',
        },
      ];
  return {
    id: `show-signal-${ep.slug}`,
    stationId: station.id,
    topic: ep.title,
    title: ep.title,
    episodeNumber: 1,
    description: script?.summary || `Finished LYGO Signal hour with ${cast}.`,
    durationMs,
    hosts: station.hosts,
    audioUrl: ep.audio,
    segments,
    showNotes: [`Finished recording: ${ep.page}`, `Voices: ${cast}.`],
    keyTakeaways: [`${ep.title} is a finished LYGO Signal hour.`],
    references: [{ title: ep.title, url: ep.page, type: 'news' }],
    callers: [],
    ungated: station.id === 'station-kernel-panic',
    createdAt: new Date().toISOString(),
  };
}

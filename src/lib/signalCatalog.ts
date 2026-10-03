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

/** One unheard finished hour, on the desk that asked for the next show. */
export function pickSignalHour(
  episodes: SignalEpisode[],
  used: Set<string>,
  station: RadioStation,
): RadioShow | null {
  const fresh = episodes.filter((ep) => !used.has(ep.title));
  if (!fresh.length) return null;
  const ep = fresh[Math.floor(Math.random() * fresh.length)];
  const host = station.hosts[0];
  const cast = ep.speakers.length ? ep.speakers.join(', ') : 'LYGO Signal';
  const durationMs = Math.round(ep.seconds * 1000);
  return {
    id: `show-signal-${ep.slug}`,
    stationId: station.id,
    topic: ep.title,
    title: ep.title,
    episodeNumber: 1,
    description: `Finished LYGO Signal hour with ${cast}.`,
    durationMs,
    hosts: station.hosts,
    audioUrl: ep.audio,
    segments: [
      {
        id: `seg-signal-${ep.slug}`,
        speakerId: host?.id || 'devon',
        speakerName: host?.name || 'LYGO Signal',
        text: `This hour is already recorded. ${ep.title}. The voices are ${cast}.`,
        timestampMs: 0,
        durationMs,
        emotion: 'neutral',
        topicTag: 'LYGO Signal',
      },
    ],
    showNotes: [`Finished recording: ${ep.page}`, `Voices: ${cast}.`],
    keyTakeaways: [`${ep.title} is a finished LYGO Signal hour.`],
    references: [{ title: ep.title, url: ep.page, type: 'news' }],
    callers: [],
    ungated: station.id === 'station-kernel-panic',
    createdAt: new Date().toISOString(),
  };
}

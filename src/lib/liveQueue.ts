/**
 * Hours minted ahead of time from public feeds.
 * Same-origin queue.json is the Pages copy. jsDelivr follows the GitHub mint.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { RadioShow } from '../types';

export type LiveQueue = {
  mintedAt: string;
  shows: RadioShow[];
};

const MIRROR = 'https://cdn.jsdelivr.net/gh/DeepSeekOracle/-Autonomous-AI-Talk-Radio@main/live/queue.json';

let cache: { at: number; doc: LiveQueue | null } | null = null;

function asQueue(data: unknown): LiveQueue | null {
  const shows = (data as { shows?: RadioShow[] })?.shows;
  if (!Array.isArray(shows)) return null;
  const mintedAt = String((data as { mintedAt?: string }).mintedAt || '');
  return {
    mintedAt,
    shows: shows.filter((show) => show && Array.isArray(show.segments) && show.segments.length >= 16),
  };
}

export function pickQueuedShow(shows: RadioShow[], used: Set<string>, stationId?: string): RadioShow | null {
  const fresh = shows.filter((show) => {
    const key = show.topic || show.title;
    return Boolean(key) && !used.has(key) && show.segments.length >= 16;
  });
  const preferred = stationId ? fresh.filter((show) => show.stationId === stationId) : [];
  return (preferred.length ? preferred : fresh)[0] || null;
}

export async function loadLiveQueue(): Promise<LiveQueue | null> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.doc;
  const base = import.meta.env.BASE_URL || '/';
  const urls = [`${base}queue.json`, MIRROR];
  const docs: LiveQueue[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const doc = asQueue(await res.json());
      if (doc?.shows.length) docs.push(doc);
    } catch {
      /* one mirror can miss */
    }
  }
  if (!docs.length) {
    cache = { at: Date.now(), doc: null };
    return null;
  }
  docs.sort((a, b) => b.mintedAt.localeCompare(a.mintedAt));
  const seen = new Set<string>();
  const shows: RadioShow[] = [];
  for (const doc of docs) {
    for (const show of doc.shows) {
      if (seen.has(show.id)) continue;
      seen.add(show.id);
      shows.push(show);
    }
  }
  const doc = { mintedAt: docs[0].mintedAt, shows };
  cache = { at: Date.now(), doc };
  return doc;
}

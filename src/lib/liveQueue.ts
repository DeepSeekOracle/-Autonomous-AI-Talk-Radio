/**
 * Hours minted ahead of time from public feeds.
 * Same-origin queue.json is the Pages copy. jsDelivr follows the GitHub mint.
 * When both answer, the newer mintedAt is the runway. The older file is only a fallback.
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

/** The newest complete runway wins. A stale copy must not put retired hours back on the air. */
export function chooseQueue(docs: LiveQueue[]): LiveQueue | null {
  const ready = docs.filter((doc) => doc.shows.length > 0);
  if (!ready.length) return null;
  ready.sort((a, b) => b.mintedAt.localeCompare(a.mintedAt));
  return ready[0];
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
  if (!docs.length) return null;
  const doc = chooseQueue(docs);
  cache = { at: Date.now(), doc };
  return doc;
}

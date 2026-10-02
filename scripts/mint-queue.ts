/**
 * Mint the next live hours from public feeds and write live/queue.json.
 * GitHub Actions runs this on a schedule. A person can run it with MINT_COUNT=4.
 *
 *   npx tsx scripts/mint-queue.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIONS } from '../src/data';
import { research_topic } from '../src/lib/agentEngine';
import { synthesizeShow } from '../src/lib/localShow';
import { gatherTopicDeck, nextLiveStory } from '../src/lib/topicMill';
import type { RadioShow } from '../src/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const liveDir = path.join(root, 'live');
const queuePath = path.join(liveDir, 'queue.json');
const heardPath = path.join(liveDir, 'heard.json');

type QueueFile = { mintedAt: string; shows: RadioShow[] };

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function quoteFromPage(title: string, url: string): Promise<string> {
  if (!url.startsWith('https://')) return '';
  const pageUrl = url.replace('://news.un.org/feed/view/', '://news.un.org/');
  try {
    const res = await fetch(pageUrl, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; LYGO-Talk-Radio/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return '';
    const type = res.headers.get('content-type') || '';
    if (type && !/html|text\/plain|xml/i.test(type)) return '';
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, ' and ')
      .replace(/&#39;|&quot;/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/Facebook Twitter Print Email/gi, ' ')
      .trim();
    const useful = title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4);
    const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length >= 80 && sentence.length <= 600);
    const hit = sentences.find((sentence) => {
      const low = sentence.toLowerCase();
      if (/cookie|subscribe|javascript|all rights reserved/i.test(low)) return false;
      const matched = useful.filter((word) => low.includes(word)).length;
      return useful.length ? matched >= Math.min(2, useful.length) : false;
    });
    const cleaned = (hit || '')
      .replace(/Facebook Twitter Print Email/gi, ' ')
      .replace(/\bBy [A-Z][a-z]+ [A-Z][a-z]+\b/g, ' ')
      .replace(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) 20\d{2}\b/g, ' ')
      .replace(/\b(Climate and Environment|Humanitarian Aid|Peace and Security|Law and Crime Prevention)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length < 80 || /facebook twitter|print email/i.test(cleaned)) return '';
    return cleaned.slice(0, 280);
  } catch {
    return '';
  }
}

const count = Math.min(8, Math.max(1, Number(process.env.MINT_COUNT || 1)));
const heard = readJson<string[]>(heardPath, []);
const queue = readJson<QueueFile>(queuePath, { mintedAt: '', shows: [] });
const used = new Set<string>([...heard, ...queue.shows.map((show) => show.topic || show.title)]);
const deck = await gatherTopicDeck();
const real = deck.filter((item) => item.band !== 'lygo').length;
console.log(`deck ${deck.length} public ${real} heard ${used.size} minting ${count}`);

let made = 0;
let guard = 0;
let cursor = queue.shows.length;
while (made < count && guard < count * 4) {
  guard += 1;
  const station = STATIONS[cursor % STATIONS.length];
  cursor += 1;
  const story = nextLiveStory(deck, station.id, used);
  if (!story) {
    console.log('no unused public item left');
    break;
  }
  used.add(story.title);
  const [packet, pageQuote] = await Promise.all([
    research_topic(story.title, 'standard').catch(() => undefined),
    quoteFromPage(story.title, story.url || ''),
  ]);
  const hosts = station.hosts;
  const show = synthesizeShow({
    topic: story.title,
    tone: station.id === 'station-kernel-panic' ? 'ungated' : 'unfiltered-debate',
    stationId: station.id,
    ungated: station.id === 'station-kernel-panic',
    host1: hosts[0].name,
    host2: (hosts[1] || hosts[0]).name,
    facts: [pageQuote, ...(packet?.sources.map((src) => src.key_quote) || [])].filter(Boolean),
    packet,
    sourceUrl: story.url || '',
    sourceName: story.source,
    band: story.band,
    live: true,
  });
  show.id = `show-live-${story.band}-${made + queue.shows.length + 1}`;
  show.topic = story.title;
  const open = show.segments[0]?.text || '';
  if (show.segments.length < 16 || show.durationMs < 7 * 60 * 1000 || !open.includes(story.title)) {
    console.log('skip weak hour', story.title.slice(0, 80));
    continue;
  }
  queue.shows.push(show);
  heard.push(story.title);
  made += 1;
  console.log(`minted ${station.id} · ${story.band} · ${story.title.slice(0, 90)} · ${Math.round(show.durationMs / 1000)}s · page ${pageQuote ? 'yes' : 'no'} · wiki ${packet?.sources.length || 0}`);
}

queue.shows = queue.shows.slice(-8);
queue.mintedAt = new Date().toISOString();
mkdirSync(liveDir, { recursive: true });
writeFileSync(queuePath, JSON.stringify(queue, null, 2));
writeFileSync(heardPath, JSON.stringify([...new Set(heard)].slice(-80), null, 2));
console.log(`wrote ${queue.shows.length} shows, ${made} new`);
process.exit(made > 0 || count === 0 ? 0 : 0);

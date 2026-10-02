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
import { decodePageText, quoteFromArticle } from '../src/lib/pageQuote';
import { gatherTopicDeck, nextLiveStory } from '../src/lib/topicMill';
import { speakable } from '../src/lib/speakable';
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
    return quoteFromArticle(title, decodePageText(html));
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
  const spokenTopic = speakable(story.title).slice(0, 160);
  show.id = liveShowId(story.band, story.title);
  show.topic = story.title;
  const open = show.segments[0]?.text || '';
  if (show.segments.length < 16 || show.durationMs < 7 * 60 * 1000 || !spokenTopic || !open.includes(spokenTopic)) {
    console.log('skip weak hour', story.title.slice(0, 80));
    continue;
  }
  queue.shows.push(show);
  heard.push(story.title);
  made += 1;
  console.log(`minted ${station.id} · ${story.band} · ${story.title.slice(0, 90)} · ${Math.round(show.durationMs / 1000)}s · page ${pageQuote ? 'yes' : 'no'} · wiki ${packet?.sources.length || 0}`);
}

if (made > 0) {
  queue.shows = queue.shows.slice(-8);
  queue.mintedAt = new Date().toISOString();
  mkdirSync(liveDir, { recursive: true });
  writeFileSync(queuePath, JSON.stringify(queue, null, 2));
  writeFileSync(heardPath, JSON.stringify([...new Set(heard)].slice(-80), null, 2));
}
console.log(`wrote ${made > 0 ? queue.shows.length : 'unchanged'} shows, ${made} new`);
process.exit(0);

function liveShowId(band: string, title: string): string {
  let h = 2166136261;
  const key = `${band}|${title}`;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return `show-live-${band}-${(h >>> 0).toString(36)}`;
}

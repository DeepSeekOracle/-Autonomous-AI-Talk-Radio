/**
 * Studio self-check — proves the two paths that must never fail:
 * the local show writer and the episode pack writer.
 *
 *   npm run selfcheck
 *
 * Exits non-zero on failure, so it can gate a deploy.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { synthesizeShow } from '../src/lib/localShow';
import { buildZip, episodePackFiles, crc32 } from '../src/lib/packZip';
import { mintEpisodeTitle, topicCore } from '../src/lib/mintTitles';
import { LYGO_TOPICS, nextLiveStory, parseWitnessMonitor, pickTopic, type DeskTopic } from '../src/lib/topicMill';
import { pickEnglishVoice, scoreEnglishVoice } from '../src/lib/voices';
import { chunkSpeech, speakable } from '../src/lib/speakable';
import { seedCatalog } from '../src/lib/seedShows';
import { pickQueuedShow } from '../src/lib/liveQueue';
import { adoptDiscoveredTopic, assembleResearch, rankTopicCandidates } from '../src/lib/agentEngine';

const topic = 'why every agent demo dies in production';

const show = synthesizeShow({
  topic,
  tone: 'unfiltered-ungated',
  stationId: 'station-algorithmic-wire',
  ungated: true,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
});

assert.ok(show.segments.length >= 16 && show.segments.length <= 28, 'a synthesized hour is a full desk, not eight lines');
assert.equal(show.hosts.length, 2, 'two hosts');
assert.equal(show.callers.length, 1, 'one caller patched into the broadcast');
assert.ok(show.showNotes.length >= 4, 'show notes are written');
assert.ok(show.keyTakeaways.length >= 3, 'takeaways are written');
assert.ok(show.segments.every((s) => s.text.trim().length > 0), 'no empty dialogue lines');
assert.ok(show.segments.every((s) => s.durationMs > 0 && s.timestampMs >= 0), 'every line is timed');
assert.ok(show.segments[0].text.includes(topic), 'the topic reaches the cold open');
assert.ok(show.durationMs > 7 * 60 * 1000, 'a full episode runs over seven minutes');
assert.ok(
  !show.segments.some((s) => /RESOURCE|CANON|Empty is honest|executive showrunner|https?:\/\/|operator notes|we do not read|mint itself|we name it once|system prompt|return json|these instructions/i.test(s.text)),
  'protocol notes and writer directions stay off the air',
);
const leaked = speakable('The outage started at three. Do not read the operator notes on the air. Bring a page.');
assert.ok(!/operator notes/i.test(leaked), 'a direction sentence is cut out of a spoken line');
assert.match(leaked, /outage started/);
assert.match(leaked, /Bring a page/);
assert.ok(!show.segments.some((s) => /Δ9Φ963/.test(s.text)), 'the mark is spoken in English');
assert.match(speakable('See https://chatagent.ca/signal Δ9Φ963 RESOURCE CANON'), /LYGO mark/);
assert.ok(
  chunkSpeech('One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree.', 22).every(
    (c) => c.split(/\s+/).length <= 22,
  ),
  'speech chunks stay under the Chrome cutoff',
);
const catalog = seedCatalog();
assert.equal(catalog.length, 4, 'four station slates');
assert.ok(catalog.every((s) => s.durationMs > 7 * 60 * 1000), 'catalog hours are full length');
assert.ok(!/Firestorm Over|Great Software Rewrite|Spec Prompters/i.test(show.title), 'no leftover demo headline');
assert.ok(show.title.length <= 64, 'episode title stays on a radio slate');
assert.ok(!show.title.includes(topic), 'title is minted from the topic, not the whole prompt');
assert.equal(
  topicCore('The Great Software Rewrite: Are Devs Just Spec Prompters Now?'),
  'Great Software Rewrite Devs Spec Prompters',
);
assert.ok(mintEpisodeTitle(topic, 'station-algorithmic-wire', () => 0).startsWith('Wire Desk:'), 'Algorithmic Wire titles use the station lens');
const money = synthesizeShow({
  topic,
  tone: 'deep-dive',
  stationId: 'station-sv-confidential',
  ungated: false,
  host1: 'Victoria Sterling',
  host2: 'Devon Cross',
});
const world = synthesizeShow({
  topic: 'M 6.2 near the Kermadec Islands',
  tone: 'late-night',
  stationId: 'station-algorithmic-wire',
  ungated: false,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
  band: 'earth',
});
assert.notEqual(show.segments[3].text.slice(0, 70), money.segments[3].text.slice(0, 70), 'stations do not share a scene');
assert.ok(/check|payer|invoice|bill/i.test(money.segments.map((s) => s.text).join(' ')), 'the money desk talks about the bill');
assert.ok(/cord|unplug|rent/i.test(synthesizeShow({
  topic,
  tone: 'ungated',
  stationId: 'station-kernel-panic',
  ungated: true,
  host1: '"ZeroDay" Zack',
  host2: 'Dr. Aris Thorne',
}).segments.map((s) => s.text).join(' ')), 'kernel panic talks about the cord');
assert.ok(/headline|confirm/i.test(world.segments.map((s) => s.text).join(' ')), 'an earth headline is not staged as a pull request');
assert.ok(!/pull request/i.test(world.segments.map((s) => s.text).join(' ')), 'a quake hour does not borrow a software scene');
assert.ok(show.keyTakeaways.some((t) => /agent demo|production/i.test(t)), 'takeaways name this hour');
assert.equal(show.callers[0].name.length > 0, true, 'caller card has a name');
assert.ok(show.segments.some((s) => s.text.includes(show.callers[0].name)), 'the spoken caller matches the card');
assert.ok(LYGO_TOPICS.length >= 8, 'eternity has a LYGO desk pool');
const parsed = parseWitnessMonitor({
  world: [{ title: 'UN chief calls for rules on lethal autonomous weapons', url: 'https://news.un.org/x', source: 'un_news' }],
  severe: [{ title: 'M 6.2 - Kermadec Islands, New Zealand', url: 'https://earthquake.usgs.gov/x', source: 'usgs' }],
});
assert.equal(parsed.length, 2, 'witness monitor parses world and earth lanes');
assert.equal(parsed[0].band, 'world');
assert.match(parsed[0].prompt, /RESOURCE/);
const picked = pickTopic(LYGO_TOPICS, 'station-hn-live', new Set(), () => 0);
assert.ok(picked.title.length > 0, 'pickTopic returns a desk');
const liveDeck: DeskTopic[] = [
  { title: 'Lattice roundtable', prompt: 'saved', source: 'LYGO Signal', band: 'lygo', url: 'https://chatagent.ca/signal/' },
  { title: 'Show HN: the desk clock that pages the night shift', prompt: 'board', source: 'Hacker News', band: 'hn', url: 'https://news.ycombinator.com/item?id=1' },
  { title: 'M 6.1 south of the Kermadec Islands', prompt: 'quake', source: 'USGS', band: 'earth', url: 'https://earthquake.usgs.gov/x' },
];
assert.equal(nextLiveStory(liveDeck, 'station-algorithmic-wire', new Set())?.title, liveDeck[1].title, 'forever skips the canned desk and takes a public item');
assert.equal(
  nextLiveStory(liveDeck, 'station-hn-live', new Set([liveDeck[1].title]))?.title,
  liveDeck[2].title,
  'the next hour is the next unused public item',
);
const liveQuote = 'The night shift clock pages one person, and that person can switch it off.';
const liveA = synthesizeShow({
  topic: liveDeck[1].title,
  tone: 'unfiltered',
  stationId: 'station-hn-live',
  ungated: false,
  host1: 'Casey Rivera',
  host2: 'Devon Cross',
  band: 'hn',
  sourceName: 'Hacker News',
  facts: [liveQuote],
  live: true,
});
const liveB = synthesizeShow({
  topic: liveDeck[2].title,
  tone: 'late-night',
  stationId: 'station-algorithmic-wire',
  ungated: false,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
  band: 'earth',
  sourceName: 'USGS',
  live: true,
});
assert.ok(liveA.segments[0].text.includes(liveDeck[1].title), 'a live cold open names the public item');
assert.ok(liveB.segments[0].text.includes(liveDeck[2].title), 'the next live hour names its own item');
assert.notEqual(liveA.segments[3].text.slice(0, 80), liveB.segments[3].text.slice(0, 80), 'two live hours do not share a scene');
assert.ok(liveA.segments.some((s) => s.text.includes('switch it off')), 'a live hour reads the page it was given');
assert.ok(liveA.segments.filter((s) => s.text.includes('switch it off')).length === 1, 'the page is read once');
assert.ok(!/pull request/i.test(liveB.segments.map((s) => s.text).join(' ')), 'a live quake hour does not borrow a software scene');
assert.ok(liveA.durationMs > 7 * 60 * 1000 && liveB.durationMs > 7 * 60 * 1000, 'a live hour still clears seven minutes');
assert.ok(
  ![...liveA.segments, ...liveB.segments].some((s) => /RESOURCE|CANON|https?:\/\/|operator notes|return json/i.test(s.text)),
  'a live hour keeps the feed notes off the air',
);
assert.equal(
  pickQueuedShow([liveA, liveB], new Set([liveA.topic || '']), 'station-algorithmic-wire')?.topic,
  liveB.topic,
  'a prepared hour is skipped after it has been heard',
);
assert.ok(
  scoreEnglishVoice('Microsoft Andrew Online (Natural) - English (United States)', 'en-US', 'male', false) >
    scoreEnglishVoice('Microsoft David - English (United States)', 'en-US', 'male', true),
  'natural Andrew beats robotic David',
);
const malePick = pickEnglishVoice(
  [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
    { name: 'Microsoft Guy Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  ],
  'male',
);
assert.equal(malePick?.name.includes('Guy'), true, 'default male is a natural Guy voice when present');
assert.ok(!show.segments.some((s) => /undefined|\[object/.test(s.text)), 'no unresolved placeholders');

const files = episodePackFiles(show);
assert.deepEqual(
  files.map((f) => f.name.split('/').pop()).sort(),
  ['README.txt', 'script.txt', 'show_notes.json', 'transcript.txt'],
  'the pack carries notes, transcript, script and a README',
);
assert.equal(crc32(new Uint8Array(0)), 0, 'CRC-32 of empty input is 0');

const zip = buildZip(files);
const bytes = new Uint8Array(await zip.arrayBuffer());
const signature = String.fromCharCode(...bytes.slice(0, 4));
assert.equal(signature, 'PK\u0003\u0004', 'the archive starts with a local file header');
assert.ok(bytes.length > 4000, 'the archive carries the whole episode');

const ranked = rankTopicCandidates(
  [
    {
      topic: 'Old picnic weather in the park',
      url: 'https://example.com/picnic',
      source: 'archive',
      published_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      topic: 'Local model crash versus cloud outage leak',
      url: 'https://news.ycombinator.com/item?id=1',
      source: 'hn',
      published_at: new Date().toISOString(),
    },
  ],
  { network_theme: 'local models and outages', lookback_minutes: 180, max_candidates: 5, now: Date.now() },
);
assert.equal(ranked.length, 1, 'stale topics fall outside the lookback');
assert.match(ranked[0].topic, /crash/);
assert.ok(ranked[0].controversy_score > 0, 'a crash and a leak score as contested');

const deskRank = rankTopicCandidates(
  [
    {
      topic: 'Green forest fire notification in Australia',
      url: 'https://www.gdacs.org/report.aspx?eventid=1',
      source: 'Public Witness',
      published_at: '',
    },
    {
      topic: 'Local model outage versus a cloud leak',
      url: 'https://news.ycombinator.com/item?id=2',
      source: 'hn',
      published_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      max_age_ms: 48 * 60 * 60 * 1000,
    },
  ],
  { network_theme: 'architecture versus production fire', lookback_minutes: 180, now: Date.now() },
);
assert.match(deskRank[0].topic, /outage/, 'a fresh desk story outranks an undated wildfire note');
assert.equal(
  adoptDiscoveredTopic(
    { ...deskRank.find((row) => /forest fire/i.test(row.topic))!, listener_relevance: 0.17 },
    'lygo',
  ),
  false,
  'one shared word does not move the wire desk onto a wildfire',
);
assert.equal(adoptDiscoveredTopic(deskRank[0], 'hn'), true, 'a dated front-page item can open the hacker news desk');
const outbound = {
  topic: 'Apple Pass Designer',
  why_now: 'Fresh on Hacker News inside the lookback. Ranked for the front page.',
  source_urls: ['https://developer.apple.com/pass-designer/'],
  sentiment: 'neutral' as const,
  controversy_score: 0,
  listener_relevance: 0,
};
assert.equal(adoptDiscoveredTopic(outbound, 'hn'), true, 'a front-page story keeps its desk even when the link leaves the site');
assert.equal(adoptDiscoveredTopic(outbound, 'lygo'), false, 'the wire desk does not inherit an unrelated front-page link');

const packet = assembleResearch('local models', 'standard', [
  {
    title: 'Operator hardware',
    url: 'https://en.wikipedia.org/wiki/Local_model',
    published_at: '',
    key_quote: 'Local models run on hardware the operator controls and can switch off.',
  },
  {
    title: 'Weights still call home',
    url: 'https://news.ycombinator.com/item?id=9',
    published_at: '',
    key_quote: 'The same setup still phones home for weights unless the copy is complete.',
  },
]);
assert.ok(packet.confidence >= 0.6, 'two domains are enough to speak a narrow ruling');
assert.equal(packet.soften, false);
assert.match(packet.framings.con, /another site/);
assert.match(packet.sources[1].key_quote, /phones home/);
const dirty = assembleResearch('widgets', 'standard', [
  {
    title: 'Code drop',
    url: 'https://news.ycombinator.com/item?id=3',
    published_at: '',
    key_quote: '<p><pre><code>exporters: otlp endpoint: :4317</code></pre></p>',
  },
  {
    title: 'Widget',
    url: 'https://en.wikipedia.org/wiki/Widget',
    published_at: '',
    key_quote: 'A widget is a small tool a person can still name after the meeting is over.',
  },
]);
assert.equal(dirty.sources.length, 1, 'a code block is not a citation');
assert.ok(!/exporters|<pre|otlp/.test(dirty.sources.map((s) => s.key_quote).join(' ')));

const sourced = synthesizeShow({
  topic,
  tone: 'unfiltered',
  stationId: 'station-algorithmic-wire',
  ungated: true,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
  packet,
});
assert.ok(
  sourced.segments.some((s) => /phones home|switch off/i.test(s.text)),
  'a sourced hour quotes the pages instead of inventing a citation',
);
assert.ok(sourced.segments[0].text.includes(topic), 'a sourced cold open still names the topic');
assert.ok(sourced.durationMs > 7 * 60 * 1000, 'a sourced hour still clears seven minutes');
assert.ok(
  !sourced.segments.some((s) => /https?:\/\/|operator notes|return json/i.test(s.text)),
  'page addresses stay in the notes',
);

const thin = assembleResearch('local models', 'standard', [
  {
    title: 'Only one page',
    url: 'https://en.wikipedia.org/wiki/Only',
    published_at: '',
    key_quote: 'A single encyclopedia page is not enough to settle a live argument about local models.',
  },
]);
assert.equal(thin.soften, true, 'one domain keeps the hour a question');
const questioned = synthesizeShow({
  topic,
  tone: 'unfiltered',
  stationId: 'station-algorithmic-wire',
  ungated: true,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
  packet: thin,
});
assert.match(questioned.segments[0].text, /holding this as a question/);
assert.ok(questioned.segments[0].text.includes(topic), 'a softened cold open still names the topic');
assert.ok(
  String.fromCharCode(...bytes.slice(bytes.length - 22, bytes.length - 18)) === 'PK\u0005\u0006',
  'the archive ends with an end-of-central-directory record',
);

console.log('selfcheck OK');
console.log(`  show    ${show.segments.length} segments · ${show.segments.reduce((a, s) => a + s.text.split(/\s+/).length, 0)} words · ${(show.durationMs / 1000).toFixed(0)}s · ${show.title}`);
console.log(`  pack    ${files.length} files · ${(bytes.length / 1024).toFixed(1)} kB · ${files[0].name.split('/')[0]}`);

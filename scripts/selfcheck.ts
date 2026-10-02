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
import { LYGO_TOPICS, parseWitnessMonitor, pickTopic } from '../src/lib/topicMill';
import { pickEnglishVoice, scoreEnglishVoice } from '../src/lib/voices';
import { chunkSpeech, speakable } from '../src/lib/speakable';
import { seedCatalog } from '../src/lib/seedShows';

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
assert.ok(
  String.fromCharCode(...bytes.slice(bytes.length - 22, bytes.length - 18)) === 'PK\u0005\u0006',
  'the archive ends with an end-of-central-directory record',
);

console.log('selfcheck OK');
console.log(`  show    ${show.segments.length} segments · ${show.segments.reduce((a, s) => a + s.text.split(/\s+/).length, 0)} words · ${(show.durationMs / 1000).toFixed(0)}s · ${show.title}`);
console.log(`  pack    ${files.length} files · ${(bytes.length / 1024).toFixed(1)} kB · ${files[0].name.split('/')[0]}`);

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

const topic = 'why every agent demo dies in production';

const show = synthesizeShow({
  topic,
  tone: 'unfiltered-ungated',
  stationId: 'station-algorithmic-wire',
  ungated: true,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
});

assert.equal(show.segments.length, 8, 'a synthesized show is eight segments');
assert.equal(show.hosts.length, 2, 'two hosts');
assert.equal(show.callers.length, 1, 'one caller patched into the broadcast');
assert.ok(show.showNotes.length >= 4, 'show notes are written');
assert.ok(show.keyTakeaways.length >= 3, 'takeaways are written');
assert.ok(show.segments.every((s) => s.text.trim().length > 0), 'no empty dialogue lines');
assert.ok(show.segments.every((s) => s.durationMs > 0 && s.timestampMs >= 0), 'every line is timed');
assert.ok(show.segments[0].text.includes(topic), 'the topic reaches the cold open');
assert.ok(show.durationMs > 60000, 'a full episode runs over a minute');
assert.ok(!/Firestorm Over|Great Software Rewrite|Spec Prompters/i.test(show.title), 'no leftover demo headline');
assert.ok(show.title.length <= 64, 'episode title stays on a radio slate');
assert.ok(!show.title.includes(topic), 'title is minted from the topic, not the whole prompt');
assert.equal(
  topicCore('The Great Software Rewrite: Are Devs Just Spec Prompters Now?'),
  'Great Software Rewrite Devs Spec Prompters',
);
assert.ok(mintEpisodeTitle(topic, 'station-algorithmic-wire', () => 0).startsWith('Wire Desk:'), 'Algorithmic Wire titles use the station lens');
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

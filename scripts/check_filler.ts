import { synthesizeShow } from '../src/lib/localShow';

const show = synthesizeShow({
  topic: 'Rising seas, rising stakes: what increasing sea-levels mean to humanity',
  tone: 'unfiltered-debate',
  stationId: 'station-algorithmic-wire',
  ungated: false,
  host1: 'Devon Cross',
  host2: 'Dr. Maya Lin',
  facts: ['The sea level has risen about 21 centimetres since 1880, according to NOAA.'],
  sourceUrl: 'https://example.org/story',
  sourceName: 'example.org',
  band: 'world',
  live: true,
});

const endings = new Map<string, number>();
for (const seg of show.segments) {
  const tail = seg.text.split('. ').slice(-1)[0].trim();
  endings.set(tail, (endings.get(tail) || 0) + 1);
}
const sorted = [...endings.entries()].sort((a, b) => b[1] - a[1]);
console.log('segments:', show.segments.length, '| minutes:', (show.durationMs / 60000).toFixed(1));
console.log('most repeated closing sentences:');
for (const [tail, n] of sorted.slice(0, 5)) console.log(`  x${n}  ${tail.slice(0, 90)}`);
console.log('distinct endings:', endings.size, 'of', show.segments.length);

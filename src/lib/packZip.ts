/**
 * Minimal store-only ZIP writer.
 *
 * The episode pack has to be downloadable from a static host with no build-time dependency and no
 * server round trip, so this writes the archive directly: local file headers, the central directory,
 * and the end-of-central-directory record, with CRC-32 per entry. Store method (no compression) is
 * deliberate — the payload is text the listener may open anywhere.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { RadioShow } from '../types';

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path inside the archive. */
  name: string;
  /** UTF-8 text or raw bytes. */
  data: string | Uint8Array;
}

const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value);

function dosDateTime(date: Date): { time: number; date: number } {
  const time = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() / 2)) & 0xffff;
  const day = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  return { time, date: day };
}

/** Build a store-only ZIP archive from the given entries. */
export function buildZip(entries: ZipEntry[], now: Date = new Date()): Blob {
  const { time, date } = dosDateTime(now);
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = utf8(entry.name);
    const dataBytes = typeof entry.data === 'string' ? utf8(entry.data) : entry.data;
    const checksum = crc32(dataBytes);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);      // local file header
    lv.setUint16(4, 20, true);              // version needed
    lv.setUint16(6, 0x0800, true);          // UTF-8 filenames
    lv.setUint16(8, 0, true);               // store
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, checksum, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);

    chunks.push(local, dataBytes);

    const entryRecord = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entryRecord.buffer);
    cv.setUint32(0, 0x02014b50, true);      // central directory header
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    entryRecord.set(nameBytes, 46);
    central.push(entryRecord);

    offset += local.length + dataBytes.length;
  });

  const centralSize = central.reduce((acc, part) => acc + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);        // end of central directory
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  // One contiguous archive: Blob accepts Uint8Array<ArrayBuffer> without a cast this way.
  const parts = [...chunks, ...central, end];
  const archive = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  parts.forEach((part) => {
    archive.set(part, cursor);
    cursor += part.length;
  });

  return new Blob([archive], { type: 'application/zip' });
}

const mmss = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** The three text artefacts of a show, plus a README that says exactly what the pack is. */
export function episodePackFiles(show: RadioShow): ZipEntry[] {
  const slug = show.title
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'episode';

  const transcript = [
    `${show.title}`,
    `Episode #${show.episodeNumber} · ${show.stationId} · ${mmss(show.durationMs)} · ${show.ungated ? 'UNGATED' : 'standard'}`,
    `Produced ${show.createdAt}`,
    '',
    show.segments.map((s) => `[${mmss(s.timestampMs)}] ${s.speakerName}: ${s.text}`).join('\n\n'),
    '',
  ].join('\n');

  const script = [
    `PRODUCTION SCRIPT — ${show.title}`,
    `Hosts: ${show.hosts.map((h) => `${h.name} (${h.title})`).join(', ')}`,
    `Duration target: ${mmss(show.durationMs)}`,
    '',
    ...show.segments.map((s, i) => [
      `### ${i + 1}. ${s.topicTag || `Segment ${i + 1}`}${s.emotion ? ` — ${s.emotion}` : ''}`,
      `${s.speakerName}: ${s.text}`,
      '',
    ].join('\n')),
  ].join('\n');

  const readme = [
    `${show.title} — episode pack`,
    '',
    'Files:',
    '  show_notes.json — the full episode record (hosts, segments, notes, takeaways, callers)',
    '  transcript.txt  — timecoded dialogue',
    `  script.txt      — production script (speaker, segment tag, emotion)`,
    '',
    'About the audio: this build voices the show live in your browser (Web Speech API), so the pack',
    'carries the script, transcript and notes rather than a media file. The Studio Desk build renders',
    'MP3 packs (VoiceStudio / Edge / Gemini engines) and serves them from /api/shows/<id>/download.',
    '',
    `Rendered from ${show.references.map((r) => r.url).join(', ')}`,
    '',
  ].join('\n');

  return [
    { name: `${slug}/show_notes.json`, data: JSON.stringify(show, null, 2) },
    { name: `${slug}/transcript.txt`, data: transcript },
    { name: `${slug}/script.txt`, data: script },
    { name: `${slug}/README.txt`, data: readme },
  ];
}

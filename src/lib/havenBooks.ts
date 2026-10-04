/**
 * Eternal Haven on the talk-radio desk.
 * Chapters are read from the same story files as chatagent.ca/books.
 * Film ids are only the ExcavationPro recordings already on those pages.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { SPEAKERS } from '../data';
import { RadioShow, ScriptSegment } from '../types';
import { speakable } from './speakable';

export const HAVEN_STATION = 'station-eternal-haven';

export interface HavenBook {
  slug: string;
  title: string;
  volume: string;
}

export const HAVEN_BOOKS: HavenBook[] = [
  { slug: 'book-1', title: 'The Moonlit Slumber', volume: 'Book I' },
  { slug: 'book-2', title: 'The Shattered Accord', volume: 'Book II' },
  { slug: 'book-3', title: 'The Ascension War', volume: 'Book III' },
  { slug: 'book-4', title: 'Eternal Haven Dawns', volume: 'Book IV' },
];

export interface HavenChapter {
  id: string;
  label: string;
  title: string;
  paragraphs: string[];
}

interface HavenStory {
  id: string;
  title: string;
  chapters: HavenChapter[];
}

const FILMS: Record<string, Record<string, [string, string]>> = {
  'moonlit-slumber': {
    c0: ['A3lxB1p-ZEc', 'This chapter on film'],
    c1: ['hs2oNUxqk0Q', 'This chapter on film'],
    c2: ['-nlKb4PouwE', 'This chapter on film'],
    c3: ['muVEgQ7DUs4', 'This chapter on film'],
    c4: ['dbqzL8OB_bM', 'This chapter on film'],
    c5: ['giVYclNkw0g', 'This chapter on film'],
    c6: ['tcZfL9VVmNY', 'This chapter on film'],
    c7: ['ZGNNs7C_ZoI', 'This chapter on film'],
    c8: ['amWGcz-QmTg', 'This chapter on film'],
    c9: ['8Inj2N5_3lY', 'This chapter on film'],
    c10: ['VDWDlGVLsP0', 'This chapter on film'],
    c11: ['8fCpVkmqxGU', 'This chapter on film'],
    c12: ['MRbXUm5QLSs', 'This chapter on film'],
    c13: ['s6wpn3bVNZ4', 'This chapter on film'],
    c14: ['A7PRdxfbY0k', 'This chapter on film'],
    c15: ['Dfce5gp5-YE', 'This chapter on film'],
  },
  'shattered-accord': {
    c0: ['8wbN0KK9Jz4', 'This chapter on film'],
    c1: ['5155E8BPbeA', 'This chapter on film'],
    c2: ['FGmDeClTF74', 'This chapter on film'],
    c4: ['2UXLKfKcS7g', 'This chapter on film'],
    '*': ['EC8GRmLG3Us', 'Full Book II film'],
  },
  'ascension-war': {
    c1: ['kDI91J3QYtc', 'Prologue on film'],
  },
};

const stories = new Map<string, HavenStory>();
let cursor: { book: number; chapter: number } | null = null;

export function filmFor(storyId: string, chapterId: string): { id: string; label: string } | null {
  const book = FILMS[storyId];
  if (!book) return null;
  const hit = book[chapterId] || book['*'];
  if (!hit) return null;
  return { id: hit[0], label: hit[1] };
}

export async function loadHavenStory(slug: string): Promise<HavenStory> {
  const cached = stories.get(slug);
  if (cached) return cached;
  const response = await fetch(`/books/${slug}/story.json`);
  if (!response.ok) throw new Error(`story ${slug} ${response.status}`);
  const data = (await response.json()) as HavenStory;
  if (!data?.chapters?.length) throw new Error(`story ${slug} has no chapters`);
  stories.set(slug, data);
  return data;
}

function msFor(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(4200, Math.round(words * 460));
}

export async function loadHavenShow(bookIndex: number, chapterIndex: number): Promise<RadioShow> {
  const book = HAVEN_BOOKS[bookIndex] || HAVEN_BOOKS[0];
  const story = await loadHavenStory(book.slug);
  const chapter = story.chapters[Math.max(0, Math.min(chapterIndex, story.chapters.length - 1))];
  const host = SPEAKERS.liora;
  const spoken = (chapter.paragraphs || [])
    .map((paragraph) => speakable(paragraph))
    .filter((paragraph) => paragraph.length > 1);
  const intro = speakable(
    `${book.volume}. ${chapter.label ? chapter.label + '. ' : ''}${chapter.title}. From ${book.title}, by Justin Helmer.`,
  );
  const lines = [intro, ...spoken];
  if (lines.length === 1) {
    lines.push('This chapter is on the shelf. Open the book if the page is still quiet.');
  }
  let clock = 0;
  const segments: ScriptSegment[] = lines.map((text, index) => {
    const durationMs = msFor(text);
    const segment: ScriptSegment = {
      id: `haven-${book.slug}-${chapter.id}-${index}`,
      speakerId: host.id,
      speakerName: host.name,
      text,
      timestampMs: clock,
      durationMs,
      emotion: index === 0 ? 'intrigued' : 'neutral',
      topicTag: `${book.volume} · ${chapter.title}`,
    };
    clock += durationMs;
    return segment;
  });
  const film = filmFor(story.id, chapter.id);
  cursor = {
    book: HAVEN_BOOKS.findIndex((item) => item.slug === book.slug),
    chapter: story.chapters.findIndex((item) => item.id === chapter.id),
  };
  return {
    id: `haven-${book.slug}-${chapter.id}`,
    stationId: HAVEN_STATION,
    topic: `${book.title} — ${chapter.title}`,
    title: `${book.volume}: ${chapter.title}`,
    episodeNumber: cursor.chapter + 1,
    description: `${host.name} reads ${chapter.title} from ${book.title}.`,
    durationMs: clock,
    hosts: [host],
    segments,
    showNotes: [
      `${book.volume} · ${chapter.label || 'Chapter'} · ${chapter.title}`,
      'Read aloud on this desk, or open the walking novel.',
      film ? `${film.label}.` : 'No ExcavationPro film is attached to this chapter.',
    ],
    keyTakeaways: [
      `Author: Justin Helmer.`,
      `Series: The Eternal Haven Chronicles.`,
    ],
    references: [
      {
        title: `Open ${book.title} on the shelf`,
        url: `https://chatagent.ca/books/${book.slug}/#${chapter.id}`,
        type: 'news',
      },
      ...(film
        ? [{ title: film.label, url: `https://youtu.be/${film.id}`, type: 'news' as const }]
        : []),
    ],
    callers: [],
    ungated: false,
    createdAt: new Date().toISOString(),
  };
}

export async function advanceHavenReading(): Promise<RadioShow | null> {
  if (!cursor) return loadHavenShow(0, 0);
  const book = HAVEN_BOOKS[cursor.book];
  if (!book) return null;
  const story = await loadHavenStory(book.slug);
  let bookIndex = cursor.book;
  let chapterIndex = cursor.chapter + 1;
  if (chapterIndex >= story.chapters.length) {
    bookIndex += 1;
    chapterIndex = 0;
  }
  if (bookIndex >= HAVEN_BOOKS.length) return null;
  return loadHavenShow(bookIndex, chapterIndex);
}

export function havenWelcomeShow(): RadioShow {
  const host = SPEAKERS.liora;
  const lines = [
    'This is Eternal Haven. I am Liora Hale, and this desk reads the Eternal Haven Chronicles by Justin Helmer.',
    'The Moonlit Slumber, The Shattered Accord, The Ascension War, and Eternal Haven Dawns are on the shelf under the picture. Choose a chapter and I will read it.',
    'Where ExcavationPro filmed a chapter, you can play that film on this show. Credit Excavationpro when you use the music.',
  ];
  let clock = 0;
  const segments: ScriptSegment[] = lines.map((text, index) => {
    const durationMs = msFor(text);
    const segment: ScriptSegment = {
      id: `haven-welcome-${index}`,
      speakerId: host.id,
      speakerName: host.name,
      text,
      timestampMs: clock,
      durationMs,
      emotion: 'intrigued',
      topicTag: 'Eternal Haven',
    };
    clock += durationMs;
    return segment;
  });
  return {
    id: 'show-eternal-haven',
    stationId: HAVEN_STATION,
    title: 'Eternal Haven — On Air',
    episodeNumber: 1,
    description: 'Liora Hale reads the Eternal Haven Chronicles, chapter by chapter.',
    durationMs: clock,
    hosts: [host],
    segments,
    showNotes: [
      'Optional show on the talk-radio desk.',
      'Four walking novels, read aloud in a female natural voice.',
      'Chapter films play when ExcavationPro published one.',
    ],
    keyTakeaways: [
      'Author: Justin Helmer.',
      'Start at moonlight.',
    ],
    references: [
      { title: 'Eternal Haven shelf', url: 'https://chatagent.ca/books/', type: 'news' },
    ],
    callers: [],
    ungated: false,
    createdAt: '2026-10-04T00:00:00Z',
  };
}

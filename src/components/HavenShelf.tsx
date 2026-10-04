/**
 * Chapter shelf for the Eternal Haven show.
 * Read speaks the chapter. Play opens the ExcavationPro film and stops the voice.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { RadioShow } from '../types';
import { audioEngine } from '../lib/audioEngine';
import {
  HAVEN_BOOKS,
  HavenChapter,
  filmFor,
  loadHavenShow,
  loadHavenStory,
} from '../lib/havenBooks';

interface HavenShelfProps {
  onRead: (show: RadioShow) => void;
}

export const HavenShelf: React.FC<HavenShelfProps> = ({ onRead }) => {
  const [bookIndex, setBookIndex] = useState(0);
  const [chapters, setChapters] = useState<HavenChapter[]>([]);
  const [storyId, setStoryId] = useState('');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [status, setStatus] = useState('Opening the shelf…');
  const [busy, setBusy] = useState(false);
  const [filmId, setFilmId] = useState('');

  useEffect(() => {
    let gone = false;
    const book = HAVEN_BOOKS[bookIndex];
    setStatus(`Opening ${book.title}…`);
    loadHavenStory(book.slug)
      .then((story) => {
        if (gone) return;
        setStoryId(story.id);
        setChapters(story.chapters);
        setChapterIndex(0);
        setStatus(`${story.chapters.length} chapters`);
      })
      .catch(() => {
        if (gone) return;
        setChapters([]);
        setStoryId('');
        setStatus('The shelf did not open. The books live at chatagent.ca/books.');
      });
    return () => {
      gone = true;
    };
  }, [bookIndex]);

  const chapter = chapters[chapterIndex];
  const film = storyId && chapter ? filmFor(storyId, chapter.id) : null;

  const readChapter = async () => {
    if (busy) return;
    setBusy(true);
    setFilmId('');
    try {
      const show = await loadHavenShow(bookIndex, chapterIndex);
      onRead(show);
      setStatus(`Reading ${show.title}`);
    } catch {
      setStatus('This chapter did not load.');
    } finally {
      setBusy(false);
    }
  };

  const playFilm = () => {
    if (!film) return;
    audioEngine.stop();
    setFilmId(film.id);
    setStatus(film.label);
  };

  return (
    <section className="rounded-xl border border-[#e0b36a]/40 bg-[#141018] p-4 shadow-lg" aria-label="Eternal Haven shelf">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#e0b36a]">Eternal Haven shelf</h2>
          <p className="mt-1 text-xs text-slate-400">Read a chapter on this desk, or play the film when one exists.</p>
        </div>
        <a
          href="https://chatagent.ca/books/"
          className="text-xs text-[#e0b36a] underline underline-offset-4"
        >
          Open the walking novels
        </a>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {HAVEN_BOOKS.map((book, index) => (
          <button
            key={book.slug}
            type="button"
            onClick={() => {
              setFilmId('');
              setBookIndex(index);
            }}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs ${
              index === bookIndex
                ? 'bg-[#e0b36a] font-bold text-[#1a140c]'
                : 'border border-slate-700 text-slate-300 hover:border-[#e0b36a]/60'
            }`}
          >
            {book.volume}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="haven-chapter">Chapter</label>
        <select
          id="haven-chapter"
          value={chapter ? chapter.id : ''}
          onChange={(event) => {
            const index = chapters.findIndex((item) => item.id === event.target.value);
            setFilmId('');
            if (index >= 0) setChapterIndex(index);
          }}
          className="min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        >
          {chapters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label ? `${item.label}: ` : ''}{item.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void readChapter()}
          disabled={!chapter || busy}
          className="cursor-pointer rounded-lg bg-[#e0b36a] px-3 py-2 text-xs font-bold text-[#1a140c] disabled:cursor-wait disabled:opacity-60"
        >
          Read chapter
        </button>
        {film && (
          <button
            type="button"
            onClick={playFilm}
            className="cursor-pointer rounded-lg border border-[#e0b36a]/70 px-3 py-2 text-xs font-bold text-[#e0b36a]"
          >
            Play film
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{status}</p>

      {filmId && (
        <div className="mt-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-[#e0b36a]/30 bg-black">
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${filmId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title="Eternal Haven chapter film"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
};

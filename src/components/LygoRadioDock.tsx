/**
 * LYGO RADIO dock — the listen portal's mini player.
 *
 * Ported from signal/radio-mini.js so the studio plays the same catalogue with the same controls:
 * shuffle bag on Next, mute as volume (never as pause), level remembered across sessions, and the
 * catalogue fetched live from the Signal pages (falling through three sources).
 *
 * One addition for this host: the studio writes its own show with speech synthesis, so the dock
 * yields the speakers whenever that voice is on air instead of talking over it.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LYGO, studioVoiceOnAir } from '../lib/lygoBrand';

interface Track {
  title: string;
  url: string;
}

const SAVE_KEY = 'lygo_signal_radio';

const normTrack = (t: any): Track | null => {
  const url = t?.stream_url || t?.url;
  if (!url) return null;
  return { title: t.title || t.name || 'Untitled', url };
};

export const LygoRadioDock: React.FC<{ className?: string }> = ({ className = '' }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bagRef = useRef<number[]>([]);
  const wantPlay = useRef(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(0.55);
  const [catalogue, setCatalogue] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [yielded, setYielded] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // level and mute survive reloads, as on the Signal pages
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (typeof saved.vol === 'number') setVol(Math.max(0, Math.min(1, saved.vol)));
      if (saved.muted) setMuted(true);
    } catch { /* first visit */ }
  }, []);

  const save = (nextVol: number, nextMuted: boolean) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ vol: nextVol, muted: nextMuted })); } catch { /* private mode */ }
  };

  const refill = useCallback((list: Track[]) => {
    const bag = list.map((_, i) => i);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    bagRef.current = bag;
  }, []);

  // catalogue: the Signal pages' own radio.json first, then the two streaming mirrors
  useEffect(() => {
    let live = true;
    (async () => {
      const collected: Track[] = [];
      for (const url of LYGO.playlists) {
        try {
          const r = await fetch(url, { mode: 'cors', cache: 'no-cache' });
          if (!r.ok) throw new Error(String(r.status));
          const data = await r.json();
          const raw = Array.isArray(data) ? data : data?.tracks || [];
          raw.forEach((t: any) => { const n = normTrack(t); if (n) collected.push(n); });
          if (collected.length > 40) break;
        } catch { /* next source */ }
      }
      if (!live) return;
      if (collected.length) {
        setTracks(collected);
        refill(collected);
        setCatalogue('ready');
      } else {
        setCatalogue('unavailable');
      }
    })();
    return () => { live = false; };
  }, [refill]);

  const load = useCallback((i: number) => {
    setIndex((prev) => {
      const next = i;
      const audio = audioRef.current;
      const track = tracks[next];
      if (audio && track) {
        if (audio.src !== track.url) audio.src = track.url;
        audio.volume = vol;
        audio.muted = muted;
      }
      return next;
    });
  }, [tracks, vol, muted]);

  const next = useCallback(() => {
    if (!tracks.length) return;
    if (!bagRef.current.length) refill(tracks);
    const i = bagRef.current.pop();
    load(i == null ? Math.floor(Math.random() * tracks.length) : i);
    if (audioRef.current && wantPlay.current) audioRef.current.play().catch(() => {});
  }, [tracks, load, refill]);

  const play = useCallback(() => {
    wantPlay.current = true;
    const audio = audioRef.current;
    if (!audio || !tracks.length) return;
    if (!audio.src) { next(); return; }
    audio.play().then(() => setPlaying(true)).catch((err: any) => {
      // A blocked play() is not a bad track: keep it queued so the next real click starts it.
      if (err?.name === 'NotAllowedError') { setBlocked(true); return; }
      next();
    });
  }, [tracks, next]);

  const pause = useCallback(() => {
    wantPlay.current = false;
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  // audio element events drive the bag forward, exactly like the portal player
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { if (wantPlay.current) next(); };
    const onError = () => { if (wantPlay.current) next(); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [next]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) { audio.volume = vol; audio.muted = muted; }
  }, [vol, muted]);

  // yield the speakers to the studio's own broadcast voice, then come back
  useEffect(() => {
    const id = window.setInterval(() => {
      if (studioVoiceOnAir()) {
        const audio = audioRef.current;
        if (audio && !audio.paused) { audio.pause(); setYielded(true); }
      } else if (yielded && wantPlay.current) {
        setYielded(false);
        audioRef.current?.play().catch(() => {});
      }
    }, 900);
    return () => window.clearInterval(id);
  }, [yielded]);

  const track = tracks[index];

  return (
    <div className={`rounded-lg border border-slate-800/80 bg-[#0d1119] px-4 py-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <img src="/brand/lygo-radio-logo.svg" alt="LYGO Radio" width={128} height={36} className="h-9 w-auto opacity-95" />
          <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Music stream</span>
        </div>

        <audio ref={audioRef} preload="none" />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (playing ? pause() : play())}
            disabled={catalogue !== 'ready'}
            className="px-4 py-1.5 rounded-md bg-amber-500 text-[#1a1408] text-xs font-semibold hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => { wantPlay.current = playing; next(); }}
            disabled={catalogue !== 'ready'}
            className="px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300 hover:border-teal-400/60 hover:text-teal-200 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => { const m = !muted; setMuted(m); save(vol, m); }}
            className="px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <label className="flex items-center gap-2 text-[11px] text-slate-400" title="LYGO Radio volume">
            <span>Vol</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(vol * 100)}
              onChange={(e) => { const v = Number(e.target.value) / 100; setVol(v); save(v, v > 0 ? false : muted); if (v > 0 && muted) setMuted(false); }}
              className="w-24 accent-amber-400 cursor-pointer"
              aria-label="LYGO Radio volume"
            />
          </label>
        </div>

        <div className="flex-1 min-w-[10rem] text-xs text-slate-300 truncate font-mono">
          {catalogue === 'loading' && 'Tuning the LYGO Radio catalogue…'}
          {catalogue === 'unavailable' && (
            <span className="text-slate-400">
              Catalogue unreachable from here — <a className="text-teal-300 hover:text-teal-200 underline" href={LYGO.radioPage} target="_blank" rel="noopener noreferrer">open the full LYGO Radio page</a>
            </span>
          )}
          {catalogue === 'ready' && track && (
            <>
              <span className="text-amber-400 mr-1">{playing ? '▶' : yielded ? '⏸' : '❚❚'}</span>
              {track.title}
            </>
          )}
        </div>

        <a href={LYGO.tv} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-teal-300 hover:text-teal-200">
          LYGO TV →
        </a>
        <a href={LYGO.radioPage} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-slate-200">
          {catalogue === 'ready' ? `${tracks.length} tracks` : 'Full catalogue'}
        </a>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {blocked
          ? 'Press Play to start LYGO RADIO — this browser waits for a click before it plays audio.'
          : yielded
          ? 'Paused — the studio voice is on air. LYGO RADIO resumes when the episode does.'
          : <>Music: Excavationpro · <a className="text-slate-400 hover:text-teal-300" href={LYGO.music.hub} target="_blank" rel="noopener noreferrer">listen hub</a> · <a className="text-slate-400 hover:text-teal-300" href={LYGO.music.streaming} target="_blank" rel="noopener noreferrer">streaming links</a> · played from the same catalogue the LYGO Signal arcade rooms use.</>}
      </p>
    </div>
  );
};

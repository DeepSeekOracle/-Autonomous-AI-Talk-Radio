/**
 * Live news desk for the hour already on the player.
 * Portraits are stills; the open-mouth frame only shows through a small mask while that host has the mic.
 * The spoken line, clock, and lower third are HTML so they follow the script.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { RadioShow, RadioStation } from '../types';
import studio from '../assets/tv/studio.jpg';
import devon from '../assets/tv/devon.jpg';
import devonTalk from '../assets/tv/devon-talk.jpg';
import maya from '../assets/tv/maya.jpg';
import mayaTalk from '../assets/tv/maya-talk.jpg';
import zack from '../assets/tv/zack.jpg';
import zackTalk from '../assets/tv/zack-talk.jpg';
import aris from '../assets/tv/aris.jpg';
import arisTalk from '../assets/tv/aris-talk.jpg';
import casey from '../assets/tv/casey.jpg';
import caseyTalk from '../assets/tv/casey-talk.jpg';
import victoria from '../assets/tv/victoria.jpg';
import victoriaTalk from '../assets/tv/victoria-talk.jpg';

interface NewsDeskProps {
  show: RadioShow;
  station: RadioStation;
  activeSegmentIndex: number;
  isPlaying: boolean;
  elapsedMs: number;
  onSeekSegment: (index: number) => void;
}

/** Mouth center on the source still, as a percentage of the frame. */
const HOSTS: Record<string, { still: string; talk: string; mx: string; my: string }> = {
  devon: { still: devon, talk: devonTalk, mx: '48%', my: '57%' },
  maya: { still: maya, talk: mayaTalk, mx: '54%', my: '44%' },
  zack: { still: zack, talk: zackTalk, mx: '52%', my: '45%' },
  aris: { still: aris, talk: arisTalk, mx: '52%', my: '51%' },
  casey: { still: casey, talk: caseyTalk, mx: '56%', my: '41%' },
  victoria: { still: victoria, talk: victoriaTalk, mx: '60%', my: '39%' }
};

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function nextLine(show: RadioShow, speakerId: string, fromIndex: number): number {
  const after = show.segments.findIndex((segment, index) => index > fromIndex && segment.speakerId === speakerId);
  if (after >= 0) return after;
  return show.segments.findIndex((segment) => segment.speakerId === speakerId);
}

export const NewsDesk: React.FC<NewsDeskProps> = ({
  show,
  station,
  activeSegmentIndex,
  isPlaying,
  elapsedMs,
  onSeekSegment
}) => {
  const segment = show.segments[activeSegmentIndex] || show.segments[0];
  const speakerId = segment?.speakerId || '';
  const hosts = station.hosts.filter((host) => HOSTS[host.id]);
  const callerOn = Boolean(segment) && !hosts.some((host) => host.id === speakerId);
  const line = isPlaying && segment?.text
    ? segment.text
    : 'The desk is standing by. Press play and this hour reads on the set.';

  return (
    <section
      aria-label="Live news desk"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl min-h-[36rem] md:min-h-0 md:aspect-video"
    >
      <img src={studio} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="tv-vignette pointer-events-none absolute inset-0" />
      <div className="tv-scan pointer-events-none absolute inset-0" />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 py-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
              isPlaying ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-white animate-on-air' : 'bg-slate-500'}`} />
            {isPlaying ? 'Live' : 'Standby'}
          </span>
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-white/90">
            {station.name}
          </span>
          <span className="hidden font-mono text-[11px] text-white/70 sm:inline">{station.frequency}</span>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-white/90">{clock(elapsedMs)}</span>
      </div>

      {!isPlaying && (
        <div className="absolute left-1/2 top-14 z-30 w-[min(28rem,88%)] -translate-x-1/2">
          <div className="rounded-2xl border border-white/15 bg-slate-950/80 px-3 py-2 text-center text-[13px] leading-snug text-slate-200 shadow-xl backdrop-blur-sm">
            {line}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-16 z-10 flex items-end justify-center gap-3 px-3 md:bottom-[4.75rem] md:justify-between md:px-12">
        {hosts.map((host) => {
          const art = HOSTS[host.id];
          const talking = isPlaying && speakerId === host.id;
          return (
            <div key={host.id} className="flex w-[44%] max-w-[11.5rem] flex-col items-stretch md:max-w-[12.5rem] xl:max-w-[16rem]">
              {talking && (
                <div
                  key={activeSegmentIndex}
                  className="tv-bubble mb-2 max-h-36 overflow-y-auto rounded-2xl rounded-bl-sm border border-white/15 bg-slate-950/88 px-3 py-2 text-[13px] leading-snug text-slate-100 shadow-xl backdrop-blur-sm"
                >
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: station.accentColor }}>
                    {segment?.speakerName || host.name}
                  </div>
                  {line}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  const index = nextLine(show, host.id, activeSegmentIndex);
                  if (index >= 0) onSeekSegment(index);
                }}
                className="group cursor-pointer text-left"
                aria-label={`Jump to the next line from ${host.name}`}
              >
                <div className={talking ? 'tv-talk' : undefined}>
                  <div
                    className="relative overflow-hidden rounded-lg bg-slate-900 ring-2 ring-white/15"
                    style={talking ? { boxShadow: `0 0 0 2px ${station.accentColor}, 0 12px 40px ${station.accentColor}55` } : undefined}
                  >
                    <img src={art.still} alt="" className="block w-full" />
                    {talking && (
                      <img
                        src={art.talk}
                        alt=""
                        className="tv-mouth"
                        style={{ ['--mx' as string]: art.mx, ['--my' as string]: art.my }}
                      />
                    )}
                    {talking && (
                      <span className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Mic
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 rounded bg-slate-950/80 px-2 py-1">
                    <div className="truncate text-xs font-semibold text-white">{host.name}</div>
                    <div className="truncate text-[10px] uppercase tracking-wide text-slate-400">{host.title}</div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {callerOn && (
        <div className="absolute left-1/2 top-14 z-30 w-[min(22rem,86%)] -translate-x-1/2">
          <div key={activeSegmentIndex} className="tv-bubble rounded-2xl border border-white/15 bg-slate-950/90 px-3 py-2 text-[13px] leading-snug text-slate-100 shadow-xl backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-300">
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="tv-ring absolute inset-0 rounded-full border border-red-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              </span>
              Line 1
            </div>
            <div className="mb-1 text-xs font-semibold text-white">{segment?.speakerName || 'Caller'}</div>
            <div className="max-h-28 overflow-y-auto">{line}</div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="h-1" style={{ background: station.accentColor }} />
        <div className="flex items-stretch bg-slate-950/92 backdrop-blur-sm">
          <div className="flex items-center px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-950 md:px-4" style={{ background: station.accentColor }}>
            {station.frequency}
          </div>
          <div className="min-w-0 flex-1 px-3 py-2">
            <div className="truncate text-sm font-semibold text-white">{show.title}</div>
            <div className="truncate text-[11px] uppercase tracking-wider text-slate-400">
              {segment?.topicTag || station.genre}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

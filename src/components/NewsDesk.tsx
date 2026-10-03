/**
 * Live news desk for the hour already on the player.
 * Mouth, blink, and glance frames are pasted onto the closed still, then masked
 * so only the lips or the eyes change.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { RadioShow, RadioStation } from '../types';
import studio from '../assets/tv/studio.jpg';
import devon from '../assets/tv/devon.jpg';
import devonTalk from '../assets/tv/devon-talk.jpg';
import devonMid from '../assets/tv/devon-mid.jpg';
import devonGlance from '../assets/tv/devon-glance.jpg';
import devonBlink from '../assets/tv/devon-blink.jpg';
import devonExpress from '../assets/tv/devon-express.jpg';
import maya from '../assets/tv/maya.jpg';
import mayaTalk from '../assets/tv/maya-talk.jpg';
import mayaMid from '../assets/tv/maya-mid.jpg';
import mayaGlance from '../assets/tv/maya-glance.jpg';
import mayaBlink from '../assets/tv/maya-blink.jpg';
import mayaExpress from '../assets/tv/maya-express.jpg';
import zack from '../assets/tv/zack.jpg';
import zackTalk from '../assets/tv/zack-talk.jpg';
import zackMid from '../assets/tv/zack-mid.jpg';
import zackGlance from '../assets/tv/zack-glance.jpg';
import zackBlink from '../assets/tv/zack-blink.jpg';
import zackExpress from '../assets/tv/zack-express.jpg';
import aris from '../assets/tv/aris.jpg';
import arisTalk from '../assets/tv/aris-talk.jpg';
import arisMid from '../assets/tv/aris-mid.jpg';
import arisGlance from '../assets/tv/aris-glance.jpg';
import arisBlink from '../assets/tv/aris-blink.jpg';
import arisExpress from '../assets/tv/aris-express.jpg';
import casey from '../assets/tv/casey.jpg';
import caseyTalk from '../assets/tv/casey-talk.jpg';
import caseyMid from '../assets/tv/casey-mid.jpg';
import caseyGlance from '../assets/tv/casey-glance.jpg';
import caseyBlink from '../assets/tv/casey-blink.jpg';
import victoria from '../assets/tv/victoria.jpg';
import victoriaTalk from '../assets/tv/victoria-talk.jpg';
import victoriaMid from '../assets/tv/victoria-mid.jpg';
import victoriaGlance from '../assets/tv/victoria-glance.jpg';
import victoriaBlink from '../assets/tv/victoria-blink.jpg';
import victoriaExpress from '../assets/tv/victoria-express.jpg';

interface NewsDeskProps {
  show: RadioShow;
  station: RadioStation;
  activeSegmentIndex: number;
  isPlaying: boolean;
  elapsedMs: number;
  onSeekSegment: (index: number) => void;
}

interface HostArt {
  still: string;
  mid: string;
  talk: string;
  glance: string;
  blink: string;
  express?: string;
  /** Lip center and eye center, as percentages of the frame. */
  mx: string;
  my: string;
  ex: string;
  ey: string;
  moods: string[];
}

const HOSTS: Record<string, HostArt> = {
  devon: { still: devon, mid: devonMid, talk: devonTalk, glance: devonGlance, blink: devonBlink, express: devonExpress, mx: '55%', my: '48%', ex: '58%', ey: '37%', moods: ['skeptical', 'heated'] },
  maya: { still: maya, mid: mayaMid, talk: mayaTalk, glance: mayaGlance, blink: mayaBlink, express: mayaExpress, mx: '62%', my: '44%', ex: '60%', ey: '33%', moods: ['laughing', 'excited', 'intrigued'] },
  zack: { still: zack, mid: zackMid, talk: zackTalk, glance: zackGlance, blink: zackBlink, express: zackExpress, mx: '56%', my: '44%', ex: '53%', ey: '39%', moods: ['laughing', 'excited'] },
  aris: { still: aris, mid: arisMid, talk: arisTalk, glance: arisGlance, blink: arisBlink, express: arisExpress, mx: '52%', my: '50%', ex: '50%', ey: '37%', moods: ['skeptical', 'heated'] },
  casey: { still: casey, mid: caseyMid, talk: caseyTalk, glance: caseyGlance, blink: caseyBlink, mx: '56%', my: '48%', ex: '49%', ey: '38%', moods: [] },
  victoria: { still: victoria, mid: victoriaMid, talk: victoriaTalk, glance: victoriaGlance, blink: victoriaBlink, express: victoriaExpress, mx: '63%', my: '42%', ex: '58%', ey: '33%', moods: ['skeptical', 'heated'] }
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
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!isPlaying) {
      setBeat(0);
      return;
    }
    const id = window.setInterval(() => setBeat((n) => (n + 1) % 16), 130);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  const segment = show.segments[activeSegmentIndex] || show.segments[0];
  const speakerId = segment?.speakerId || '';
  const hosts = station.hosts.filter((host) => HOSTS[host.id]);
  const callerOn = Boolean(segment) && !hosts.some((host) => host.id === speakerId);
  const line = isPlaying && segment?.text
    ? segment.text
    : 'The desk is standing by. Press play and this hour reads on the set.';
  const emotion = segment?.emotion || '';

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
          const phase = beat % 4;
          const mouthSrc = talking ? (phase === 2 ? art.talk : phase === 0 ? null : art.mid) : null;
          const blinkNow = isPlaying && beat % 16 === 3;
          const glanceNow = isPlaying && (talking ? beat % 16 === 8 : beat % 16 === 12);
          const eyeSrc = blinkNow ? art.blink : glanceNow || (talking && emotion === 'intrigued') ? art.glance : null;
          const showMood = talking && art.express && art.moods.includes(emotion);
          const mask = {
            ['--mx' as string]: art.mx,
            ['--my' as string]: art.my,
            ['--ex' as string]: art.ex,
            ['--ey' as string]: art.ey
          };
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
                <div
                  className="relative overflow-hidden rounded-lg bg-slate-900 ring-2 ring-white/15"
                  style={talking ? { boxShadow: `0 0 0 2px ${station.accentColor}, 0 12px 40px ${station.accentColor}55` } : undefined}
                >
                  <img src={showMood ? art.express : art.still} alt="" className="block w-full" />
                  {mouthSrc && <img src={mouthSrc} alt="" className="tv-part tv-mouth" style={mask} />}
                  {eyeSrc && <img src={eyeSrc} alt="" className="tv-part tv-eyes" style={mask} />}
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

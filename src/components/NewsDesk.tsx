/**
 * The hour, seen from across the radio desk.
 * Mouth, blink, and glance frames are pasted onto the closed still, then masked
 * so only the lips or the eyes change.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useState } from 'react';
import { RadioShow, RadioStation } from '../types';
import studio from '../assets/tv/studio.jpg';
import newsroom from '../assets/tv/newsroom.jpg';
import havenStudio from '../assets/tv/haven-studio.jpg';
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
import liora from '../assets/tv/liora.jpg';
import lioraTalk from '../assets/tv/liora-talk.jpg';
import lioraMid from '../assets/tv/liora-mid.jpg';
import lioraGlance from '../assets/tv/liora-glance.jpg';
import lioraBlink from '../assets/tv/liora-blink.jpg';
import lioraExpress from '../assets/tv/liora-express.jpg';

interface NewsDeskProps {
  show: RadioShow;
  station: RadioStation;
  activeSegmentIndex: number;
  isPlaying: boolean;
  elapsedMs: number;
  onSeekSegment: (index: number) => void;
  onOpenHotline: () => void;
  onTuneHaven: () => void;
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
  /** Shift the still up inside the oval. Males sit lower in the frame. */
  lift?: string;
}

const HOSTS: Record<string, HostArt> = {
  devon: { still: devon, mid: devonMid, talk: devonTalk, glance: devonGlance, blink: devonBlink, express: devonExpress, mx: '55%', my: '48%', ex: '58%', ey: '37%', moods: ['skeptical', 'heated'], lift: '-12%' },
  maya: { still: maya, mid: mayaMid, talk: mayaTalk, glance: mayaGlance, blink: mayaBlink, express: mayaExpress, mx: '62%', my: '44%', ex: '60%', ey: '33%', moods: ['laughing', 'excited', 'intrigued'] },
  zack: { still: zack, mid: zackMid, talk: zackTalk, glance: zackGlance, blink: zackBlink, express: zackExpress, mx: '56%', my: '44%', ex: '53%', ey: '39%', moods: ['laughing', 'excited'], lift: '-12%' },
  aris: { still: aris, mid: arisMid, talk: arisTalk, glance: arisGlance, blink: arisBlink, express: arisExpress, mx: '52%', my: '50%', ex: '50%', ey: '37%', moods: ['skeptical', 'heated'] },
  casey: { still: casey, mid: caseyMid, talk: caseyTalk, glance: caseyGlance, blink: caseyBlink, mx: '56%', my: '48%', ex: '49%', ey: '38%', moods: [], lift: '-12%' },
  victoria: { still: victoria, mid: victoriaMid, talk: victoriaTalk, glance: victoriaGlance, blink: victoriaBlink, express: victoriaExpress, mx: '63%', my: '42%', ex: '58%', ey: '33%', moods: ['skeptical', 'heated'] },
  liora: { still: liora, mid: lioraMid, talk: lioraTalk, glance: lioraGlance, blink: lioraBlink, express: lioraExpress, mx: '63%', my: '49%', ex: '58%', ey: '38%', moods: ['intrigued'] }
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
  onSeekSegment,
  onOpenHotline,
  onTuneHaven
}) => {
  const [beat, setBeat] = useState(0);
  const [scene, setScene] = useState<'radio' | 'news' | 'haven'>('radio');
  useEffect(() => {
    if (station.id === 'station-eternal-haven') setScene('haven');
    else setScene((current) => (current === 'haven' ? 'radio' : current));
  }, [station.id]);
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
  const reelOn = speakerId === 'signal-reel';
  const callerOn = Boolean(segment) && !reelOn && !hosts.some((host) => host.id === speakerId);
  const line = isPlaying && segment?.text
    ? segment.text
    : 'Pull up a chair. Press play when you want the hour.';
  const emotion = segment?.emotion || '';
  const plate = scene === 'news' ? newsroom : scene === 'haven' ? havenStudio : studio;
  const seats = scene === 'news'
    ? [{ left: '26%', top: '43%' }, { left: '58%', top: '44%' }]
    : scene === 'haven'
      ? [{ left: '24%', top: '42%' }]
      : [{ left: '32.4%', top: '33%' }, { left: '60.5%', top: '31.5%' }];
  const sceneClass = scene === 'news'
    ? 'tv-scene-news border-slate-800/70 bg-[#0c121a]'
    : scene === 'haven'
      ? 'tv-scene-haven border-[#e0b36a]/40 bg-[#100c18]'
      : 'tv-scene-radio border-amber-950/40 bg-[#1a120c]';
  const fadeClass = scene === 'news'
    ? 'from-[#0c121a]/85'
    : scene === 'haven'
      ? 'from-[#100c18]/85'
      : 'from-[#1a120c]/80';

  return (
    <section
      aria-label="The show"
      className={`relative aspect-video overflow-hidden rounded-2xl border shadow-2xl ${sceneClass}`}
    >
      <img src={plate} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="tv-vignette pointer-events-none absolute inset-0 z-[5]" />

      {hosts.map((host, index) => {
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
          ['--ey' as string]: art.ey,
          ['--hx' as string]: art.ex,
          ['--hy' as string]: art.ey
        };
        const seat = { ...(seats[index] || seats[seats.length - 1]) };
        if (scene === 'news' && (host.id === 'maya' || host.id === 'aris')) {
          seat.left = '59.5%';
          seat.top = '40%';
        }
        const frame = {
          objectPosition: `${art.ex} 16%`,
          transform: art.lift ? `translateY(${art.lift})` : undefined
        };
        return (
          <div key={host.id} className={`absolute z-10 ${scene === 'haven' ? 'w-[15%]' : 'w-[12.5%]'}`} style={seat}>
            {talking && (
              <div
                key={activeSegmentIndex}
                className="tv-bubble absolute bottom-[103%] left-1/2 z-30 w-[min(18rem,42vw)] -translate-x-1/2 max-h-28 overflow-y-auto rounded-2xl border border-amber-100/20 bg-[#2a2118]/90 px-3 py-2 text-[13px] leading-snug text-amber-50 shadow-xl backdrop-blur-sm"
              >
                <div className="mb-1 text-[11px] font-medium text-amber-200/90">
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
              className="block w-full cursor-pointer"
              aria-label={`Jump to the next line from ${host.name}`}
            >
              <div className="tv-host relative aspect-[11/20] overflow-hidden" style={mask}>
                <img src={showMood ? art.express : art.still} alt="" className="absolute inset-0 h-full w-full object-cover" style={frame} />
                {mouthSrc && <img src={mouthSrc} alt="" className="tv-part tv-mouth" style={{ ...mask, ...frame }} />}
                {eyeSrc && <img src={eyeSrc} alt="" className="tv-part tv-eyes" style={{ ...mask, ...frame }} />}
              </div>
            </button>
          </div>
        );
      })}

      <div className="tv-desk" style={{ backgroundImage: `url(${plate})` }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-3 py-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-[#2a2118]/70 px-2.5 py-1 backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-amber-300' : 'bg-stone-500'}`} />
          <span className="truncate text-xs text-amber-50">{station.name}</span>
          <span className="hidden text-[11px] text-amber-100/70 sm:inline">{station.frequency}</span>
        </div>
        <span className="rounded-full bg-[#2a2118]/70 px-2.5 py-1 font-mono text-[11px] tabular-nums text-amber-50 backdrop-blur-sm">
          {isPlaying ? 'On the air' : 'Quiet'} · {clock(elapsedMs)}
        </span>
      </div>

      {reelOn && (
        <div className="absolute left-1/2 top-12 z-30 w-[min(22rem,86%)] -translate-x-1/2">
          <div key={activeSegmentIndex} className="tv-bubble rounded-2xl border border-amber-100/20 bg-[#2a2118]/90 px-3 py-2 text-[13px] leading-snug text-amber-50 shadow-xl backdrop-blur-sm">
            <div className="mb-1 text-[11px] font-medium text-amber-200">
              LYGO Signal · {segment?.speakerName || 'Finished hour'}
            </div>
            <div className="max-h-24 overflow-y-auto">{segment?.text || show.title}</div>
          </div>
        </div>
      )}

      {callerOn && (
        <div className="absolute left-1/2 top-12 z-30 w-[min(22rem,86%)] -translate-x-1/2">
          <div key={activeSegmentIndex} className="tv-bubble rounded-2xl border border-amber-100/20 bg-[#2a2118]/90 px-3 py-2 text-[13px] leading-snug text-amber-50 shadow-xl backdrop-blur-sm">
            <div className="mb-1 text-[11px] font-medium text-amber-200">
              Line 1 · {segment?.speakerName || 'Caller'}
            </div>
            <div className="max-h-24 overflow-y-auto">{line}</div>
          </div>
        </div>
      )}

      <div
        role="group"
        aria-label="Scene"
        className="absolute left-3 top-12 z-40 inline-flex overflow-hidden rounded-full border border-white/15 bg-black/55 text-[11px] font-bold shadow-lg backdrop-blur-sm"
      >
        {([
          ['radio', 'Radio show'],
          ['news', 'News room'],
          ['haven', 'Eternal Haven']
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={scene === id}
            onClick={() => {
              setScene(id);
              if (id === 'haven' && station.id !== 'station-eternal-haven') onTuneHaven();
            }}
            className={`cursor-pointer px-3 py-1.5 ${scene === id ? (id === 'news' ? 'bg-sky-200 text-slate-950' : id === 'haven' ? 'bg-[#e0b36a] text-[#1a140c]' : 'bg-amber-200 text-stone-950') : 'text-amber-50/80 hover:text-amber-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenHotline}
        className="absolute bottom-3 right-3 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-lg shadow-red-950/40 hover:bg-red-500"
      >
        <span className="relative flex h-2 w-2">
          <span className="tv-ring absolute inline-flex h-full w-full rounded-full bg-red-200" />
          <span className="relative h-2 w-2 rounded-full bg-slate-950" />
        </span>
        Hot Call
      </button>

      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t to-transparent px-4 pb-3 pr-28 pt-8 ${fadeClass}`}>
        <div className="truncate text-sm text-amber-50 drop-shadow">{isPlaying ? show.title : line}</div>
        <div className="truncate text-[11px] text-amber-100/75">{isPlaying ? (reelOn ? segment?.speakerName : segment?.topicTag || station.genre) : show.title}</div>
      </div>
    </section>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { StationTuner } from './components/StationTuner';
import { LivePlayer } from './components/LivePlayer';
import { Transcript } from './components/Transcript';
import { CallerHotline } from './components/CallerHotline';
import { ShowGenerator } from './components/ShowGenerator';
import { Soundboard } from './components/Soundboard';
import { ShowNotesModal } from './components/ShowNotesModal';
import { LygoFooter } from './components/LygoFooter';
import { DeskModule } from './components/DeskModule';
import { NewsDesk } from './components/NewsDesk';
import { STATIONS, SPEAKERS } from './data';
import { seedCatalog } from './lib/seedShows';
import { RadioStation, RadioShow, AudioSettings, Caller, ScriptSegment } from './types';
import { audioEngine } from './lib/audioEngine';
import { stationLens } from './lib/mintTitles';
import { synthesizeShow } from './lib/localShow';
import { speakable } from './lib/speakable';
import { gatherTopicDeck, nextLiveStory, WITNESS_HOME } from './lib/topicMill';
import { research_topic } from './lib/agentEngine';
import { loadLiveQueue, pickQueuedShow } from './lib/liveQueue';
import { loadSignalCatalog, pickSignalHour } from './lib/signalCatalog';
import { Infinity as InfinityIcon, Radio, Flame, Sparkles, Volume2, Info, Headphones } from 'lucide-react';

const HEARD_KEY = 'talk-radio-heard';

function readHeard(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    const raw = JSON.parse(sessionStorage.getItem(HEARD_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeHeard(used: Set<string>) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(HEARD_KEY, JSON.stringify([...used].slice(-80)));
}

export default function App() {
  const [stations, setStations] = useState<RadioStation[]>(STATIONS);
  const [shows, setShows] = useState<RadioShow[]>(() => seedCatalog());
  const [activeStationId, setActiveStationId] = useState<string>(STATIONS[0].id);
  const [activeShowId, setActiveShowId] = useState<string>(STATIONS[0].currentShowId);
  const [currentTab, setCurrentTab] = useState<'broadcast' | 'stations' | 'hotline' | 'generator' | 'soundboard'>('broadcast');

  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [totalMs, setTotalMs] = useState<number>(0);
  const [showNotesOpen, setShowNotesOpen] = useState<boolean>(false);
  const [frequency, setFrequency] = useState<string>(STATIONS[0].frequency);
  const onAirRef = useRef(false);
  const eternityRef = useRef(false);
  const mintingRef = useRef(false);
  const queueRef = useRef<RadioShow | null>(null);
  const usedTopicsRef = useRef<Set<string>>(readHeard());
  // Held until the hour actually reaches the desk. Stop releases it.
  const reservedRef = useRef<Set<string>>(new Set());
  const wantRecordedRef = useRef(true);
  const mintGateRef = useRef(Promise.resolve());
  const foreverLockRef = useRef(false);
  const [eternity, setEternity] = useState(false);
  const [eternityLabel, setEternityLabel] = useState('next hour writes itself');
  const wheelRef = useRef({
    stations,
    shows,
    activeStationId,
    activeShowId,
  });
  wheelRef.current = { stations, shows, activeStationId, activeShowId };
  const playQueuedOrMintRef = useRef<() => Promise<void>>(async () => {});

  // Audio settings
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85,
    playbackRate: 1.0,
    equalizerPreset: 'broadcast-warmth',
    ungatedMode: false,
    autoScrollTranscript: false
  });

  const activeStation = stations.find(s => s.id === activeStationId) || stations[0];
  const activeShow = shows.find(s => s.id === activeShowId) || shows[0];
  const lens = stationLens(activeStation.id);

  const nextStation = (fromId: string) => {
    const list = wheelRef.current.stations;
    const i = list.findIndex((s) => s.id === fromId);
    return list[(i + 1) % list.length] || list[0];
  };

  const hourKey = (show: { topic?: string; title?: string } | null | undefined) =>
    show?.topic || show?.title || '';

  const blockedTopics = () => new Set([...usedTopicsRef.current, ...reservedRef.current]);

  const holdKey = (key: string) => {
    if (key) reservedRef.current.add(key);
  };

  const airKey = (key: string) => {
    if (!key) return;
    reservedRef.current.delete(key);
    if (usedTopicsRef.current.has(key)) return;
    usedTopicsRef.current.add(key);
    writeHeard(usedTopicsRef.current);
  };

  const releaseKey = (key: string) => {
    if (!key || usedTopicsRef.current.has(key)) return;
    reservedRef.current.delete(key);
  };

  const applyHour = (show: RadioShow) => {
    wantRecordedRef.current = !show.audioUrl;
    airKey(hourKey(show));
    setShows((prev) => [show, ...prev.filter((s) => s.id !== show.id)].slice(0, 48));
    setStations((prev) =>
      prev.map((s) => (s.id === show.stationId ? { ...s, currentShowId: show.id } : s)),
    );
    setActiveStationId(show.stationId);
    const st = wheelRef.current.stations.find((s) => s.id === show.stationId);
    if (st) setFrequency(st.frequency);
    setActiveShowId(show.id);
    setCurrentTab('broadcast');
  };

  const mintEternityHour = (stationId: string): Promise<RadioShow | null> => {
    const prev = mintGateRef.current;
    let open = () => {};
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    mintGateRef.current = prev.then(() => gate);
    return prev.then(() => writeEternityHour(stationId)).finally(open);
  };

  const writeEternityHour = async (stationId: string): Promise<RadioShow | null> => {
    const station = wheelRef.current.stations.find((s) => s.id === stationId) || wheelRef.current.stations[0];
    if (wantRecordedRef.current) {
      const catalog = await loadSignalCatalog().catch(() => []);
      const recorded = pickSignalHour(catalog, blockedTopics(), station);
      if (recorded) {
        holdKey(hourKey(recorded));
        setEternityLabel(`signal · ${recorded.title}`.slice(0, 72));
        return recorded;
      }
    }
    const queuedDoc = await loadLiveQueue().catch(() => null);
    const queued = pickQueuedShow(queuedDoc?.shows || [], blockedTopics(), station.id);
    if (queued) {
      const key = hourKey(queued);
      holdKey(key);
      setEternityLabel(`${queued.stationId.replace('station-', '')} · ${key}`.slice(0, 72));
      return queued;
    }
    const deck = await gatherTopicDeck();
    let heard = usedTopicsRef.current;
    let story = nextLiveStory(deck, station.id, new Set([...heard, ...reservedRef.current]));
    if (!story && heard.size) {
      heard = new Set([...heard].slice(-8));
      story = nextLiveStory(deck, station.id, new Set([...heard, ...reservedRef.current]));
      if (story) usedTopicsRef.current = heard;
    }
    if (!story) {
      setEternityLabel('public feeds are quiet');
      return null;
    }
    holdKey(story.title);
    try {
      const packet = await research_topic(story.title, 'standard').catch(() => undefined);
      setEternityLabel(`${story.band} · ${story.title}`.slice(0, 72));
      const h1 = station.hosts[0];
      const h2 = station.hosts[1] || station.hosts[0];
      return synthesizeShow({
        topic: story.title,
        tone: station.id === 'station-kernel-panic' ? 'ungated' : 'unfiltered-debate',
        stationId: station.id,
        ungated: station.id === 'station-kernel-panic' || settings.ungatedMode,
        host1: h1.name,
        host2: h2.name,
        facts: packet?.sources.map((src) => src.key_quote) || [],
        packet,
        sourceUrl: story.url || '',
        sourceName: story.source,
        band: story.band,
        live: true,
      });
    } catch (err) {
      releaseKey(story.title);
      throw err;
    }
  };

  const prefetchEternity = async () => {
    if (!eternityRef.current || mintingRef.current || queueRef.current) return;
    mintingRef.current = true;
    try {
      const nxt = nextStation(wheelRef.current.activeStationId);
      queueRef.current = await mintEternityHour(nxt.id);
    } finally {
      mintingRef.current = false;
    }
  };

  const playQueuedOrMint = async () => {
    if (!eternityRef.current) {
      if (onAirRef.current) advanceHour();
      return;
    }
    let show = queueRef.current;
    queueRef.current = null;
    if (!show) {
      const nxt = nextStation(wheelRef.current.activeStationId);
      show = await mintEternityHour(nxt.id);
    }
    if (!eternityRef.current) {
      releaseKey(hourKey(show));
      return;
    }
    if (show) {
      applyHour(show);
      void prefetchEternity();
      return;
    }
    setEternityLabel('public feeds are quiet');
    advanceHour();
  };
  playQueuedOrMintRef.current = playQueuedOrMint;

  const advanceHour = () => {
    const snap = wheelRef.current;
    const next = nextStation(snap.activeStationId);
    const nextShow =
      snap.shows.find((s) => s.id === next.currentShowId) ||
      snap.shows.find((s) => s.stationId === next.id) ||
      snap.shows[0];
    setActiveStationId(next.id);
    setFrequency(next.frequency);
    if (nextShow) setActiveShowId(nextShow.id);
  };

  useEffect(() => {
    audioEngine.setCallbacks({
      onSegmentChange: (index) => {
        setActiveSegmentIndex(index);
      },
      onPlaybackStateChange: (playing) => {
        setIsPlaying(playing);
      },
      onProgressUpdate: (current, total) => {
        setElapsedMs(current);
        setTotalMs(total);
      },
      onShowComplete: () => {
        void playQueuedOrMintRef.current();
      },
    });
    return () => {
      onAirRef.current = false;
      audioEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (!activeShow) return;
    audioEngine.loadShow(activeShow.segments, SPEAKERS, 0);
    audioEngine.armRecording(activeShow.audioUrl || null);
    setActiveSegmentIndex(0);
    setElapsedMs(0);
    setTotalMs(activeShow.segments.reduce((acc, s) => acc + (s.durationMs || 7000), 0));
    if (onAirRef.current) {
      const t = window.setTimeout(() => audioEngine.play(), 280);
      if (eternityRef.current) void prefetchEternity();
      return () => window.clearTimeout(t);
    }
  }, [activeShowId]);

  const handleSelectStation = (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    if (!station) return;
    setActiveStationId(stationId);
    setFrequency(station.frequency);
    const stationShow =
      shows.find((s) => s.id === station.currentShowId) ||
      shows.find((s) => s.stationId === stationId) ||
      shows[0];
    if (stationShow) setActiveShowId(stationShow.id);
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      audioEngine.pause();
    } else {
      onAirRef.current = true;
      audioEngine.play();
    }
  };

  const handleStopBroadcast = () => {
    onAirRef.current = false;
    eternityRef.current = false;
    const parked = queueRef.current;
    queueRef.current = null;
    releaseKey(hourKey(parked));
    setEternity(false);
    audioEngine.stop();
    setActiveSegmentIndex(0);
    setElapsedMs(0);
  };

  const handlePlayForever = async () => {
    if (foreverLockRef.current) return;
    foreverLockRef.current = true;
    eternityRef.current = true;
    onAirRef.current = true;
    setEternity(true);
    setEternityLabel('writing the next hour…');
    const currentId = wheelRef.current.activeShowId;
    try {
      let show = await mintEternityHour(wheelRef.current.activeStationId);
      if (!eternityRef.current) {
        releaseKey(hourKey(show));
        return;
      }
      if (show && show.id === currentId) {
        airKey(hourKey(show));
        show = await mintEternityHour(nextStation(wheelRef.current.activeStationId).id);
      }
      if (!eternityRef.current) {
        releaseKey(hourKey(show));
        return;
      }
      if (show) {
        applyHour(show);
        void prefetchEternity();
      } else {
        setEternityLabel('public feeds are quiet');
      }
    } finally {
      foreverLockRef.current = false;
    }
  };

  // Seek to specific segment
  const handleSeekSegment = (index: number) => {
    audioEngine.seekToSegment(index);
    setActiveSegmentIndex(index);
  };

  // Patch caller into active show
  const handlePatchCaller = (newCaller: Caller, reactions?: ScriptSegment[]) => {
    const callerSegment: ScriptSegment = {
      id: `seg-call-${Date.now()}`,
      speakerId: newCaller.id,
      speakerName: `${newCaller.name} (${newCaller.location})`,
      text: speakable(newCaller.take),
      timestampMs: activeShow.durationMs,
      durationMs: 8500,
      emotion: 'heated',
      topicTag: 'Caller Line 1'
    };

    const hostA = activeStation.hosts[0];
    const hostB = activeStation.hosts[1] || hostA;
    const reactionSegments: ScriptSegment[] = (reactions && reactions.length > 0)
      ? reactions.map((r, idx) => ({
          id: r.id || `seg-rx-${Date.now()}-${idx}`,
          speakerId: r.speakerId || hostA.id,
          speakerName: r.speakerName || hostA.name,
          text: speakable(r.text),
          timestampMs: activeShow.durationMs + 8500 + idx * 7500,
          durationMs: r.durationMs || 7500,
          emotion: r.emotion || 'excited',
          topicTag: 'Host Reaction'
        }))
      : [
          {
            id: `seg-rx-${Date.now()}-1`,
            speakerId: hostA.id,
            speakerName: hostA.name,
            text: `${newCaller.name}, hold on. That is the sore spot on this desk, and I want it on the record.`,
            timestampMs: activeShow.durationMs + 8500,
            durationMs: 7800,
            emotion: 'excited',
            topicTag: 'Host Reaction'
          },
          {
            id: `seg-rx-${Date.now()}-2`,
            speakerId: hostB.id,
            speakerName: hostB.name,
            text: `${hostA.name.replace(/"/g, '').split(/\s+/).find((part) => part !== 'Dr.') || hostA.name} is right to stop there. ${newCaller.name}, the part that still has to be proven stays on the desk.`,
            timestampMs: activeShow.durationMs + 16300,
            durationMs: 8200,
            emotion: 'intrigued',
            topicTag: 'Host Reaction'
          }
        ];

    const updatedSegments = [...activeShow.segments, callerSegment, ...reactionSegments];
    const updatedShow: RadioShow = {
      ...activeShow,
      segments: updatedSegments,
      callers: [...(activeShow.callers || []), newCaller],
      durationMs: updatedSegments.reduce((acc, s) => acc + (s.durationMs || 7000), 0)
    };

    setShows(prev => prev.map(s => s.id === updatedShow.id ? updatedShow : s));
    audioEngine.loadShow(updatedSegments, SPEAKERS, activeShow.segments.length);
    audioEngine.armRecording(null);
    audioEngine.play();
    setCurrentTab('broadcast');
  };

  // Add new generated show
  const handleShowGenerated = (newShow: RadioShow) => {
    onAirRef.current = true;
    setShows(prev => [newShow, ...prev]);
    setStations((prev) =>
      prev.map((s) => (s.id === newShow.stationId ? { ...s, currentShowId: newShow.id } : s)),
    );
    setActiveShowId(newShow.id);
    setActiveStationId(newShow.stationId);
    const targetStation = stations.find(s => s.id === newShow.stationId);
    if (targetStation) setFrequency(targetStation.frequency);
    setCurrentTab('broadcast');
  };

  const updateSettings = (newSettings: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Top Bar Contract (Single-line wordmark, text nav links, studio action) */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isPlaying={isPlaying}
        onAir={isPlaying}
        ungatedMode={settings.ungatedMode}
        setUngatedMode={(val) => updateSettings({ ungatedMode: val })}
        onOpenGenerator={() => setCurrentTab('generator')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Quick Studio Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-lg text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="font-semibold text-slate-200">Continuous 24/7 Studio Stream</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className={`hidden sm:inline font-mono ${eternity ? 'text-teal-300' : isPlaying ? 'text-emerald-400' : 'text-amber-400/90'}`}>
              {eternity
                ? 'ETERNITY'
                : isPlaying
                  ? 'ON AIR'
                  : 'STANDBY · press play, or lock Eternity'}
            </span>
            <span className="text-slate-600 hidden lg:inline">·</span>
            <span className="hidden lg:inline truncate">{eternity ? eternityLabel : lens.lens}</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 font-mono shrink-0">
            <span className="hidden md:inline">FREQ: {activeStation.frequency}</span>
            <a
              href={WITNESS_HOME}
              className="hidden md:inline text-teal-300/90 hover:text-teal-200 underline underline-offset-4"
              rel="noopener"
            >
              Witness
            </a>
            <button
              type="button"
              onClick={() => void handlePlayForever()}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                eternity
                  ? 'bg-teal-400 text-slate-950'
                  : 'bg-slate-800 border border-teal-500/40 text-teal-300 hover:bg-teal-400 hover:text-slate-950'
              }`}
              title="While this tab is open, each hour takes the next unused public story and writes from that story"
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              Play Forever
            </button>
          </div>
        </div>

        {/* Studio Broadcast Tab View */}
        {currentTab === 'broadcast' && (
          <div className="space-y-6">
            <NewsDesk
              show={activeShow}
              station={activeStation}
              activeSegmentIndex={activeSegmentIndex}
              isPlaying={isPlaying}
              elapsedMs={elapsedMs}
              onSeekSegment={handleSeekSegment}
              onOpenHotline={() => setCurrentTab('hotline')}
            />
            <div className="flex justify-end">
              <div
                role="group"
                aria-label="Where the page stays while the hour plays"
                className="inline-flex rounded-full border border-amber-950/50 bg-[#1a120c] p-0.5 text-[11px]"
              >
                <button
                  type="button"
                  aria-pressed={!settings.autoScrollTranscript}
                  onClick={() => updateSettings({ autoScrollTranscript: false })}
                  className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                    settings.autoScrollTranscript
                      ? 'text-amber-100/60 hover:text-amber-50'
                      : 'bg-amber-100/15 text-amber-50'
                  }`}
                >
                  Stay on the show
                </button>
                <button
                  type="button"
                  aria-pressed={settings.autoScrollTranscript}
                  onClick={() => updateSettings({ autoScrollTranscript: true })}
                  className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                    settings.autoScrollTranscript
                      ? 'bg-amber-100/15 text-amber-50'
                      : 'text-amber-100/60 hover:text-amber-50'
                  }`}
                >
                  Follow the script
                </button>
              </div>
            </div>
            {/* Live Studio Audio Player */}
            <LivePlayer
              show={activeShow}
              station={activeStation}
              activeSegmentIndex={activeSegmentIndex}
              isPlaying={isPlaying}
              onPlayToggle={handlePlayToggle}
              onSeekSegment={handleSeekSegment}
              onStopBroadcast={handleStopBroadcast}
              onNextHour={() => { void playQueuedOrMintRef.current(); }}
              onOpenNotes={() => setShowNotesOpen(true)}
              settings={settings}
              onUpdateSettings={updateSettings}
              elapsedMs={elapsedMs}
              totalMs={totalMs}
            />

            {/* Split Grid: Live Synchronized Transcript + Station Tuner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Transcript takes 7 cols */}
              <div className="lg:col-span-7">
                <Transcript
                  segments={activeShow.segments}
                  speakers={SPEAKERS}
                  activeSegmentIndex={activeSegmentIndex}
                  onSeekSegment={handleSeekSegment}
                  isPlaying={isPlaying}
                  autoScroll={settings.autoScrollTranscript}
                  onToggleAutoScroll={(val) => updateSettings({ autoScrollTranscript: val })}
                />
              </div>

              {/* Station Tuner & Quick Actions takes 5 cols */}
              <div className="lg:col-span-5 space-y-5">
                {/* Quick hotline teaser widget */}
                <div className="bg-[#111726] border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Caller Hotline Open
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Patch a take into this hour. The desk stays on air.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentTab('hotline')}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-red-600/20 whitespace-nowrap"
                  >
                    Dial In Line 1
                  </button>
                </div>

                <StationTuner
                  stations={stations}
                  activeStationId={activeStationId}
                  onSelectStation={handleSelectStation}
                  frequency={frequency}
                  onFrequencyChange={setFrequency}
                />
              </div>
            </div>

            <section id="studio-producer" className="scroll-mt-20">
              <ShowGenerator
                stations={stations}
                onShowGenerated={handleShowGenerated}
                ungatedDefault={settings.ungatedMode}
              />
            </section>
          </div>
        )}

        {/* Stations & Dial Tab View */}
        {currentTab === 'stations' && (
          <div className="space-y-6">
            <StationTuner
              stations={stations}
              activeStationId={activeStationId}
              onSelectStation={handleSelectStation}
              frequency={frequency}
              onFrequencyChange={setFrequency}
            />

            {/* Episodes on this station */}
            <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="font-bold text-sm text-slate-200 mb-4 flex items-center justify-between">
                <span>Episodes Broadcast on {activeStation.name}</span>
                <span className="text-xs font-mono text-slate-500">
                  {shows.filter(s => s.stationId === activeStationId).length} RECENT EPISODES
                </span>
              </h3>

              <div className="space-y-3">
                {shows.filter(s => s.stationId === activeStationId).map(showItem => (
                  <button
                    type="button"
                    key={showItem.id}
                    onClick={() => {
                      setActiveShowId(showItem.id);
                      setCurrentTab('broadcast');
                    }}
                    className={`w-full p-4 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                      showItem.id === activeShowId
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          EP #{showItem.episodeNumber}
                        </span>
                        {showItem.ungated && (
                          <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800/40">
                            UNGATED
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono">
                          {showItem.segments.length} segments
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-white">
                        {showItem.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {showItem.description}
                      </p>
                    </div>

                    <span
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium shrink-0 ml-4"
                    >
                      {showItem.id === activeShowId && isPlaying ? 'On Air' : 'Tune In'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Caller Hotline Tab View */}
        {currentTab === 'hotline' && (
          <CallerHotline
            currentCallers={activeShow.callers || []}
            onPatchCaller={handlePatchCaller}
            isPatching={false}
          />
        )}

        {/* Studio Desk tab — live Hugging Face Space DeepSeekOracle/ai-talk-radio */}
        {currentTab === 'generator' && (
          <DeskModule flush />
        )}

        {/* Soundboard Tab View */}
        {currentTab === 'soundboard' && (
          <Soundboard />
        )}

      </main>

      {/* Show Notes Modal */}
      {showNotesOpen && (
        <ShowNotesModal
          show={activeShow}
          onClose={() => setShowNotesOpen(false)}
        />
      )}

      {/* LYGO footer: house links, LYGO TV, the LYGO RADIO dock, support */}
      <LygoFooter />

    </div>
  );
}

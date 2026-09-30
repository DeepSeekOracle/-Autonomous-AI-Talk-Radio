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
import { STATIONS, INITIAL_SHOWS, SPEAKERS } from './data';
import { RadioStation, RadioShow, AudioSettings, Caller, ScriptSegment } from './types';
import { audioEngine } from './lib/audioEngine';
import { stationLens } from './lib/mintTitles';
import { synthesizeShow } from './lib/localShow';
import { gatherTopicDeck, pickTopic, researchFacts, WITNESS_HOME } from './lib/topicMill';
import { Infinity as InfinityIcon, Radio, Flame, Sparkles, Volume2, Info, Headphones } from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState<RadioStation[]>(STATIONS);
  const [shows, setShows] = useState<RadioShow[]>(INITIAL_SHOWS);
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
  const usedTopicsRef = useRef<Set<string>>(new Set());
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
    autoScrollTranscript: true
  });

  const activeStation = stations.find(s => s.id === activeStationId) || stations[0];
  const activeShow = shows.find(s => s.id === activeShowId) || shows[0];
  const lens = stationLens(activeStation.id);

  const nextStation = (fromId: string) => {
    const list = wheelRef.current.stations;
    const i = list.findIndex((s) => s.id === fromId);
    return list[(i + 1) % list.length] || list[0];
  };

  const applyHour = (show: RadioShow) => {
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

  const mintEternityHour = async (stationId: string): Promise<RadioShow | null> => {
    const station = wheelRef.current.stations.find((s) => s.id === stationId) || wheelRef.current.stations[0];
    const deck = await gatherTopicDeck();
    const topic = pickTopic(deck, station.id, usedTopicsRef.current);
    usedTopicsRef.current.add(topic.title);
    if (usedTopicsRef.current.size > 80) {
      usedTopicsRef.current = new Set([...usedTopicsRef.current].slice(-40));
    }
    setEternityLabel(`${topic.band} · ${topic.title}`.slice(0, 72));
    const facts = await researchFacts(topic.title);
    const h1 = station.hosts[0];
    const h2 = station.hosts[1] || station.hosts[0];
    return synthesizeShow({
      topic: topic.prompt,
      tone: station.id === 'station-kernel-panic' ? 'ungated' : 'unfiltered-debate',
      stationId: station.id,
      ungated: station.id === 'station-kernel-panic' || settings.ungatedMode,
      host1: h1.name,
      host2: h2.name,
      facts,
      sourceUrl: topic.url,
      sourceName: topic.source,
      band: topic.band,
    });
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
    if (show && eternityRef.current) {
      applyHour(show);
      void prefetchEternity();
    }
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
    queueRef.current = null;
    setEternity(false);
    audioEngine.stop();
    setActiveSegmentIndex(0);
    setElapsedMs(0);
  };

  const handlePlayForever = async () => {
    eternityRef.current = true;
    onAirRef.current = true;
    setEternity(true);
    setEternityLabel('writing the next hour…');
    if (isPlaying) {
      void prefetchEternity();
      return;
    }
    const show = await mintEternityHour(wheelRef.current.activeStationId);
    if (show && eternityRef.current) applyHour(show);
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
      text: newCaller.take,
      timestampMs: activeShow.durationMs,
      durationMs: 8500,
      emotion: 'heated',
      topicTag: 'Caller Line 1'
    };

    const reactionSegments: ScriptSegment[] = (reactions && reactions.length > 0)
      ? reactions.map((r, idx) => ({
          id: r.id || `seg-rx-${Date.now()}-${idx}`,
          speakerId: r.speakerId || 'devon',
          speakerName: r.speakerName || 'Devon Cross',
          text: r.text,
          timestampMs: activeShow.durationMs + 8500 + idx * 7500,
          durationMs: r.durationMs || 7500,
          emotion: r.emotion || 'excited',
          topicTag: 'Host Reaction'
        }))
      : [
          {
            id: `seg-rx-${Date.now()}-1`,
            speakerId: 'devon',
            speakerName: 'Devon Cross',
            text: `Hold on ${newCaller.name}, that is a fiery perspective! You are touching on a real sore spot for engineering leadership.`,
            timestampMs: activeShow.durationMs + 8500,
            durationMs: 7800,
            emotion: 'excited',
            topicTag: 'Host Reaction'
          },
          {
            id: `seg-rx-${Date.now()}-2`,
            speakerId: 'maya',
            speakerName: 'Dr. Maya Lin',
            text: `I agree with Devon, but let's look at the broader architectural trend before writing off the entire paradigm. Great call-in, ${newCaller.name}!`,
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
              title="Keep writing new hours from LYGO desks and Public Witness world feeds"
            >
              <InfinityIcon className="w-3.5 h-3.5" />
              Play Forever
            </button>
          </div>
        </div>

        {/* Studio Broadcast Tab View */}
        {currentTab === 'broadcast' && (
          <div className="space-y-6">
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
                <StationTuner
                  stations={stations}
                  activeStationId={activeStationId}
                  onSelectStation={handleSelectStation}
                  frequency={frequency}
                  onFrequencyChange={setFrequency}
                />

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
                    onClick={() => setCurrentTab('hotline')}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm shadow-red-600/20 whitespace-nowrap"
                  >
                    Dial In Line 1
                  </button>
                </div>
              </div>
            </div>
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
                  <div
                    key={showItem.id}
                    onClick={() => {
                      setActiveShowId(showItem.id);
                      setCurrentTab('broadcast');
                    }}
                    className={`p-4 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
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

                    <button
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-medium transition-colors shrink-0 ml-4"
                    >
                      {showItem.id === activeShowId && isPlaying ? 'On Air' : 'Tune In'}
                    </button>
                  </div>
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

        {/* Show Generator Tab View */}
        {currentTab === 'generator' && (
          <ShowGenerator
            stations={stations}
            onShowGenerated={handleShowGenerated}
            ungatedDefault={settings.ungatedMode}
          />
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

      {/* Studio Desk module — the LYGO Signal show builder, embedded */}
      <DeskModule />

      {/* LYGO footer: house links, LYGO TV, the LYGO RADIO dock, support */}
      <LygoFooter />

    </div>
  );
}

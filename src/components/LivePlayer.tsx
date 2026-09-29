import React, { useState, useEffect } from 'react';
import { RadioShow, RadioStation, AudioSettings } from '../types';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Sliders, 
  FileText, 
  Flame, 
  Mic, 
  Radio
} from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface LivePlayerProps {
  show: RadioShow;
  station: RadioStation;
  activeSegmentIndex: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onSeekSegment: (index: number) => void;
  onOpenNotes: () => void;
  settings: AudioSettings;
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  elapsedMs: number;
  totalMs: number;
}

export const LivePlayer: React.FC<LivePlayerProps> = ({
  show,
  station,
  activeSegmentIndex,
  isPlaying,
  onPlayToggle,
  onSeekSegment,
  onOpenNotes,
  settings,
  onUpdateSettings,
  elapsedMs,
  totalMs
}) => {
  const [vuLevels, setVuLevels] = useState<{ left: number; right: number }>({ left: 0, right: 0 });
  const [spectrum, setSpectrum] = useState<number[]>(new Array(16).fill(0));
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.85);

  const currentSegment = show.segments[activeSegmentIndex] || show.segments[0];
  const activeSpeaker = show.hosts.find(h => h.id === currentSegment?.speakerId) || 
    show.callers?.find(c => c.id === currentSegment?.speakerId) || {
      id: currentSegment?.speakerId || 'host',
      name: currentSegment?.speakerName || 'Radio Host',
      title: 'Broadcaster',
      avatar: 'MIC',
      role: 'host-1' as const
    };
  const speakerRole = 'role' in activeSpeaker ? activeSpeaker.role : 'caller';

  // Real-time VU meter and spectrum ticker
  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      const { frequencyData, rms } = audioEngine.getVisualizerData();
      if (isPlaying) {
        const left = Math.min(100, Math.max(8, rms * 110 + (Math.random() * 12)));
        const right = Math.min(100, Math.max(8, rms * 105 + (Math.random() * 15)));
        setVuLevels({ left, right });

        const bands = [];
        const step = Math.floor(frequencyData.length / 16) || 1;
        for (let i = 0; i < 16; i++) {
          const val = frequencyData[i * step] || 0;
          bands.push(Math.min(100, (val / 255) * 100));
        }
        setSpectrum(bands);
      } else {
        setVuLevels({ left: 3, right: 3 });
        setSpectrum(new Array(16).fill(3));
      }
      animId = requestAnimationFrame(updateMeter);
    };

    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateSettings({ volume: val });
    audioEngine.setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      onUpdateSettings({ volume: prevVolume });
      audioEngine.setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(settings.volume);
      onUpdateSettings({ volume: 0 });
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    onUpdateSettings({ playbackRate: speed });
    audioEngine.setSpeed(speed);
  };

  const handleEqualizerChange = (eq: AudioSettings['equalizerPreset']) => {
    onUpdateSettings({ equalizerPreset: eq });
    audioEngine.setEqualizerPreset(eq);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Top Meta Header: Station Frequency, Show Tagline, Ungated Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>{station.frequency}</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {station.name}
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            EP #{show.episodeNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {show.ungated && (
            <div className="px-2 py-0.5 rounded bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-mono font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>UNGATED BROADCAST</span>
            </div>
          )}
          <button
            onClick={onOpenNotes}
            className="px-2.5 py-1 rounded text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 hover:text-white hover:border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Show Notes & Links</span>
          </button>
        </div>
      </div>

      {/* Main Studio Console Layout: Left Title & Speaker, Right VU Meters & Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Column: Title, Description, Active Mic Persona */}
        <div className="lg:col-span-7">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug line-clamp-2">
            {show.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {show.description}
          </p>

          {/* Active Speaking Host Banner */}
          <div className="mt-4 p-3 bg-slate-900/80 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-900 transition-all ${
                  isPlaying ? 'bg-amber-400 ring-2 ring-amber-500/40' : 'bg-slate-700 text-slate-300'
                }`}>
                  {activeSpeaker.avatar}
                </div>
                {isPlaying && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#111726] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {activeSpeaker.name}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    {speakerRole.replace('-', ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mic className="w-3 h-3 text-red-400 animate-pulse" />
                  <span className="italic truncate max-w-[260px] sm:max-w-md">
                    "{currentSegment?.text || 'Broadcasting live...'}"
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-mono text-slate-500 block">SEGMENT</span>
              <span className="text-xs font-mono font-bold text-slate-300">
                {activeSegmentIndex + 1} / {show.segments.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Hardware VU Meters & Frequency Spectrum Analyzer */}
        <div className="lg:col-span-5 bg-[#0b0e17] border border-slate-800/90 rounded-lg p-3.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              STUDIO AGC COMPRESSOR
            </span>
            <span className="text-amber-500">
              {settings.equalizerPreset.toUpperCase().replace('-', ' ')}
            </span>
          </div>

          {/* Stereo VU Peak Bars */}
          <div className="space-y-1.5 mb-3 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-3">L</span>
              <div className="flex-1 h-2.5 bg-slate-900 rounded overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: `${vuLevels.left}%` }}
                />
              </div>
              <span className="text-slate-400 w-8 text-right tabular-nums">
                {(vuLevels.left * 0.6 - 60).toFixed(0)} dB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-3">R</span>
              <div className="flex-1 h-2.5 bg-slate-900 rounded overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ width: `${vuLevels.right}%` }}
                />
              </div>
              <span className="text-slate-400 w-8 text-right tabular-nums">
                {(vuLevels.right * 0.6 - 60).toFixed(0)} dB
              </span>
            </div>
          </div>

          {/* Multi-Band Frequency Spectrum Bar Chart */}
          <div className="h-10 bg-slate-900/80 rounded border border-slate-800/60 p-1 flex items-end justify-between gap-1">
            {spectrum.map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-amber-500/70 hover:bg-amber-400 rounded-t-sm transition-all duration-75"
                style={{ height: `${Math.max(6, height)}%` }}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Progress & Scrub Bar */}
      <div className="mt-6 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
          <span className="text-amber-400 font-semibold tabular-nums">
            {formatTime(elapsedMs)}
          </span>
          <span className="text-slate-500 tabular-nums">
            {formatTime(totalMs)}
          </span>
        </div>

        {/* Interactive Scrub Bar with segment markers */}
        <div 
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = clickX / rect.width;
            const targetSegIndex = Math.floor(ratio * show.segments.length);
            onSeekSegment(Math.min(show.segments.length - 1, targetSegIndex));
          }}
          className="relative h-2 bg-slate-800 rounded-full cursor-pointer group"
        >
          <div
            className="absolute top-0 left-0 bottom-0 bg-amber-500 rounded-full transition-all group-hover:bg-amber-400"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Segment Tick Dividers */}
          {show.segments.map((_, idx) => {
            if (idx === 0) return null;
            const pos = (idx / show.segments.length) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-0.5 bg-slate-950/70 pointer-events-none"
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Playback Controls & Studio Audio Settings Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Play, Pause, Skip segment buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onSeekSegment(Math.max(0, activeSegmentIndex - 1))}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous Segment"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayToggle}
            className="w-12 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold flex items-center justify-center transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            title={isPlaying ? 'Pause Broadcast' : 'Play Broadcast'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
          </button>

          <button
            onClick={() => {
              audioEngine.stop();
              onSeekSegment(0);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Stop Broadcast"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSeekSegment(Math.min(show.segments.length - 1, activeSegmentIndex + 1))}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next Segment"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Equalizer Preset Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          {(['broadcast-warmth', 'fm-clarity', 'vintage-transistor', 'bypass'] as const).map((eq) => (
            <button
              key={eq}
              onClick={() => handleEqualizerChange(eq)}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors whitespace-nowrap ${
                settings.equalizerPreset === eq
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {eq === 'broadcast-warmth' ? 'Broadcast' : eq === 'fm-clarity' ? 'FM Punch' : eq === 'vintage-transistor' ? 'AM Radio' : 'Clean'}
            </button>
          ))}
        </div>

        {/* Speed Selector & Volume Control */}
        <div className="flex items-center gap-4">
          
          {/* Speed Pills */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono">
            {[0.75, 1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                  settings.playbackRate === speed
                    ? 'bg-slate-800 text-amber-400 font-bold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || settings.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : settings.volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

        </div>

      </div>

    </div>
  );
};

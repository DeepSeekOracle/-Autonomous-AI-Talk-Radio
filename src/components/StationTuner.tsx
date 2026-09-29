import React from 'react';
import { RadioStation } from '../types';
import { Radio, Wifi, Volume2, Sparkles, Flame } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface StationTunerProps {
  stations: RadioStation[];
  activeStationId: string;
  onSelectStation: (stationId: string) => void;
  frequency: string;
  onFrequencyChange: (freq: string) => void;
}

export const StationTuner: React.FC<StationTunerProps> = ({
  stations,
  activeStationId,
  onSelectStation,
  frequency,
  onFrequencyChange,
}) => {
  const currentStation = stations.find(s => s.id === activeStationId);

  const handleTune = (targetStation: RadioStation) => {
    audioEngine.playStaticSweep();
    onSelectStation(targetStation.id);
    onFrequencyChange(targetStation.frequency);
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Background Subtle Dial Grid Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with Signal info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Station Receiver & Dial
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase-locked PLL synthetic broadcast tuner · 320 kbps digital stream
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded">
            <Wifi className="w-3.5 h-3.5" />
            <span>STEREO FM LOCK</span>
          </div>
          <div className="text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            <span>SIG: 98.2 dBµV</span>
          </div>
        </div>
      </div>

      {/* Analog / Digital Frequency Display Scale */}
      <div className="bg-[#0b0e17] border border-slate-800 rounded-lg p-4 mb-6 shadow-inner">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-500">
          <span>88.0 MHz</span>
          <span className="text-amber-400 font-bold text-sm tracking-wide">
            {currentStation?.frequency || frequency}
          </span>
          <span>108.0 MHz</span>
        </div>

        {/* Physical Frequency Slider Scale */}
        <div className="relative w-full h-10 bg-slate-900/90 rounded border border-slate-800 flex items-center px-3 overflow-hidden">
          {/* Frequency hash marks */}
          <div className="w-full flex justify-between items-end h-5 select-none pointer-events-none opacity-40">
            {Array.from({ length: 41 }).map((_, i) => (
              <div
                key={i}
                className={`w-0.5 bg-slate-400 ${i % 5 === 0 ? 'h-5 bg-amber-400' : 'h-2'}`}
              />
            ))}
          </div>

          {/* Station Markers */}
          {stations.map(st => {
            const freqNum = parseFloat(st.frequency.replace(' FM', ''));
            const percent = ((freqNum - 88.0) / (108.0 - 88.0)) * 100;
            const isSelected = st.id === activeStationId;

            return (
              <button
                key={st.id}
                onClick={() => handleTune(st)}
                style={{ left: `${Math.max(2, Math.min(96, percent))}%` }}
                className={`absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-center px-1 cursor-pointer transition-transform group`}
                title={`${st.name} (${st.frequency})`}
              >
                <div className={`w-1 h-full rounded transition-colors ${
                  isSelected ? 'bg-amber-400 shadow-sm shadow-amber-500' : 'bg-slate-600 group-hover:bg-amber-300'
                }`} />
                <span className={`absolute -bottom-1 text-[9px] font-mono px-1 rounded whitespace-nowrap ${
                  isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 bg-slate-900 group-hover:text-slate-200'
                }`}>
                  {st.frequency.replace(' FM', '')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stations.map((st) => {
          const isActive = st.id === activeStationId;

          return (
            <button
              key={st.id}
              onClick={() => handleTune(st)}
              className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer relative overflow-hidden group ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              {/* Active station frequency accent bar */}
              <div
                className="absolute top-0 left-0 bottom-0 w-1 transition-colors"
                style={{ backgroundColor: isActive ? st.accentColor : 'transparent' }}
              />

              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                  {st.frequency}
                </span>
                {st.id === 'station-kernel-panic' && (
                  <span className="text-[10px] font-mono text-red-400 flex items-center gap-0.5">
                    <Flame className="w-3 h-3" /> UNGATED
                  </span>
                )}
                {isActive && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    TUNED
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-sm text-white group-hover:text-amber-200 transition-colors line-clamp-1">
                {st.name}
              </h3>

              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {st.tagline}
              </p>

              {/* Host Avatars and names */}
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {st.hosts.map((h) => (
                      <div
                        key={h.id}
                        className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300"
                        title={`${h.name} (${h.title})`}
                      >
                        {h.avatar}
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] truncate max-w-[120px]">
                    {st.hosts.map(h => h.name.split(' ')[0]).join(' & ')}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {st.genre.split(' ')[0]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Radio, Flame, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentTab: 'broadcast' | 'stations' | 'hotline' | 'generator' | 'soundboard';
  setCurrentTab: (tab: 'broadcast' | 'stations' | 'hotline' | 'generator' | 'soundboard') => void;
  isPlaying: boolean;
  onAir: boolean;
  ungatedMode: boolean;
  setUngatedMode: (val: boolean) => void;
  onOpenGenerator: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isPlaying,
  onAir,
  ungatedMode,
  setUngatedMode,
  onOpenGenerator
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0e131f]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark with radio frequency mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-bold shadow-sm shadow-amber-500/20">
            <Radio className="w-4 h-4 text-slate-950" />
          </div>
          <button 
            onClick={() => setCurrentTab('broadcast')}
            className="text-left group cursor-pointer"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              AI Talk Radio
            </span>
            <span className="text-xs text-amber-500 font-mono ml-2 font-medium tracking-wider">
              {ungatedMode ? 'UNGATED' : 'LIVE'}
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setCurrentTab('broadcast')}
            className={`cursor-pointer transition-colors pb-1 border-b-2 ${
              currentTab === 'broadcast'
                ? 'text-white border-amber-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Studio Broadcast
          </button>
          <button
            onClick={() => setCurrentTab('stations')}
            className={`cursor-pointer transition-colors pb-1 border-b-2 ${
              currentTab === 'stations'
                ? 'text-white border-amber-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Dial & Stations
          </button>
          <button
            onClick={() => setCurrentTab('hotline')}
            className={`cursor-pointer transition-colors pb-1 border-b-2 flex items-center gap-1.5 ${
              currentTab === 'hotline'
                ? 'text-white border-amber-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>Caller Hotline</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
          </button>
          <button
            onClick={() => setCurrentTab('generator')}
            className={`cursor-pointer transition-colors pb-1 border-b-2 ${
              currentTab === 'generator'
                ? 'text-white border-amber-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Show Producer
          </button>
          <button
            onClick={() => setCurrentTab('soundboard')}
            className={`cursor-pointer transition-colors pb-1 border-b-2 ${
              currentTab === 'soundboard'
                ? 'text-white border-amber-500 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Soundboard FX
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions & studio indicators */}
        <div className="flex items-center gap-3">
          {/* On Air Status Indicator */}
          <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all ${
            isPlaying || onAir
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-on-air'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isPlaying || onAir ? 'bg-red-500' : 'bg-slate-500'}`} />
            <span>ON AIR</span>
          </div>

          {/* Ungated Toggle */}
          <button
            onClick={() => setUngatedMode(!ungatedMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              ungatedMode 
                ? 'bg-red-950/80 text-red-300 border border-red-600/60 shadow-sm shadow-red-900/30' 
                : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700'
            }`}
            title="Toggle Ungated Mode: uninhibited, spicy, raw debates"
          >
            <Flame className={`w-3.5 h-3.5 ${ungatedMode ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Ungated</span>
          </button>

          {/* Produce New Show Action */}
          <button
            onClick={onOpenGenerator}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generate Broadcast</span>
            <span className="sm:hidden">New Show</span>
          </button>
        </div>

      </div>
    </header>
  );
};

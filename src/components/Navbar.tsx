const BASE = import.meta.env.BASE_URL;

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

const TABS: { id: NavbarProps['currentTab']; label: string }[] = [
  { id: 'broadcast', label: 'Studio Broadcast' },
  { id: 'stations', label: 'Dial & Stations' },
  { id: 'hotline', label: 'Caller Hotline' },
  { id: 'generator', label: 'Studio Desk' },
  { id: 'soundboard', label: 'Soundboard FX' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  isPlaying,
  onAir,
  ungatedMode,
  setUngatedMode,
  onOpenGenerator
}) => {
  const tabClass = (id: NavbarProps['currentTab'], mobile: boolean) => {
    const on = currentTab === id;
    if (mobile) {
      return `shrink-0 rounded-full px-3 py-1 text-xs border whitespace-nowrap ${
        on
          ? 'bg-amber-500 text-slate-950 border-amber-500 font-semibold'
          : 'border-slate-700 text-slate-300'
      }`;
    }
    return `cursor-pointer transition-colors pb-1 border-b-2 ${
      id === 'hotline' ? 'flex items-center gap-1.5 ' : ''
    }${
      on
        ? 'text-white border-amber-500 font-semibold'
        : 'text-slate-400 border-transparent hover:text-slate-200'
    }`;
  };

  return (
    <header className="border-b border-slate-800 bg-[#0e131f]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark with radio frequency mark */}
        <div className="flex items-center gap-3">
          <img src={`${BASE}brand/lygo-signal-mark.svg`} alt="LYGO Signal" width={38} height={38} className="w-9 h-9 drop-shadow-[0_0_10px_rgba(245,158,11,0.25)]" />
          <button
            type="button"
            onClick={() => setCurrentTab('broadcast')}
            className="text-left group cursor-pointer"
            aria-label="Back to the studio broadcast"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
              AI Talk Radio
            </span>
            <span className="text-xs text-amber-500 font-mono ml-2 font-medium tracking-wider">
              {ungatedMode ? 'UNGATED' : 'LIVE'}
            </span>
            <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 mt-0.5">
              LYGO Signal · AI Radio · Always On
            </span>
          </button>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label="Studio sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={tabClass(tab.id, false)}
            >
              {tab.id === 'hotline' ? <span>{tab.label}</span> : tab.label}
              {tab.id === 'hotline' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" aria-hidden="true" />
              )}
            </button>
          ))}
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
            type="button"
            onClick={() => setUngatedMode(!ungatedMode)}
            aria-pressed={ungatedMode}
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
            type="button"
            onClick={onOpenGenerator}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-sm shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Studio Desk</span>
            <span className="sm:hidden">Desk</span>
          </button>
        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:hidden pb-3">
        <nav aria-label="Studio sections" className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCurrentTab(tab.id)}
              aria-current={currentTab === tab.id ? 'page' : undefined}
              className={tabClass(tab.id, true)}
            >
              {tab.label}
              {tab.id === 'hotline' && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-middle" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

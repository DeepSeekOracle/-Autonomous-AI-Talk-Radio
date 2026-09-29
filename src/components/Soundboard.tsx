import React, { useState } from 'react';
import { Volume2, AlertOctagon, Bell, Radio, Sparkles, Smile, Phone, Award } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

export const Soundboard: React.FC = () => {
  const [activeEffect, setActiveEffect] = useState<string | null>(null);

  const triggerSound = (name: string, fn: () => void) => {
    setActiveEffect(name);
    fn();
    setTimeout(() => {
      setActiveEffect(null);
    }, 600);
  };

  const soundboardItems = [
    {
      id: 'airhorn',
      name: 'Airhorn Stinger',
      category: 'Hype',
      icon: Bell,
      color: 'from-amber-600 to-red-600',
      action: () => audioEngine.playAirhorn()
    },
    {
      id: 'censor-bleep',
      name: 'FCC Censor Bleep (1kHz)',
      category: 'Station',
      icon: AlertOctagon,
      color: 'from-red-600 to-rose-700',
      action: () => audioEngine.playCensorBleep()
    },
    {
      id: 'static-sweep',
      name: 'Analog Static Sweep',
      category: 'Tuner',
      icon: Radio,
      color: 'from-cyan-600 to-blue-700',
      action: () => audioEngine.playStaticSweep()
    },
    {
      id: 'news-chime',
      name: 'Breaking News Chime',
      category: 'Broadcast',
      icon: Sparkles,
      color: 'from-emerald-600 to-teal-700',
      action: () => audioEngine.playNewsChime()
    },
    {
      id: 'applause',
      name: 'Studio Applause',
      category: 'Audience',
      icon: Award,
      color: 'from-purple-600 to-indigo-700',
      action: () => audioEngine.playApplause()
    },
    {
      id: 'telephone-ring',
      name: 'Hotline DTMF Ring',
      category: 'Hotline',
      icon: Phone,
      color: 'from-orange-600 to-amber-700',
      action: () => audioEngine.playTelephoneRing()
    }
  ];

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              DJ Radio Soundboard & FX Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant synthesized broadcast drops, transitions, and FCC censor triggers
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
          <span>ZERO-LATENCY DSP SYNTH</span>
        </div>
      </div>

      {/* FX Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {soundboardItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeEffect === item.id;

          return (
            <button
              key={item.id}
              onClick={() => triggerSound(item.id, item.action)}
              className={`p-4 rounded-xl border text-left transition-all active:scale-95 cursor-pointer relative overflow-hidden group ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              {/* Category label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  {item.category}
                </span>
                <span className={`w-2 h-2 rounded-full transition-all ${
                  isActive ? 'bg-amber-400 animate-ping' : 'bg-slate-700'
                }`} />
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-3 mt-1">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md shadow-slate-950/40 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-semibold text-xs text-slate-200 group-hover:text-white leading-tight">
                  {item.name}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Soundboard Footer Note */}
      <div className="mt-5 p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono">
        <span>Sound drops mix natively with active multi-speaker radio broadcast</span>
        <span className="text-amber-500">READY ON BUS 1</span>
      </div>
    </div>
  );
};

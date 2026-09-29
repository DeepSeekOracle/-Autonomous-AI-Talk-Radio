import React, { useState } from 'react';
import { Caller } from '../types';
import { Phone, PhoneCall, PhoneForwarded, Radio, Sparkles, User, MapPin, MessageSquare, AlertCircle } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';

interface CallerHotlineProps {
  currentCallers: Caller[];
  onPatchCaller: (caller: Caller, reactions?: any[]) => void;
  isPatching: boolean;
}

export const CallerHotline: React.FC<CallerHotlineProps> = ({
  currentCallers,
  onPatchCaller,
  isPatching
}) => {
  const [callerName, setCallerName] = useState('');
  const [location, setLocation] = useState('');
  const [topic, setTopic] = useState('');
  const [take, setTake] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const readyCallers: Caller[] = [
    {
      id: 'pre-caller-1',
      name: 'Dr. Hiroshi Tanaka',
      location: 'Tokyo, Japan',
      topic: 'Robotics Sim2Real Gaps',
      take: 'Diffusion policies work great in simulation, but physical motor backlash will wreck your robot arm in 10 minutes.',
      status: 'queued',
      avatar: 'HT'
    },
    {
      id: 'pre-caller-2',
      name: 'Sarah Jenkins',
      location: 'London, UK',
      topic: 'Open Weights Licensing',
      take: 'If you cannot inspect training datasets for data poisoning, calling it open weights is pure marketing theater.',
      status: 'queued',
      avatar: 'SJ'
    },
    {
      id: 'pre-caller-3',
      name: 'Tyler "CacheMiss"',
      location: 'Denver, CO',
      topic: 'Microservices Regret',
      take: 'We spent $800k on Kubernetes clusters to do what a single $40 Hetzner dedicated box did in 2018.',
      status: 'queued',
      avatar: 'TC'
    }
  ];

  const handleDialIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callerName.trim() || !take.trim()) {
      setErrorMessage('Please enter your name and hot take.');
      return;
    }
    setErrorMessage('');
    setLoading(true);

    // Play physical telephone ring stinger
    audioEngine.playTelephoneRing();

    const newCaller: Caller = {
      id: `caller-user-${Date.now()}`,
      name: callerName.trim(),
      location: location.trim() || 'Anonymous Radio Listener',
      topic: topic.trim() || 'Live Call-In Debate',
      take: take.trim(),
      status: 'on-air',
      avatar: callerName.slice(0, 2).toUpperCase()
    };

    try {
      const response = await fetch('/api/radio/caller-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerName: newCaller.name,
          location: newCaller.location,
          topic: newCaller.topic,
          take: newCaller.take
        })
      });

      const data = await response.json();
      onPatchCaller(newCaller, data.segments || []);
      setCallerName('');
      setLocation('');
      setTopic('');
      setTake('');
    } catch (err: any) {
      console.warn('Caller patch API fallback:', err);
      onPatchCaller(newCaller);
    } finally {
      setLoading(false);
    }
  };

  const handlePatchPreset = async (preset: Caller) => {
    setLoading(true);
    audioEngine.playTelephoneRing();

    try {
      const response = await fetch('/api/radio/caller-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerName: preset.name,
          location: preset.location,
          topic: preset.topic,
          take: preset.take
        })
      });

      const data = await response.json();
      onPatchCaller(preset, data.segments || []);
    } catch (err: any) {
      onPatchCaller(preset);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Switchboard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-red-500 animate-pulse" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Studio Switchboard Hotline
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Toll-free talk radio line · Real-time host reaction patch
          </p>
        </div>

        {/* Switchboard Line Indicators */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-2.5 py-1 rounded bg-red-950/70 border border-red-700/60 text-red-400 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>LINE 1: ON AIR</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-700/60 text-amber-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>LINE 2: QUEUED</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>LINE 3: OPEN</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Dial in now */}
        <div className="lg:col-span-7 bg-[#0b0e17] border border-slate-800 rounded-xl p-5 shadow-inner">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-white">
              Patch Into The Broadcast (Line 3)
            </h3>
          </div>

          {errorMessage && (
            <div className="mb-4 p-2.5 rounded bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleDialIn} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Your Name / Radio Handle</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Calling From (City, State/Country)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Topic Tag
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Consensus vs Simplicity"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-slate-500" />
                <span>Your Live Hot Take / Question</span>
              </label>
              <textarea
                rows={3}
                placeholder="What do Devon and Maya have completely wrong? Share your raw production experience..."
                value={take}
                onChange={(e) => setTake(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80 resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || isPatching}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md shadow-red-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PhoneForwarded className="w-4 h-4" />
              <span>{loading || isPatching ? 'Patching Audio to Studio Line...' : 'Dial Into On-Air Studio Now'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Pre-screened callers on deck */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-xs text-slate-300 uppercase tracking-wider font-mono">
              Queued Callers On Deck
            </h3>
            <span className="text-[10px] text-amber-500 font-mono">1-CLICK PATCH</span>
          </div>

          {readyCallers.map((preset) => (
            <div
              key={preset.id}
              className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-all flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-amber-400 flex items-center justify-center">
                      {preset.avatar}
                    </div>
                    <span className="text-xs font-semibold text-white">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      · {preset.location}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    HOLDING
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2 line-clamp-2 italic leading-relaxed">
                  "{preset.take}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-1">
                <span className="text-[10px] font-mono text-slate-500">
                  Topic: {preset.topic}
                </span>

                <button
                  onClick={() => handlePatchPreset(preset)}
                  disabled={loading || isPatching}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Patch On-Air</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

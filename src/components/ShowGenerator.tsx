import React, { useState } from 'react';
import { RadioStation, RadioShow } from '../types';
import { Sparkles, Radio, Flame, Cpu, Users, Layers, Zap, CheckCircle2 } from 'lucide-react';
import { audioEngine } from '../lib/audioEngine';
import { synthesizeShow } from '../lib/localShow';

interface ShowGeneratorProps {
  stations: RadioStation[];
  onShowGenerated: (show: RadioShow) => void;
  ungatedDefault: boolean;
}

export const ShowGenerator: React.FC<ShowGeneratorProps> = ({
  stations,
  onShowGenerated,
  ungatedDefault
}) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'unfiltered' | 'deep-dive' | 'morning-rush' | 'late-night'>('unfiltered');
  const [selectedStationId, setSelectedStationId] = useState(stations[0]?.id || 'station-algorithmic-wire');
  const [hostPair, setHostPair] = useState<'devon-maya' | 'zack-aris' | 'victoria-devon'>('devon-maya');
  const [isUngated, setIsUngated] = useState(ungatedDefault);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [engineNote, setEngineNote] = useState('');

  const trendingTopics = [
    'The Death of Frameworks: Why Prompts Are the New Syntax',
    'Open Weights vs Cloud Monopolies: Who Actually Owns Intelligence?',
    'The Great Microservices Regret: Returning to Boring Monoliths',
    'Local NPUs on $40 Hardware: Bypassing Cloud APIs Completely',
    'The $500B Compute Bubble: When Data Center Electricity Runs Dry'
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTopic = topic.trim() || trendingTopics[0];
    setIsGenerating(true);
    setStatusMessage('Drafting multi-speaker radio dialogue & timing...');

    // Host names
    let h1 = 'Devon Cross';
    let h2 = 'Dr. Maya Lin';
    if (hostPair === 'zack-aris') {
      h1 = '"ZeroDay" Zack';
      h2 = 'Dr. Aris Thorne';
    } else if (hostPair === 'victoria-devon') {
      h1 = 'Victoria Sterling';
      h2 = 'Devon Cross';
    }

    const payload = {
      topic: finalTopic,
      tone: isUngated ? 'unfiltered-ungated' : tone,
      stationId: selectedStationId,
      ungated: isUngated,
      host1: h1,
      host2: h2
    };

    let produced: RadioShow | null = null;
    let engine = 'gemini';

    try {
      audioEngine.playNewsChime();
      setStatusMessage('Synthesizing studio broadcast script & audio cues...');

      const response = await fetch('/api/radio/generate-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // A static host answers an unknown route with its index.html and HTTP 200, so a 200 alone
      // proves nothing: the payload has to be JSON and it has to carry a show.
      const contentType = response.headers.get('content-type') || '';
      const data = response.ok && contentType.includes('application/json') ? await response.json() : null;
      if (!data?.show?.segments?.length) {
        throw new Error(`studio API unavailable (HTTP ${response.status}, ${contentType || 'no content-type'})`);
      }

      produced = data.show as RadioShow;
      engine = data.source === 'gemini' ? 'gemini' : 'server synthesizer';
    } catch (err) {
      console.warn('[studio] server path unavailable — writing the episode in the local synthesizer:', err);
      setStatusMessage('Transmitter offline. Writing the episode in the studio synthesizer...');
      produced = synthesizeShow(payload);
      engine = 'local synthesizer (offline)';
    }

    if (produced) {
      const finished: RadioShow = produced;
      setStatusMessage('Broadcast produced successfully! Patching to master feed...');
      setEngineNote(`Engine: ${engine}`);
      setTimeout(() => {
        onShowGenerated(finished);
        setIsGenerating(false);
        setStatusMessage('');
      }, 800);
    } else {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Studio Broadcast Producer
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Autonomous multi-speaker dialogue synthesis with contrasting personas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {engineNote && (
            <div className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
              {engineNote}
            </div>
          )}
          <div className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
            <span>ON-DEMAND TRANSMITTER</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5">
        {/* Topic Input with Fast Suggestions */}
        <div>
          <label htmlFor="broadcast-topic" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Broadcast Topic or Technical Controversy</span>
            <span className="text-[10px] text-slate-500 font-mono">CUSTOM OR CLICK PRESET</span>
          </label>
          <input
            id="broadcast-topic"
            type="text"
            placeholder="e.g. Memory safety benchmarks in distributed databases..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0b0e17] border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/80"
          />

          {/* Quick preset chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {trendingTopics.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTopic(t)}
                className="text-[11px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded cursor-pointer transition-colors text-left"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tone, Ungated Switch & Station Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          
          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Show Format & Tone</span>
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'unfiltered', name: 'Raw Technical Debate', desc: 'No-holds-barred arguments' },
                { id: 'deep-dive', name: 'Systems Architecture', desc: 'Kernels, memory, distributed proofs' },
                { id: 'morning-rush', name: 'Morning Drive Banter', desc: 'Fast-paced, witty news desk' },
                { id: 'late-night', name: 'Late Night Tech Noir', desc: 'Deep speculative atmosphere' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id as any)}
                  className={`w-full text-left p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    tone === t.id
                      ? 'bg-amber-500/10 border-amber-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Host Duo Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Anchor Chemistry Duo</span>
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'devon-maya', name: 'Devon & Maya', desc: 'Systems Cynic vs ML Visionary' },
                { id: 'zack-aris', name: 'ZeroDay Zack & Dr. Aris', desc: 'Offensive Hacker vs Compiler Guru' },
                { id: 'victoria-devon', name: 'Victoria & Devon', desc: 'VC Insider vs Production Engineer' }
              ].map((hp) => (
                <button
                  key={hp.id}
                  type="button"
                  onClick={() => setHostPair(hp.id as any)}
                  className={`w-full text-left p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    hostPair === hp.id
                      ? 'bg-amber-500/10 border-amber-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-200">{hp.name}</div>
                  <div className="text-[10px] text-slate-500">{hp.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Station Channel & Ungated Filter */}
          <div className="space-y-4">
            <div>
              <label htmlFor="station-destination" className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Station Destination</span>
              </label>
              <select
                id="station-destination"
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500/80 cursor-pointer"
              >
                {stations.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.frequency} — {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ungated Toggle Box */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  Ungated Mode
                </span>
                <input
                  type="checkbox"
                  checked={isUngated}
                  onChange={(e) => setIsUngated(e.target.checked)}
                  aria-label="Ungated mode"
                  className="w-4 h-4 accent-red-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Removes FCC radio filters for brutal, unvarnished industry truths and spicy arguments.
              </p>
            </div>
          </div>

        </div>

        {/* Status message while synthesizing */}
        {isGenerating && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300 font-mono animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-lg transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isGenerating ? 'Producing Episode Transmission...' : 'Produce & Broadcast Episode'}</span>
        </button>
      </form>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { ScriptSegment, Speaker } from '../types';
import { Search, Play, Volume2, Copy, Check, ArrowDownCircle } from 'lucide-react';

interface TranscriptProps {
  segments: ScriptSegment[];
  speakers: Record<string, Speaker>;
  activeSegmentIndex: number;
  onSeekSegment: (index: number) => void;
  isPlaying: boolean;
  autoScroll: boolean;
  onToggleAutoScroll: (val: boolean) => void;
}

export const Transcript: React.FC<TranscriptProps> = ({
  segments,
  speakers,
  activeSegmentIndex,
  onSeekSegment,
  isPlaying,
  autoScroll,
  onToggleAutoScroll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when activeSegmentIndex changes
  useEffect(() => {
    if (autoScroll && activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  const handleCopyLine = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSegments = segments.filter(seg => 
    seg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    seg.speakerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (seg.topicTag && seg.topicTag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-xl flex flex-col h-[520px] shadow-lg overflow-hidden">
      {/* Header bar: Title, Search, and Auto-scroll switch */}
      <div className="p-4 border-b border-slate-800/80 bg-[#0f1422] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-200">
              Live Broadcast Transcript
            </h3>
            <span className="text-[11px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              REAL-TIME SYNC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any dialogue turn to seek transmission playback
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 w-36 sm:w-48"
            />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => onToggleAutoScroll(!autoScroll)}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer border ${
              autoScroll
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Auto-scroll to active speaker"
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Auto-scroll</span>
          </button>
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/40"
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No spoken segments matching "{searchQuery}"
          </div>
        ) : (
          filteredSegments.map((segment) => {
            const originalIndex = segments.findIndex(s => s.id === segment.id);
            const isActive = originalIndex === activeSegmentIndex;
            const speaker = speakers[segment.speakerId];

            return (
              <div
                key={segment.id}
                ref={isActive ? activeItemRef : null}
                onClick={() => onSeekSegment(originalIndex)}
                className={`pt-3 first:pt-0 transition-all rounded-lg p-2.5 -mx-1 cursor-pointer group ${
                  isActive
                    ? 'bg-amber-500/10 border-l-4 border-amber-500 pl-3 shadow-sm'
                    : 'hover:bg-slate-900/50'
                }`}
              >
                {/* Speaker line header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {/* Speaker Avatar initials */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {speaker?.avatar || segment.speakerName.slice(0, 2).toUpperCase()}
                    </div>

                    <span className={`text-xs font-semibold ${
                      isActive ? 'text-amber-300 font-bold' : 'text-slate-200'
                    }`}>
                      {segment.speakerName}
                    </span>

                    {/* Topic badge */}
                    {segment.topicTag && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900/80 px-1.5 py-0.2 rounded">
                        {segment.topicTag}
                      </span>
                    )}

                    {/* Emotion or FX Indicator */}
                    {segment.soundEffect && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-950/40 border border-red-900/50 px-1.5 py-0.2 rounded uppercase">
                        [{segment.soundEffect}]
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="tabular-nums">
                      {formatTimestamp(segment.timestampMs)}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLine(segment.text, segment.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-slate-300 transition-opacity p-1"
                      title="Copy line"
                    >
                      {copiedId === segment.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>

                    {isActive && isPlaying && (
                      <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Spoken Text with word legibility */}
                <p className={`text-xs sm:text-sm leading-relaxed pl-8 ${
                  isActive ? 'text-slate-100 font-medium' : 'text-slate-400 group-hover:text-slate-300'
                }`}>
                  {segment.text}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer bar */}
      <div className="p-3 bg-[#0d121c] border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between font-mono">
        <span>{segments.length} spoken dialogue segments</span>
        <span className="text-slate-400">Transcribed live from studio master feed</span>
      </div>
    </div>
  );
};

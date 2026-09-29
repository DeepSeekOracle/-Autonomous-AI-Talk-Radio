import React, { useState } from 'react';
import { RadioShow } from '../types';
import { X, ExternalLink, Check, Copy, Download, BookOpen, Key, Link2 } from 'lucide-react';

interface ShowNotesModalProps {
  show: RadioShow;
  onClose: () => void;
}

export const ShowNotesModal: React.FC<ShowNotesModalProps> = ({ show, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    const md = `# ${show.title}
Episode: #${show.episodeNumber}
Created: ${new Date(show.createdAt).toLocaleDateString()}

## Description
${show.description}

## Show Notes
${show.showNotes.map(n => `- ${n}`).join('\n')}

## Key Takeaways
${show.keyTakeaways.map(k => `- ${k}`).join('\n')}

## References
${show.references.map(r => `- [${r.title}](${r.url}) (${r.type})`).join('\n')}

## Dialogue Transcript
${show.segments.map(s => `**${s.speakerName}**: ${s.text}`).join('\n\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(show, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-episode-${show.episodeNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111726] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-[#0d121f] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                EPISODE #{show.episodeNumber}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {show.ungated ? 'UNGATED ARCHIVE' : 'STATION ARCHIVE'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-1">
              {show.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs sm:text-sm">
          
          {/* Summary */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Executive Briefing</span>
            </h3>
            <p className="text-slate-300 leading-relaxed bg-[#0b0e17] p-3.5 rounded-lg border border-slate-800/80">
              {show.description}
            </p>
          </div>

          {/* Show Notes */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Broadcast Bulletins & Show Notes
            </h3>
            <ul className="space-y-2 text-slate-300">
              {show.showNotes.map((note, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                  <span className="leading-relaxed">{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Takeaways */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Takeaways</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {show.keyTakeaways.map((takeaway, i) => (
                <div key={i} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-300 leading-relaxed">
                  {takeaway}
                </div>
              ))}
            </div>
          </div>

          {/* References */}
          {show.references && show.references.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Referenced HN Threads & Repos</span>
              </h3>
              <div className="space-y-2">
                {show.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {ref.type}
                      </span>
                      <span className="text-slate-200 group-hover:text-white font-medium text-xs">
                        {ref.title}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0d121f] flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            {show.segments.length} dialogue segments · {show.hosts.length} hosts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 hover:text-white text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Markdown' : 'Copy Notes'}</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-amber-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

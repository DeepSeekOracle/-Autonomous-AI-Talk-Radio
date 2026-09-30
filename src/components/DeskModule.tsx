/**
 * Studio Desk module — the LYGO Signal show builder, embedded and working.
 *
 * The desk (DeepSeekOracle/ai-talk-radio) is its own Space: write a 5, 10 or 15 minute roundtable,
 * voice it in the browser, download the pack. It loads only once a visitor scrolls near it, so the
 * studio page still opens light for readers who never get this far.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, RotateCw } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

/** Canonical Space the module must reflect. */
export const DESK_SPACE = 'https://huggingface.co/spaces/DeepSeekOracle/ai-talk-radio';
/** Iframe host — /embed follows the live Space app (static.hf.space). The Space chrome page is X-Frame-Options: DENY. */
export const DESK_EMBED = 'https://huggingface.co/spaces/DeepSeekOracle/ai-talk-radio/embed';
export const DESK_URL = DESK_SPACE;

export const DeskModule: React.FC = () => {
  const holder = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [frameHeight, setFrameHeight] = useState(760);

  // mount the desk only when the reader is near it
  useEffect(() => {
    const node = holder.current;
    if (!node || mounted) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setMounted(true); }),
      { rootMargin: '600px 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [mounted]);

  const fullscreen = () => holder.current?.requestFullscreen?.().catch(() => {});

  return (
    <section id="studio-desk" className="max-w-7xl mx-auto px-4 sm:px-6 mt-12">
      <div className="rounded-xl border border-slate-800/80 bg-[#0d1119] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <img src={`${BASE}brand/lygo-signal-mark.svg`} alt="" width={34} height={34} className="w-8 h-8" />
            <div>
              <div className="text-sm font-semibold text-slate-100">Studio Desk — the show builder</div>
              <div className="text-[11px] text-slate-500 font-mono uppercase tracking-[0.16em]">
                Live Space · DeepSeekOracle/ai-talk-radio
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" /> Reload
            </button>
            <button
              type="button"
              onClick={fullscreen}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Full screen
            </button>
            <a
              href={DESK_SPACE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-[#1a1408] hover:bg-amber-400 transition-colors"
            >
              Open the desk <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div ref={holder} className="bg-[#0b0e14]">
          {mounted ? (
            <iframe
              key={nonce}
              src={DESK_EMBED}
              title="LYGO Signal Studio Desk — DeepSeekOracle/ai-talk-radio"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allow="accelerometer; autoplay; camera; clipboard-write; encrypted-media; fullscreen; microphone; display-capture"
              onLoad={() => setFrameHeight(Math.max(900, Math.min(1400, window.innerHeight - 80)))}
              className="w-full block"
              style={{ height: frameHeight, border: 0 }}
            />
          ) : (
            <div className="flex items-center justify-center text-xs text-slate-500" style={{ height: 220 }}>
              Scroll a little further and the desk loads here — sign in not required.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800/80 text-[11px] text-slate-500">
          <span>
            Same live app as{' '}
            <a className="text-teal-300 hover:text-teal-200" href={DESK_SPACE} target="_blank" rel="noopener noreferrer">
              huggingface.co/spaces/DeepSeekOracle/ai-talk-radio
            </a>
            . The dock below yields the speakers when this studio is on air.
          </span>
          <a className="text-teal-300 hover:text-teal-200" href={DESK_SPACE} target="_blank" rel="noopener noreferrer">
            Not loading? Open the Space →
          </a>
        </div>
      </div>
    </section>
  );
};

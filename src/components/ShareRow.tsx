/**
 * Share row — intent URLs, no SDK, and shares always point at the canonical home rather than at
 * whichever mirror is being read.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';

const CANONICAL = 'https://chatagent.ca/talk-radio/';
export const SHARE_TITLE = 'AI Talk Radio (Ungated) — a LYGO Signal station';

const targets = (): { label: string; href: string }[] => {
  const u = encodeURIComponent(CANONICAL);
  const t = encodeURIComponent(SHARE_TITLE);
  return [
    { label: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { label: 'WhatsApp', href: `https://api.whatsapp.com/send?text=${t}%20${u}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
};

export const ShareRow: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CANONICAL);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = CANONICAL;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]" data-share-url={CANONICAL}>
      <span className="font-mono uppercase tracking-[0.18em] text-slate-500">Share</span>
      {targets().map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share AI Talk Radio on ${t.label}`}
          className="rounded-md border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
        >
          {t.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy the link to this studio"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
      >
        {copied ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      {canNative && (
        <button
          type="button"
          onClick={() => navigator.share({ title: SHARE_TITLE, url: CANONICAL }).catch(() => {})}
          aria-label="Share this studio using your device"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
        >
          <Share2 className="w-3 h-3" /> Share
        </button>
      )}
    </div>
  );
};

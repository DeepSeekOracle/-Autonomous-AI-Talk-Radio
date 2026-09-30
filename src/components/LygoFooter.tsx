/**
 * LYGO footer — house links, LYGO TV, the LYGO RADIO dock, and the ways to support the work.
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { Radio } from 'lucide-react';
import { LYGO } from '../lib/lygoBrand';
import { LygoRadioDock } from './LygoRadioDock';

const linkCls = 'text-slate-400 hover:text-teal-300 transition-colors';
const fundCls = 'text-amber-300 hover:text-amber-200 transition-colors font-medium';

export const LygoFooter: React.FC = () => (
  <footer className="border-t border-slate-800/80 bg-[#0a0d14] mt-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* brand row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src="/brand/lygo-signal-logo.svg" alt="LYGO Signal" width={208} height={58} className="h-11 w-auto" />
          <div className="text-xs text-slate-400">
            <div className="font-semibold text-slate-200">{LYGO.show}</div>
            <div className="font-mono uppercase tracking-[0.16em] text-[10px] text-amber-400/90">a {LYGO.network} station · {LYGO.descriptor}</div>
          </div>
        </div>
        <a
          href={LYGO.tv}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-teal-400/60 hover:text-teal-200 transition-colors"
        >
          <img src="/brand/lygo-tv-emblem.svg" alt="" width={18} height={18} className="h-4 w-4" />
          LYGO TV — live channels
        </a>
      </div>

      {/* the player */}
      <LygoRadioDock />

      {/* links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
        <div>
          <div className="font-mono uppercase tracking-[0.18em] text-[10px] text-slate-500 mb-2">The house</div>
          <ul className="space-y-1.5">
            <li><a className={linkCls} href={LYGO.house} target="_blank" rel="noopener noreferrer">chatagent.ca</a></li>
            <li><a className={linkCls} href={LYGO.signal} target="_blank" rel="noopener noreferrer">LYGO Signal — the show</a></li>
            <li><a className={linkCls} href={LYGO.radioPage} target="_blank" rel="noopener noreferrer">LYGO Radio — 80 tracks</a></li>
            <li><a className={linkCls} href={LYGO.tv} target="_blank" rel="noopener noreferrer">LYGO TV</a></li>
          </ul>
        </div>
        <div>
          <div className="font-mono uppercase tracking-[0.18em] text-[10px] text-slate-500 mb-2">More of the lattice</div>
          <ul className="space-y-1.5">
            <li><a className={linkCls} href={LYGO.games} target="_blank" rel="noopener noreferrer">The arcade rooms</a></li>
            <li><a className={linkCls} href={LYGO.skillHub} target="_blank" rel="noopener noreferrer">Skill hub</a></li>
            <li><a className={linkCls} href={LYGO.brandPage} target="_blank" rel="noopener noreferrer">Brand kit & naming</a></li>
          </ul>
        </div>
        <div>
          <div className="font-mono uppercase tracking-[0.18em] text-[10px] text-slate-500 mb-2">Keep it on air</div>
          <ul className="space-y-1.5">
            <li><a className={fundCls} href={LYGO.support.paypal} target="_blank" rel="noopener noreferrer">PayPal — paypal.me/ExcavationPro</a></li>
            <li><a className={fundCls} href={LYGO.support.patreon} target="_blank" rel="noopener noreferrer">Patreon — Excavationpro</a></li>
            <li><a className={linkCls} href={LYGO.support.patreonPost} target="_blank" rel="noopener noreferrer">The LYGO supporter post</a></li>
          </ul>
        </div>
      </div>

      {/* quiet info line */}
      <div className="border-t border-slate-800/70 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-slate-300">{LYGO.show}</span>
          <span>· Autonomous Digital Radio Station</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono">
          <span>Stereo AGC 24kHz</span><span>·</span>
          <span>Full-Duplex Hotline</span><span>·</span>
          <span>Zero Sponsor Restrictions</span><span>·</span>
          <span>Apache-2.0</span>
        </div>
      </div>
    </div>
  </footer>
);

'use client';

import { motion } from 'framer-motion';
import { Sparkles, MapPin, Star, ShieldCheck } from 'lucide-react';

/**
 * Premium hero showcase — a single device mockup showing the real product
 * (an AI diagnosis result), floating on a soft glow. One cohesive focal
 * object instead of a wireframe diagram.
 */
export default function HeroShowcase() {
  return (
    <div className="relative w-full max-w-sm mx-auto" aria-hidden>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 -z-10 blur-3xl opacity-50"
        style={{ background: 'radial-gradient(circle at 50% 40%, rgba(99,102,241,0.45), transparent 70%)' }}
      />

      {/* Floating accent chips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="absolute -left-6 top-20 z-20 hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl"
        style={{ background: 'rgba(20,16,31,0.9)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(8px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22c55e,#34d399)' }}>
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-[10px] font-bold" style={{ color: '#fff' }}>Payment protected</div>
          <div className="text-[9px]" style={{ color: '#9ca3af' }}>Held in escrow</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute -right-4 bottom-28 z-20 hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl"
        style={{ background: 'rgba(20,16,31,0.9)', border: '1px solid rgba(251,191,36,0.3)', backdropFilter: 'blur(8px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
      >
        <Star className="w-4 h-4" style={{ color: '#fbbf24', fill: '#fbbf24' }} />
        <span className="text-[11px] font-bold" style={{ color: '#fff' }}>4.9</span>
        <span className="text-[10px]" style={{ color: '#9ca3af' }}>· 2,400 reviews</span>
      </motion.div>

      {/* Device frame */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-[2.2rem] p-2.5"
        style={{
          background: 'linear-gradient(160deg, #1c1830, #0d0b16)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 90px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Screen */}
        <div className="rounded-[1.7rem] overflow-hidden" style={{ background: '#0a0b11', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Notch */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
          </div>

          <div className="px-4 pb-5 pt-2 space-y-3.5">
            {/* App bar */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>⚡</div>
              <span className="text-sm font-bold" style={{ color: '#fff' }}>RepairAI</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#34d399' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} /> Live
              </span>
            </div>

            {/* The user describes the problem — chat bubble (no fake photo) */}
            <div className="flex justify-end">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.45 }}
                className="max-w-[82%] px-3.5 py-2.5 rounded-2xl"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderBottomRightRadius: 6, boxShadow: '0 8px 22px -8px rgba(99,102,241,0.6)' }}
              >
                <p className="text-[11.5px] leading-snug" style={{ color: '#fff' }}>
                  Water&apos;s dripping from the pipe under my kitchen sink and the cabinet floor is wet
                </p>
              </motion.div>
            </div>

            {/* AI thinking → ready */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex items-center gap-1.5 px-1"
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-medium" style={{ color: '#818cf8' }}>RepairAI analyzed your problem</span>
            </motion.div>

            {/* Diagnosis result card */}
            <div className="rounded-2xl p-3.5 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#818cf8' }}>AI Diagnosis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc' }}>Plumbing</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.16)', color: '#fb923c' }}>Moderate</span>
              </div>
              <p className="text-[11px] leading-snug" style={{ color: '#cbd5e1' }}>
                Likely a worn supply-line seal under the sink — common and quick to fix.
              </p>
              <div className="flex items-end justify-between pt-1">
                <div>
                  <div className="text-[9px]" style={{ color: '#64748b' }}>Fair price in your area</div>
                  <div className="text-lg font-extrabold" style={{ color: '#34d399' }}>$140–$190</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px]" style={{ color: '#64748b' }}>or from</div>
                  <div className="text-xs font-bold" style={{ color: '#fff' }}>$13/mo</div>
                </div>
              </div>
            </div>

            {/* Matched pro row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex items-center gap-2.5 rounded-2xl p-2.5"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(16,185,129,0.05))', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg,#22c55e,#34d399)', color: '#fff' }}>M</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#0a0b11' }}>
                  <ShieldCheck className="w-3 h-3" style={{ color: '#34d399' }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: '#fff' }}>Mike R.</span>
                  <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#fbbf24' }}><Star className="w-2.5 h-2.5" style={{ fill: '#fbbf24' }} /> 5.0</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
                  <MapPin className="w-2.5 h-2.5" /> 1.2 mi · arrives ~30 min
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>Matched</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

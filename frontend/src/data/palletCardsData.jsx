import React from 'react';

export const PALLET_CARDS = [
  {
    id: 'card-1',
    creator: '@coplin',
    title: 'Abstract Collages',
    subtitle: 'Mixed Media Series',
    // Stage 2: Horizontal fanned row
    fan: { x: -290, y: 12, rotate: -10, scale: 1, zIndex: 10 },
    // Stage 3: Staggered lower-right E-Commerce cascade
    cascade: { x: -105, y: 155, rotate: 0, scale: 0.96, zIndex: 15 },
    artwork: (
      <div className="w-full h-full bg-gradient-to-br from-[#be123c] via-[#1f2937] to-[#10b981] p-3.5 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-rose-400/30 blur-md" />
        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded w-fit">
          01 / Print
        </span>
        <div className="bg-white/90 text-neutral-900 p-2 rounded-lg backdrop-blur-xs">
          <p className="text-[11px] font-bold leading-tight">Urban Fragments</p>
          <p className="text-[9px] text-neutral-600 mt-0.5">Limited Edition 1/50</p>
        </div>
      </div>
    ),
  },
  {
    id: 'card-2',
    creator: '@elena',
    title: 'Neon Poster Art',
    subtitle: 'Digital Typography',
    fan: { x: -175, y: 4, rotate: -6, scale: 1, zIndex: 20 },
    cascade: { x: 25, y: 195, rotate: 0, scale: 1.02, zIndex: 25 },
    artwork: (
      <div className="w-full h-full bg-[#f8fafc] border-t-8 border-[#2563eb] p-3.5 flex flex-col justify-between relative overflow-hidden">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold text-[#2563eb]">NO. 02</span>
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
        </div>
        <div className="my-auto">
          <p className="text-xl font-black tracking-tighter text-[#16a34a] leading-none">
            Net
          </p>
          <p className="text-xl font-black tracking-tighter text-[#2563eb] leading-none">
            Not
          </p>
        </div>
        <p className="text-[9px] font-medium text-neutral-500">Exhibition Poster ’26</p>
      </div>
    ),
  },
  {
    id: 'card-3',
    creator: '@marcus',
    title: 'Solar Pop Box',
    subtitle: 'Packaging & 3D',
    fan: { x: -60, y: 0, rotate: -2, scale: 1, zIndex: 25 },
    cascade: { x: 375, y: 245, rotate: 0, scale: 0.92, zIndex: 12 },
    artwork: (
      <div className="w-full h-full bg-[#facc15] p-3.5 flex flex-col justify-between relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-[#ef4444] rotate-12 mx-auto mt-2 shadow-md flex items-center justify-center">
          <div className="w-8 h-8 bg-white/90 rounded-sm" />
        </div>
        <div className="bg-white rounded-md p-2 shadow-xs">
          <p className="text-[11px] font-extrabold text-neutral-900">Studio Edition</p>
          <p className="text-[9px] text-neutral-500">Collector Box Set</p>
        </div>
      </div>
    ),
  },
  {
    id: 'card-4',
    creator: '@sora',
    title: 'Pastel Horizons',
    subtitle: 'Minimalist Canvas',
    fan: { x: 55, y: 2, rotate: 2, scale: 1, zIndex: 30 },
    cascade: { x: 150, y: 230, rotate: 0, scale: 1.0, zIndex: 30 },
    artwork: (
      <div className="w-full h-full bg-gradient-to-b from-[#fda4af] via-[#fecdd3] to-[#99f6e4] p-3.5 flex flex-col justify-between relative overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-white/60 blur-[1px] self-end" />
        <div className="bg-neutral-900/85 text-white p-2 rounded-lg">
          <p className="text-[11px] font-semibold">Dreamscape IV</p>
          <p className="text-[9px] text-neutral-300">Oil & Digital Blend</p>
        </div>
      </div>
    ),
  },
  {
    id: 'card-5',
    creator: '@howard',
    title: 'Surreal Portraits',
    subtitle: 'Classic Remix',
    fan: { x: 170, y: 6, rotate: 6, scale: 1, zIndex: 35 },
    cascade: { x: -35, y: 165, rotate: 0, scale: 1.04, zIndex: 20 },
    artwork: (
      <div className="w-full h-full bg-gradient-to-tr from-[#7f1d1d] via-[#dc2626] to-[#f97316] p-3.5 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-widest uppercase bg-black/50 px-1.5 py-0.5 rounded">
            Bosch Remix
          </span>
          <span className="text-xs font-black">66</span>
        </div>
        <div className="w-16 h-16 rounded-full bg-amber-200/30 border border-amber-100/40 mx-auto my-auto" />
        <div className="bg-black/60 backdrop-blur-xs p-2 rounded-lg">
          <p className="text-[11px] font-bold">Renaissance Pop</p>
          <p className="text-[9px] text-amber-200">Featured Curated Drop</p>
        </div>
      </div>
    ),
  },
  {
    id: 'card-6',
    creator: '@andrea',
    title: 'Emerald Street',
    subtitle: 'Cover Artwork',
    // Starts centered & slightly tilted (-12deg) in Stage 1
    initial: { x: 0, y: 38, rotate: -12, scale: 1.05, zIndex: 45 },
    fan: { x: 285, y: 12, rotate: 9, scale: 1, zIndex: 40 },
    cascade: { x: 270, y: 235, rotate: 0, scale: 0.98, zIndex: 35 },
    artwork: (
      <div className="w-full h-full bg-gradient-to-br from-[#14532d] via-[#15803d] to-[#052e16] p-3.5 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="text-[18px] font-black tracking-tighter leading-none text-white/90 drop-shadow-xs">
          ART
          <br />
          FLOW
        </div>
        <div className="flex items-center justify-between text-[9px] font-bold tracking-wider uppercase border-t border-white/25 pt-1.5">
          <span>Vol. 09</span>
          <span>★★★</span>
        </div>
      </div>
    ),
  },
];
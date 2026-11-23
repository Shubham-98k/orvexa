import React, { useState, useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from 'framer-motion';
import { User, Compass, X } from 'lucide-react';
import { PALLET_CARDS } from '../data/palletCardsData';

const NAV_LINKS = [
  'Get Started',
  'Create strategy',
  'Pricing',
  'Contact',
  'Solution',
  'E-Commerce',
];

function AnimatedShowcaseCard({ card, index, smoothProgress, onSelect }) {
  const isHeroCard = index === PALLET_CARDS.length - 1;

  // Keyframes across scroll progress:
  // [0.00 -> 0.14]: Single center card holds pose
  // [0.14 -> 0.34]: Fans out into horizontal 6-card deck
  // [0.52 -> 0.78]: Drops down and staggers into bottom-right marketplace layout
  const x = useTransform(
    smoothProgress,
    [0, 0.14, 0.34, 0.52, 0.78, 1],
    [
      isHeroCard ? card.initial.x : 0,
      isHeroCard ? 0 : 0,
      card.fan.x,
      card.fan.x,
      card.cascade.x,
      card.cascade.x,
    ]
  );

  const y = useTransform(
    smoothProgress,
    [0, 0.14, 0.34, 0.52, 0.78, 1],
    [
      isHeroCard ? card.initial.y : 42,
      isHeroCard ? 28 : 28,
      card.fan.y,
      card.fan.y,
      card.cascade.y,
      card.cascade.y,
    ]
  );

  const rotate = useTransform(
    smoothProgress,
    [0, 0.14, 0.34, 0.52, 0.78, 1],
    [
      isHeroCard ? card.initial.rotate : 0,
      isHeroCard ? -4 : 0,
      card.fan.rotate,
      card.fan.rotate,
      card.cascade.rotate,
      card.cascade.rotate,
    ]
  );

  const scale = useTransform(
    smoothProgress,
    [0, 0.14, 0.34, 0.52, 0.78, 1],
    [
      isHeroCard ? card.initial.scale : 0.78,
      isHeroCard ? 1.02 : 0.85,
      card.fan.scale,
      card.fan.scale,
      card.cascade.scale,
      card.cascade.scale,
    ]
  );

  const opacity = useTransform(
    smoothProgress,
    [0, 0.14, 0.24, 1],
    [isHeroCard ? 1 : 0, isHeroCard ? 1 : 0, 1, 1]
  );

  return (
    <motion.div
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        zIndex: card.fan.zIndex,
      }}
      whileHover={{
        y: -14,
        scale: 1.07,
        zIndex: 60,
        transition: { type: 'spring', stiffness: 320, damping: 22 },
      }}
      onClick={() => onSelect(card)}
      className="pointer-events-auto cursor-pointer absolute w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-2xl shadow-[0_14px_34px_rgba(0,0,0,0.14)] border border-black/10 overflow-hidden bg-white select-none"
      title={`${card.title} by ${card.creator}`}
    >
      {card.artwork}
    </motion.div>
  );
}

export default function PalletRossHero() {
  const containerRef = useRef(null);
  const [activeNav, setActiveNav] = useState('Create strategy');
  const [selectedCard, setSelectedCard] = useState(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Smooth spring physics so scroll scrubbing feels silky
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    mass: 0.4,
  });

  // --- ACT 1: Centered Hero Typography ("A place to display your masterpiece.") ---
  const wordMasterpieceOpacity = useTransform(smoothProgress, [0.02, 0.12], [0, 1]);
  const wordMasterpieceY = useTransform(smoothProgress, [0.02, 0.12], [14, 0]);

  const act1Opacity = useTransform(smoothProgress, [0, 0.46, 0.58], [1, 1, 0]);
  const act1Y = useTransform(smoothProgress, [0.46, 0.6], [0, -75]);
  const act1PointerEvents = useTransform(smoothProgress, (v) =>
    v > 0.55 ? 'none' : 'auto'
  );

  // Subcopy & CTA under the fanned cards in Act 1
  const subCtaOpacity = useTransform(smoothProgress, [0.24, 0.36, 0.48, 0.56], [0, 1, 1, 0]);
  const subCtaY = useTransform(smoothProgress, [0.24, 0.36], [16, 0]);

  // Creator speech bubbles (@coplin & @andrea) in Act 1
  const coplinOpacity = useTransform(smoothProgress, [0.3, 0.38, 0.48, 0.55], [0, 1, 1, 0]);
  const coplinScale = useTransform(smoothProgress, [0.3, 0.38], [0.6, 1]);

  const andreaOpacity = useTransform(smoothProgress, [0.35, 0.43, 0.48, 0.55], [0, 1, 1, 0]);
  const andreaScale = useTransform(smoothProgress, [0.35, 0.43], [0.6, 1]);

  // --- ACT 2: Left-Aligned E-Commerce Section ---
  const act2Opacity = useTransform(smoothProgress, [0.62, 0.74, 1], [0, 1, 1]);
  const act2Y = useTransform(smoothProgress, [0.62, 0.76], [36, 0]);
  const act2PointerEvents = useTransform(smoothProgress, (v) =>
    v > 0.62 ? 'auto' : 'none'
  );

  // @howard red badge above the cascaded cards in Act 2
  const howardOpacity = useTransform(smoothProgress, [0.74, 0.84], [0, 1]);
  const howardScale = useTransform(smoothProgress, [0.74, 0.84], [0.6, 1]);

  return (
    <section
      ref={containerRef}
      className="relative h-[380vh] w-full bg-[#4a4a4a] font-sans"
    >
      {/* Sticky Presentation Frame */}
      <div className="sticky top-0 h-screen w-full p-3 sm:p-6 md:p-10 flex items-center justify-center">
        <div className="w-full max-w-[1260px] h-full max-h-[800px] bg-[#f7f7f7] rounded-[20px] shadow-[0_24px_70px_rgba(0,0,0,0.32)] flex flex-col justify-between overflow-hidden relative">
          
          {/* Top Header */}
          <header className="w-full px-6 sm:px-10 pt-6 pb-3 flex items-center justify-between z-50">
            {/* Pallet Ross Brand Logo */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 text-[#18181b] font-semibold text-sm tracking-tight"
            >
              <span className="w-5 h-5 rounded-md bg-emerald-200/80 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 rotate-45" />
              </span>
              <span>Pallet Ross</span>
            </a>

            {/* Navigation Items */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-7">
              {NAV_LINKS.map((item) => {
                const isHighlighted = activeNav === item;
                return (
                  <button
                    key={item}
                    onClick={() => setActiveNav(item)}
                    className={`text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isHighlighted
                        ? 'font-semibold text-[#111111]'
                        : 'font-medium text-[#71717a] hover:text-[#18181b]'
                    }`}
                  >
                    {item === 'Create strategy' && (
                      <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[#111111] inline-block" />
                    )}
                    {item}
                  </button>
                );
              })}
            </nav>

            {/* Right Utility Icons */}
            <div className="flex items-center gap-3 text-[#71717a]">
              <button
                aria-label="Account"
                className="p-1.5 hover:text-[#111111] transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
              </button>
              <button
                aria-label="Explore"
                className="p-1.5 hover:text-[#111111] transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* STAGE CANVAS */}
          <div className="relative flex-1 w-full flex items-center justify-center px-6 sm:px-12">
            
            {/* ACT 1: Centered Hero Headline + Creator Badges + Sub CTA */}
            <motion.div
              style={{
                opacity: act1Opacity,
                y: act1Y,
                pointerEvents: act1PointerEvents,
              }}
              className="absolute inset-0 flex flex-col items-center justify-between py-6 sm:py-10 z-30"
            >
              {/* Headline */}
              <div className="text-center max-w-2xl px-4 mt-2">
                <h1 className="text-[36px] sm:text-[50px] md:text-[58px] font-medium tracking-[-0.03em] text-[#18181b] leading-[1.08]">
                  A place to display{' '}
                  <motion.span
                    style={{
                      opacity: wordMasterpieceOpacity,
                      y: wordMasterpieceY,
                    }}
                    className="inline-block text-[#3f3f46]"
                  >
                    your masterpiece.
                  </motion.span>
                </h1>
              </div>

              {/* Floating Creator Bubbles above the Fanned Cards */}
              <div className="relative w-full max-w-3xl h-12 pointer-events-none">
                <motion.div
                  style={{ opacity: coplinOpacity, scale: coplinScale }}
                  className="absolute left-[12%] sm:left-[18%] -top-4 bg-[#2563eb] text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-md"
                >
                  @coplin
                  <span className="absolute -bottom-1 right-3 w-2 h-2 bg-[#2563eb] rotate-45" />
                </motion.div>

                <motion.div
                  style={{ opacity: andreaOpacity, scale: andreaScale }}
                  className="absolute right-[12%] sm:right-[18%] -top-2 bg-[#6ee7b7] text-[#064e3b] text-[11px] font-semibold px-3 py-1 rounded-full shadow-md"
                >
                  @andrea
                  <span className="absolute -bottom-1 left-3 w-2 h-2 bg-[#6ee7b7] rotate-45" />
                </motion.div>
              </div>

              {/* Bottom Subtext & CTA Buttons */}
              <motion.div
                style={{ opacity: subCtaOpacity, y: subCtaY }}
                className="flex flex-col items-center text-center gap-4 mb-2"
              >
                <p className="text-[11px] sm:text-xs text-[#52525b] max-w-md">
                  Artists can display their masterpieces, and buyers can discover and
                  collect original works.
                </p>
                <div className="flex items-center gap-3">
                  <button className="bg-[#18181b] hover:bg-[#27272a] text-white text-[11px] font-medium px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer">
                    Join for $9.99/m
                  </button>
                  <button className="bg-[#e4e4e7]/70 hover:bg-[#e4e4e7] text-[#3f3f46] text-[11px] font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
                    Read more
                  </button>
                </div>
              </motion.div>
            </motion.div>

            {/* ACT 2: Left-Aligned E-Commerce Editorial Copy */}
            <motion.div
              style={{
                opacity: act2Opacity,
                y: act2Y,
                pointerEvents: act2PointerEvents,
              }}
              className="absolute inset-0 flex items-center px-6 sm:px-14 md:px-20 z-30"
            >
              <div className="max-w-md space-y-5 -mt-12">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#71717a]">
                  E - C O M M E R C E
                </p>
                <h2 className="text-[34px] sm:text-[44px] md:text-[50px] font-medium tracking-[-0.03em] text-[#18181b] leading-[1.08]">
                  Showcase, Sell, &amp; acquire arts to our{' '}
                  <span className="text-[#71717a]">marketplace.</span>
                </h2>
                <p className="text-xs sm:text-[13px] text-[#52525b] leading-relaxed max-w-sm">
                  Dynamic community where artists and buyers seamlessly merge.
                  ArtFusion brings together creators and collectors in one living gallery.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button className="bg-[#18181b] hover:bg-[#27272a] text-white text-[11px] font-medium px-5 py-2.5 rounded-full shadow-sm transition-colors cursor-pointer">
                    Join for $9.99/m
                  </button>
                  <button className="bg-[#e4e4e7]/80 hover:bg-[#e4e4e7] text-[#3f3f46] text-[11px] font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer">
                    Read more
                  </button>
                </div>
              </div>
            </motion.div>

            {/* SHARED INTERACTIVE CARD DECK (Fanned Center -> Cascaded Bottom-Right) */}
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-20">
              {/* @howard badge in Act 2 */}
              <motion.div
                style={{ opacity: howardOpacity, scale: howardScale }}
                className="absolute translate-x-[-35px] translate-y-[32px] bg-[#991b1b] text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-md z-40"
              >
                @howard
                <span className="absolute -bottom-1 left-4 w-2 h-2 bg-[#991b1b] rotate-45" />
              </motion.div>

              {PALLET_CARDS.map((card, index) => (
                <AnimatedShowcaseCard
                  key={card.id}
                  card={card}
                  index={index}
                  smoothProgress={smoothProgress}
                  onSelect={setSelectedCard}
                />
              ))}
            </div>
          </div>

          {/* Click-to-Inspect Card Detail Drawer/Modal */}
          <AnimatePresence>
            {selectedCard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-black/10 shadow-xl rounded-2xl px-5 py-3.5 flex items-center gap-4 z-50 max-w-md w-[90%]"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-black/10">
                  {selectedCard.artwork}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 truncate">
                      {selectedCard.title}
                    </h3>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {selectedCard.creator}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {selectedCard.subtitle} — Click any card to edit its copy in{' '}
                    <code className="text-[11px] bg-neutral-100 px-1 rounded">
                      palletCardsData.jsx
                    </code>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 cursor-pointer"
                  aria-label="Close card preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
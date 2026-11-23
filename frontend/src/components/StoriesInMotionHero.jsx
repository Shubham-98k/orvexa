import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DOODLES } from './DoodleLetters';
import { OrvexaNewspaperBadge } from './OrvexaNewspaperBadge';
import { FloatingSocialCollage } from './FloatingSocialCollage';
import { STORY_CARDS } from '../data/storyCardsData';

// 1. Add at the top of src/components/StoriesInMotionHero.jsx:
import card1Video from '../assets/card1-video.mp4';

const coverModules = import.meta.glob('../assets/card1-cover.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});
const card1Cover = Object.values(coverModules)[0];

const NAV_ITEMS = ['Discover', 'Ideas', 'Knowledge', 'Circles'];

const PHRASE_TOKENS = [
  { char: 'o', doodleIdx: 0 },
  { char: 'r', doodleIdx: 1 },
  { char: 'v', doodleIdx: 2 },
  { char: 'e', doodleIdx: 3 },
  { char: 'x', doodleIdx: 4 },
  { char: 'a', doodleIdx: 5 },
];

// 2. Replace FullPageCard1Video in src/components/StoriesInMotionHero.jsx:
function FullPageCard1Video({ smoothProgress }) {
  const videoRef = useRef(null);
  const hasPlayedRef = useRef(false);
  const playPromiseRef = useRef(null);

  // Matches card1InfoOpacity so the full-screen video stays visible the entire time 01/DISCOVER is on screen
  const opacity = useTransform(
    smoothProgress,
    [0.12, 0.22, 0.45, 0.52],
    [0, 1, 1, 0]
  );
  const scale = useTransform(smoothProgress, [0.12, 0.24], [0.45, 1]);
  const borderRadius = useTransform(smoothProgress, [0.12, 0.24], [28, 0]);
  const y = useTransform(smoothProgress, [0.12, 0.24], [160, 0]);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasPlayedRef.current || playPromiseRef.current) return;

    video.muted = true;
    const promise = video.play();
    if (promise !== undefined) {
      playPromiseRef.current = promise;
      promise
        .then(() => {
          hasPlayedRef.current = true;
          playPromiseRef.current = null;
        })
        .catch(() => {
          playPromiseRef.current = null;
        });
    } else {
      hasPlayedRef.current = true;
    }
  }, []);

  const resetPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const doReset = () => {
      hasPlayedRef.current = false;
      video.pause();
      video.currentTime = 0;
    };

    if (playPromiseRef.current) {
      playPromiseRef.current.then(doReset).catch(doReset);
    } else {
      doReset();
    }
  }, []);

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    if (latest >= 0.14 && latest <= 0.5) {
      startPlayback();
    } else if (latest < 0.08) {
      resetPlayback();
    }
  });

  const handleVideoEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    if (Number.isFinite(video.duration) && video.duration > 0.05) {
      video.currentTime = Math.max(0, video.duration - 0.04);
    }
  };

  return (
    <motion.div
      style={{
        opacity,
        scale,
        y,
        borderRadius,
        zIndex: 25,
      }}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-[#1B8AD9]"
    >
      {/* Fallback cover image underneath so it is never white/blank */}
      {card1Cover && (
        <img
          src={card1Cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      )}

      <video
        ref={videoRef}
        src={card1Video}
        poster={card1Cover}
        muted
        playsInline
        preload="auto"
        onLoadedData={() => {
          const current = smoothProgress.get();
          if (current >= 0.14 && current <= 0.5) {
            startPlayback();
          }
        }}
        onEnded={handleVideoEnded}
        className="relative w-full h-full object-cover object-center"
      />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 via-white/25 to-transparent" />
    </motion.div>
  );
}

function AlternatingStageCard({ card, index, smoothProgress }) {
  const centerFanX = card.fan.xOffset * 0.85;

  // Card 1: rises from center fan and morphs into the full-page video (fades into full-screen video at 0.24)
  // Card 2: stays tucked until 0.38 -> sweeps to RIGHT (+260) -> exits right (+560)
  // Card 3: stays tucked until 0.64 -> sweeps to CENTER (0)
  const keyframeConfig = [
    {
      input: [0, 0.1, 0.2, 0.26, 0.52],
      x: [centerFanX, 0, 0, 0, 0],
      y: [card.fan.yOffset, -40, -140, -180, -180],
      rotate: [card.fan.rotate, 0, 0, 0, 0],
      scale: [0.95, 1.15, 1.55, 1.8, 1.8],
      opacity: [1, 1, 0.4, 0, 0],
    },
    {
      input: [0, 0.12, 0.36, 0.5, 0.62, 0.7, 0.8],
      x: [centerFanX, 0, 0, -75, 260, 260, 560],
      y: [card.fan.yOffset, 220, 220, -70, -145, -145, -240],
      rotate: [card.fan.rotate, 0, 0, 14, 4, 4, 18],
      scale: [0.95, 0.88, 0.88, 1.08, 1.16, 1.16, 0.9],
      opacity: [1, 0, 0, 1, 1, 1, 0],
    },
    {
      input: [0, 0.12, 0.64, 0.77, 0.88, 1],
      x: [centerFanX, 0, 0, 95, 0, 0],
      y: [card.fan.yOffset, 220, 220, -85, -145, -145],
      rotate: [card.fan.rotate, 0, 0, -12, 0, 0],
      scale: [0.95, 0.88, 0.88, 1.08, 1.16, 1.16],
      opacity: [1, 0, 0, 1, 1, 1],
    },
  ][index];

  const x = useTransform(smoothProgress, keyframeConfig.input, keyframeConfig.x);
  const y = useTransform(smoothProgress, keyframeConfig.input, keyframeConfig.y);
  const rotate = useTransform(
    smoothProgress,
    keyframeConfig.input,
    keyframeConfig.rotate
  );
  const scale = useTransform(
    smoothProgress,
    keyframeConfig.input,
    keyframeConfig.scale
  );
  const opacity = useTransform(
    smoothProgress,
    keyframeConfig.input,
    keyframeConfig.opacity
  );

  return (
    <motion.article
      initial={{ y: 180, opacity: 0 }}
      animate={{ y: card.fan.yOffset, opacity: 1 }}
      transition={{
        delay: 0.14 + index * 0.07,
        type: 'spring',
        stiffness: 160,
        damping: 20,
      }}
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        zIndex: 30 + index,
      }}
      className="pointer-events-none absolute bottom-[-30px] w-44 h-52 sm:w-52 sm:h-60 md:w-56 md:h-64 rounded-2xl shadow-[0_20px_44px_rgba(35,31,32,0.18)] overflow-hidden bg-transparent flex flex-col"
    >
      <div className="relative w-full h-full flex-1 overflow-hidden">
        {card.artwork}
      </div>
    </motion.article>
  );
}

export default function StoriesInMotionHero() {
  const [activeNav, setActiveNav] = useState('Explore');
  const [stages, setStages] = useState(() => PHRASE_TOKENS.map(() => 'letter'));
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 115,
    damping: 24,
    mass: 0.45,
  });

  // Left-side frosted glass hero card slides upward on scroll
  const heroExitY = useTransform(smoothProgress, [0, 0.22], [0, -230]);
  const heroExitOpacity = useTransform(smoothProgress, [0, 0.18], [1, 0]);
  const heroPointerEvents = useTransform(smoothProgress, (v) =>
    v > 0.18 ? 'none' : 'auto'
  );

  // Stage 1: Card 1 Full-Page Video + Frosted-Glass Text on RIGHT
  const card1InfoOpacity = useTransform(
    smoothProgress,
    [0.24, 0.32, 0.42, 0.48],
    [0, 1, 1, 0]
  );
  const card1InfoY = useTransform(
    smoothProgress,
    [0.24, 0.32, 0.42, 0.48],
    [28, 0, 0, -24]
  );

  // Stage 2: Card 2 on RIGHT, Details on LEFT
  const card2InfoOpacity = useTransform(
    smoothProgress,
    [0.52, 0.61, 0.69, 0.76],
    [0, 1, 1, 0]
  );
  const card2InfoY = useTransform(
    smoothProgress,
    [0.52, 0.61, 0.69, 0.76],
    [28, 0, 0, -24]
  );
  const card2CurveLength = useTransform(smoothProgress, [0.4, 0.62], [0, 1]);

  // Stage 3: Card 3 in CENTER, Details split LEFT & RIGHT
  const card3InfoOpacity = useTransform(smoothProgress, [0.8, 0.89, 1], [0, 1, 1]);
  const card3InfoY = useTransform(smoothProgress, [0.8, 0.89, 1], [28, 0, 0]);
  const card3CurveLength = useTransform(smoothProgress, [0.68, 0.88], [0, 1]);

  // Bottom step dots
  const dotsOpacity = useTransform(smoothProgress, [0.22, 0.3], [0, 1]);
  const dot1Scale = useTransform(smoothProgress, [0.2, 0.34, 0.46], [1, 1.45, 1]);
  const dot2Scale = useTransform(smoothProgress, [0.48, 0.62, 0.74], [1, 1.45, 1]);
  const dot3Scale = useTransform(smoothProgress, [0.76, 0.9, 1], [1, 1.45, 1.45]);
  const dotScales = [dot1Scale, dot2Scale, dot3Scale];

  const runMorphSequence = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    setStages(PHRASE_TOKENS.map(() => 'hidden'));

    const timers = [];

    PHRASE_TOKENS.forEach((_, idx) => {
      const stepDelay = idx * 105;

      timers.push(
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[idx] = 'doodle';
            return next;
          });
        }, 120 + stepDelay)
      );

      timers.push(
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[idx] = 'letter';
            return next;
          });
        }, 640 + stepDelay)
      );
    });

    timers.push(
      setTimeout(() => {
        setIsAnimating(false);
      }, 720 + PHRASE_TOKENS.length * 105)
    );

    return () => timers.forEach(clearTimeout);
  }, [isAnimating]);

  useEffect(() => {
    const cleanup = runMorphSequence();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToStep = (fraction) => {
    if (!sectionRef.current) return;
    const top = sectionRef.current.offsetTop;
    const height = sectionRef.current.offsetHeight - window.innerHeight;
    window.scrollTo({
      top: top + height * fraction,
      behavior: 'smooth',
    });
  };

  const [card1, card2, card3] = STORY_CARDS;

  return (
    <section
      ref={sectionRef}
      className="relative h-[460vh] w-full bg-white text-[#231F20] font-sans"
    >
      {/* Sticky Viewport Stage */}
      <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden">
        
        {/* HOMEPAGE FULL-BLEED FLIPPED BACKGROUND IMAGE */}
        <FloatingSocialCollage smoothProgress={smoothProgress} />

        {/* CARD 1 FULL-PAGE VIDEO (Plays once on scroll & holds final frame) */}
        <FullPageCard1Video smoothProgress={smoothProgress} />

        {/* Top Navigation Bar */}
        <header className="w-full max-w-[1360px] mx-auto px-6 sm:px-12 pt-6 pb-3 flex items-center justify-between z-50">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActiveNav('Explore');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              runMorphSequence();
            }}
            className="flex items-center gap-2.5 group focus:outline-none bg-white/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/60 shadow-2xs"
            aria-label="Orvexa Home"
          >
            <OrvexaNewspaperBadge className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
          </a>

          <nav className="hidden md:flex items-center gap-7 lg:gap-8 bg-white/75 backdrop-blur-md px-6 py-2 rounded-full border border-white/60 shadow-2xs">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item;
              return (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`text-[13px] tracking-tight transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? 'font-semibold text-[#231F20]'
                      : 'font-medium text-[#3F3B39] hover:text-[#231F20]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </nav>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => scrollToStep(0.35)}
            className="bg-[#23272A] hover:bg-[#141719] text-white text-[12px] font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-[0_3px_0_#000000] transition-colors cursor-pointer"
          >
            <span>Start Writing</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
          </motion.button>
        </header>

        {/* LAYER 1: Left-Aligned Frosted-Glass Text Box Floating Over Homepage Background */}
        <div className="flex-1 w-full max-w-[1360px] mx-auto px-6 sm:px-12 flex items-center z-30 pointer-events-none">
          <motion.main
            style={{
              y: heroExitY,
              opacity: heroExitOpacity,
              pointerEvents: heroPointerEvents,
            }}
            className="w-full max-w-[600px] mb-20 sm:mb-24 bg-white/70 backdrop-blur-md border border-white/75 shadow-[0_20px_50px_rgba(20,20,20,0.1)] rounded-[28px] p-6 sm:p-9 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.18em] uppercase text-[#2A2827] mb-3.5">
              EARLY ACCESS
            </span>

            {/* Coral App Icon + Doodle-Morphing "orvexa" Wordmark */}
            <div
              onClick={runMorphSequence}
              title="Click to replay doodle animation"
              className="cursor-pointer select-none flex items-center justify-center lg:justify-start gap-3.5 sm:gap-5 mb-4"
            >
              <motion.div
                whileHover={{ rotate: -4, scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <OrvexaNewspaperBadge className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 drop-shadow-[0_6px_14px_rgba(238,93,59,0.22)]" />
              </motion.div>

              <h1
                aria-label="orvexa"
                className="flex items-center justify-center text-[52px] sm:text-[72px] md:text-[82px] font-black tracking-[-0.045em] text-[#1A1817] leading-none"
              >
                {PHRASE_TOKENS.map((token, index) => {
                  const stage = stages[index];
                  const DoodleComponent = DOODLES[token.doodleIdx];

                  return (
                    <span
                      key={index}
                      className="relative inline-flex items-center justify-center min-w-[0.44em] h-[1.1em]"
                    >
                      <AnimatePresence mode="popLayout">
                        {stage === 'doodle' && (
                          <motion.span
                            key="doodle"
                            initial={{ scale: 0.2, opacity: 0, rotate: -18, y: 10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
                            exit={{ scale: 0.4, opacity: 0, rotate: 12, y: -8 }}
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 20,
                            }}
                            className="inline-flex items-center justify-center px-0.5"
                          >
                            <DoodleComponent />
                          </motion.span>
                        )}

                        {stage === 'letter' && (
                          <motion.span
                            key="letter"
                            initial={{ scale: 0.5, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 380,
                              damping: 24,
                            }}
                            className="inline-block"
                          >
                            {token.char}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  );
                })}
              </h1>
            </div>

            {/* Editorial Serif Headline */}
            <h2
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              className="text-[28px] sm:text-[36px] md:text-[20px] font-extrabold tracking-[-0.025em] text-[#111111] leading-[1.1]"
            >
              Discover Ideas,{' '}
              <span className="italic font-light">Connect</span>{' '}
              Perspectives.
            </h2>

            {/* Supporting Subcopy */}
            <p
              style={{ fontFamily: '"Inter", sans-serif' }}
              className="mt-3 text-[12.5px] sm:text-[14px] font-normal tracking-[-0.015em] text-[#1F1D1C] leading-[1.45]"
            >
              Explore content from across the world, share what you think, and build on ideas with people who see things differently. Turn everyday discoveries and conversations into something worth keeping.
            </p>
          </motion.main>
        </div>

        {/* LAYER 2: Hand-Drawn Curved Motion Paths & Pastel Backdrop Tiles (Stages 2 & 3) */}
        <div
          style={{ zIndex: 20 }}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <svg
            viewBox="0 0 1200 700"
            className="w-full h-full max-w-[1280px] overflow-visible"
          >
            <motion.path
              d="M 460 520 C 600 410, 770 360, 955 470"
              fill="none"
              stroke="#231F20"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                pathLength: card2CurveLength,
                opacity: card2InfoOpacity,
              }}
            />
            <motion.path
              d="M 760 320 C 680 430, 560 470, 465 440"
              fill="none"
              stroke="#231F20"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                pathLength: card3CurveLength,
                opacity: card3InfoOpacity,
              }}
            />
          </svg>

          <motion.div
            style={{ opacity: card2InfoOpacity }}
            className="hidden md:block absolute right-[18%] top-[39%] w-56 h-64 rounded-2xl bg-[#E5DFF5]/85 -z-10"
          />
          <motion.div
            style={{ opacity: card3InfoOpacity }}
            className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[39%] w-56 h-64 rounded-2xl bg-[#F6DFC9]/85 -z-10"
          />
        </div>

        {/* LAYER 3: Alternating Card Information Panels */}
        <div
          style={{ zIndex: 35 }}
          className="absolute inset-0 max-w-[1160px] mx-auto px-6 sm:px-12 pointer-events-none"
        >
          {/* STAGE 1 DETAILS: Frosted-Glass Blurred Backdrop Panel Floating Over Full-Page Video */}
          <motion.div
            style={{ opacity: card1InfoOpacity, y: card1InfoY }}
            className="absolute right-6 sm:right-12 top-1/2 -translate-y-1/2 w-full max-w-[500px] bg-white/75 backdrop-blur-md border border-white/85 shadow-[0_24px_60px_rgba(20,20,20,0.14)] rounded-[28px] p-6 sm:p-9 space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-[#231F20]/15 shadow-2xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: card1.accentColor }}
              />
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                {card1.step}
              </span>
            </div>
            <h3
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              className="text-[32px] sm:text-[42px] font-extrabold tracking-[-0.025em] text-[#111111] leading-[1.1]"
            >
              {card1.heading}{' '}
              <span className="italic font-semibold">{card1.italicWord}.</span>
            </h3>
            <p className="text-sm sm:text-[15px] text-[#262322] leading-relaxed">
              {card1.description}
            </p>
            <ul className="space-y-2.5 pt-1">
              {card1.highlights.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2.5 text-xs sm:text-[13px] font-medium text-[#1A1817]"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: card1.backdropColor,
                      color: card1.accentColor,
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* STAGE 2 DETAILS: LEFT */}
          <motion.div
            style={{ opacity: card2InfoOpacity, y: card2InfoY }}
            className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 w-full md:w-[46%] space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#231F20]/15">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: card2.accentColor }}
              />
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                {card2.step}
              </span>
            </div>
            <h3
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              className="text-[32px] sm:text-[42px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.1]"
            >
              {card2.heading}{' '}
              <span className="italic font-semibold">{card2.italicWord}.</span>
            </h3>
            <p className="text-sm sm:text-[15px] text-[#3B3836] leading-relaxed max-w-md">
              {card2.description}
            </p>
            <ul className="space-y-2 pt-1">
              {card2.highlights.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2.5 text-xs sm:text-[13px] font-medium text-[#231F20]"
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: card2.backdropColor,
                      color: card2.accentColor,
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* STAGE 3 DETAILS: SPLIT LEFT & RIGHT */}
          <motion.div
            style={{ opacity: card3InfoOpacity, y: card3InfoY }}
            className="hidden md:flex items-center justify-between w-full h-full"
          >
            <div className="w-[30%] space-y-3 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#231F20]/15">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: card3.accentColor }}
                />
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                  {card3.step}
                </span>
              </div>
              <h3
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                className="text-[34px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.1]"
              >
                {card3.heading}{' '}
                <span className="italic font-semibold">{card3.italicWord}.</span>
              </h3>
              <p className="text-[13px] text-[#3B3836] leading-relaxed">
                {card3.description}
              </p>
            </div>

            <div className="w-[30%] space-y-4 text-left">
              {card3.highlights.map((point, i) => (
                <div
                  key={point}
                  className="p-3.5 rounded-xl bg-white/85 border border-[#231F20]/15 shadow-2xs"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#EE5D3B] block mb-1">
                    Highlight 0{i + 1}
                  </span>
                  <p className="text-xs font-semibold text-[#231F20] leading-snug">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bottom Step Dots */}
          <motion.div
            style={{ opacity: dotsOpacity }}
            className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-[#231F20]/10 shadow-xs"
          >
            {[
              { label: '01', fraction: 0.35 },
              { label: '02', fraction: 0.62 },
              { label: '03', fraction: 0.9 },
            ].map((step, idx) => (
              <button
                key={step.label}
                onClick={() => scrollToStep(step.fraction)}
                aria-label={`Jump to card ${step.label}`}
                className="p-1 cursor-pointer focus:outline-none"
              >
                <motion.span
                  style={{ scale: dotScales[idx] }}
                  className="block w-2 h-2 rounded-full bg-[#231F20]"
                />
              </button>
            ))}
          </motion.div>
        </div>

        {/* LAYER 4: Bottom 3 Cards Centered in the Middle of the Page */}
        <div className="relative w-full h-36 sm:h-40 md:h-44 flex justify-center items-end overflow-visible select-none pointer-events-none z-40">
          <div className="relative w-full max-w-4xl h-full flex justify-center items-end">
            {STORY_CARDS.map((card, index) => (
              <AlternatingStageCard
                key={card.id}
                card={card}
                index={index}
                smoothProgress={smoothProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
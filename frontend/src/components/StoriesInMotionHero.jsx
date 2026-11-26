import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
} from 'framer-motion';
import { ArrowRight, Sparkles, Menu, X } from 'lucide-react';
import { DOODLES } from './DoodleLetters';
import { OrvexaNewspaperBadge } from './OrvexaNewspaperBadge';
import { FloatingSocialCollage } from './FloatingSocialCollage';
import card1Video from '../assets/card1-video.mp4';
import scroll1 from '../assets/scroll3.jpg';
import scroll2 from '../assets/scroll2.mp4';
import scroll3 from '../assets/scroll3.mp4';
import scroll4 from '../assets/scroll4.mp4';


// Automatically resolves card1-cover.jpeg, card1-cover.jpg, or card1-cover.png
const coverModules = import.meta.glob('../assets/card1-cover.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});
const card1Cover = Object.values(coverModules)[0];

const NAV_ITEMS = ['Explore', 'Publications', 'Writers', 'Topics', 'Membership'];

const NAV_TARGETS = {
  Explore: 0,
  Publications: 0.52,
  Writers: 0.72,
  Topics: 0.92,
  Membership: 1.0,
};

const PHRASE_TOKENS = [
  { char: 'o', doodleIdx: 0 },
  { char: 'r', doodleIdx: 1 },
  { char: 'v', doodleIdx: 2 },
  { char: 'e', doodleIdx: 3 },
  { char: 'x', doodleIdx: 4 },
  { char: 'a', doodleIdx: 5 },
];

// 3 large, varied-size frames scattered cleanly around the TOP-RIGHT text card (never behind it)
const PAGE1_SCATTERED_FRAMES = [
  {
    id: 'frame-1',
    type: 'video',
    src: card1Video,
    poster: card1Cover,
    alt: 'Large top-left landscape frame',
    positionClass: 'top-[11%] left-[4%] sm:left-[6%] w-[260px] sm:w-[360px] md:w-[430px] aspect-[16/10]',
    tilt: -4,
    floatY: [-7, 7, -7],
    duration: 5.4,
    delay: 0,
    zIndex: 13,
  },
  {
    id: 'frame-2',
    type: 'video',
    src: scroll2,
    alt: 'Large center-left portrait frame',
    // Lowered slightly and zIndex: 18 so it sits cleanly on top of the yellow frame
    positionClass: 'top-[24%] left-[35%] sm:left-[38%] w-[200px] sm:w-[260px] md:w-[270px] aspect-[3/4]',
    tilt: 3.5,
    floatY: [7, -7, 7],
    duration: 5.0,
    delay: 0.25,
    zIndex: 18,
  },
  {
    id: 'frame-3',
    type: 'image',
    src: scroll1,
    alt: 'Large bottom-left square frame',
    // Expanded horizontally along the bottom-left underneath the purple frame (zIndex: 14)
    positionClass: 'bottom-[5%] left-[3%] sm:left-[5%] w-[340px] sm:w-[490px] md:w-[590px] aspect-[16/8.5]',
    tilt: -3.5,
    floatY: [-6, 8, -6],
    duration: 5.7,
    delay: 0.15,
    zIndex: 14,
  },
];

// Page 2: 2 VERY BIG, FRAMELESS floating media pieces on the #9333EA purple background
const PAGE2_FRAMELESS_MEDIA = [
  {
    id: 'p2-media-2',
    type: 'video',
    src: scroll4,
    alt: 'Large wide and tall frameless preview on the left',
// Balanced size on the right side with generous purple breathing room around all edges
    positionClass: 'top-[15%] right-[5%] sm:right-[7%] w-[300px] sm:w-[440px] md:w-[720px] h-[75vh] max-h-[680px]',
    tilt: 2,
    floatY: [-7, 7, -7],
    duration: 5.6,
    delay: 0,
    zIndex: 15,
  },
];

// Additional 2 scroll pages (Pages 3 and 4)
const EXTRA_SCROLL_PAGES = [
  {
    id: 'page-3',
    step: '03 / CONNECT',
    heading: 'Build on ideas',
    italicWord: 'together',
    description:
      'Highlight passages, spark meaningful replies, and link related viewpoints with readers who see the world differently.',
    accentColor: '#EE5D3B',
    backdropColor: '#FAD7C8',
    highlights: [
      'Inline passage highlights and threaded replies',
      'Turn everyday conversations into lasting knowledge',
    ],
    badgeTitle: 'Living Threads',
    badgeSubtitle: 'Branching perspectives attached right to the text',
  },
  {
    id: 'page-4',
    step: '04 / CURATE',
    heading: 'Save what sparks',
    italicWord: 'curiosity',
    description:
      'Collect articles, clips, and notes into living boards you can revisit anytime or share with your community.',
    accentColor: '#2B7A78',
    backdropColor: '#CBECE0',
    highlights: [
      'Smart collections across topics, authors, and media',
      'Private or public shelves built for deep recall',
    ],
    badgeTitle: 'Personal Library',
    badgeSubtitle: 'Every discovery organized and searchable forever',
  },
];

function ScatteredMediaFrame({ frame, frameless = false }) {
  return (
    <motion.div
      animate={{
        y: frame.floatY,
        rotate: [frame.tilt - 1.1, frame.tilt + 1.1, frame.tilt - 1.1],
      }}
      transition={{
        duration: frame.duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: frame.delay,
      }}
      whileHover={{ scale: 1.03, rotate: 0, zIndex: 25 }}
      style={{ zIndex: frame.zIndex }}
      className={
        frameless
          ? `absolute ${frame.positionClass} rounded-[28px] overflow-hidden shadow-[0_28px_65px_rgba(32,6,64,0.38)] transition-shadow hover:shadow-[0_34px_75px_rgba(32,6,64,0.5)] pointer-events-auto`
          : `absolute ${frame.positionClass} rounded-[28px] p-2.5 bg-white/95 backdrop-blur-xs border border-white shadow-[0_24px_52px_rgba(140,34,88,0.18)] transition-shadow hover:shadow-[0_30px_64px_rgba(140,34,88,0.28)] pointer-events-auto`
      }
    >
      <div
        className={
          frameless
            ? 'w-full h-full overflow-hidden relative'
            : 'w-full h-full rounded-[20px] overflow-hidden bg-[#FFD6EA] relative'
        }
      >
        {frame.type === 'video' ? (
          <video
            src={frame.src}
            poster={frame.poster}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={frame.src}
            alt={frame.alt}
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </motion.div>
  );
}

export default function StoriesInMotionHero() {
  const [activeNav, setActiveNav] = useState('Explore');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stages, setStages] = useState(() => PHRASE_TOKENS.map(() => 'letter'));
  const [isAnimating, setIsAnimating] = useState(false);
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Silky spring damping so color washes and transitions never feel abrupt
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 72,
    damping: 26,
    mass: 0.65,
  });

  // CONTINUOUS AMBIENT BACKGROUND COLOR BLENDING ACROSS ALL 5 STAGES
  // Hero (#FFFFFF) -> Page 1 (#FF8EC4 Pink) -> Page 2 (#9333EA Vibrant Purple) -> Page 3 (#FDECE6 Peach) -> Page 4 (#E4F4ED Mint)
  const stageBackgroundColor = useTransform(
    smoothProgress,
    [0, 0.08, 0.22, 0.36, 0.46, 0.58, 0.68, 0.79, 0.88, 1],
    [
      '#FFFFFF',
      '#FFF3F8',
      '#FF8EC4',
      '#FF8EC4',
      '#9333EA',
      '#9333EA',
      '#FDECE6',
      '#FDECE6',
      '#E4F4ED',
      '#E4F4ED',
    ]
  );

  // Soft ambient radial color glow that deepens during color blends
  const ambientGlowOpacity = useTransform(
    smoothProgress,
    [0, 0.14, 0.25, 0.4, 0.65, 0.9],
    [0, 0.45, 0.7, 0.35, 0.5, 0.5]
  );

  // HERO (0.00 -> 0.20): Gentle upward drift & gradual dissolve
  const heroExitY = useTransform(smoothProgress, [0, 0.2], [0, -140]);
  const heroExitOpacity = useTransform(smoothProgress, [0, 0.06, 0.19], [1, 0.95, 0]);
  const heroPointerEvents = useTransform(smoothProgress, (v) =>
    v > 0.16 ? 'none' : 'auto'
  );

  // SCROLL PAGE 1 (0.14 -> 0.43): Staggered entrance so pink wash blends first, then frames, then top-right text
  const p1FramesOpacity = useTransform(
    smoothProgress,
    [0.14, 0.25, 0.35, 0.43],
    [0, 1, 1, 0]
  );
  const p1FramesScale = useTransform(
    smoothProgress,
    [0.14, 0.25, 0.35, 0.43],
    [0.93, 1, 1, 0.96]
  );
  const p1ContentOpacity = useTransform(
    smoothProgress,
    [0.17, 0.27, 0.35, 0.42],
    [0, 1, 1, 0]
  );
  const p1ContentY = useTransform(
    smoothProgress,
    [0.17, 0.27, 0.35, 0.42],
    [34, 0, 0, -28]
  );
  const p1PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.17 && v <= 0.41 ? 'auto' : 'none'
  );

  // SCROLL PAGE 2 (0.39 -> 0.64): Purple Canvas (#9333EA) + Top-Left Blurred Content + 2 Big Frameless Media Items
  const p2MediaOpacity = useTransform(
    smoothProgress,
    [0.39, 0.47, 0.56, 0.64],
    [0, 1, 1, 0]
  );
  const p2MediaScale = useTransform(
    smoothProgress,
    [0.39, 0.47, 0.56, 0.64],
    [0.93, 1, 1, 0.96]
  );
  const p2ContentOpacity = useTransform(
    smoothProgress,
    [0.41, 0.49, 0.56, 0.63],
    [0, 1, 1, 0]
  );
  const p2ContentY = useTransform(
    smoothProgress,
    [0.41, 0.49, 0.56, 0.63],
    [34, 0, 0, -28]
  );
  const p2PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.41 && v <= 0.62 ? 'auto' : 'none'
  );

  // SCROLL PAGE 3 (0.60 -> 0.84): Wide crossfade overlap with Page 2
  const p3Opacity = useTransform(smoothProgress, [0.6, 0.68, 0.76, 0.84], [0, 1, 1, 0]);
  const p3Y = useTransform(smoothProgress, [0.6, 0.68, 0.76, 0.84], [40, 0, 0, -40]);
  const p3PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.62 && v <= 0.82 ? 'auto' : 'none'
  );

  // SCROLL PAGE 4 (0.80 -> 1.00): Wide crossfade overlap with Page 3
  const p4Opacity = useTransform(smoothProgress, [0.8, 0.88, 1], [0, 1, 1]);
  const p4Y = useTransform(smoothProgress, [0.8, 0.88, 1], [40, 0, 0]);
  const p4PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.82 ? 'auto' : 'none'
  );

  // Bottom 4-page step indicator
  const dotsOpacity = useTransform(smoothProgress, [0.16, 0.24], [0, 1]);
  const dot1Scale = useTransform(smoothProgress, [0.16, 0.29, 0.41], [1, 1.45, 1]);
  const dot2Scale = useTransform(smoothProgress, [0.41, 0.52, 0.62], [1, 1.45, 1]);
  const dot3Scale = useTransform(smoothProgress, [0.62, 0.72, 0.82], [1, 1.45, 1]);
  const dot4Scale = useTransform(smoothProgress, [0.82, 0.92, 1], [1, 1.45, 1.45]);
  const dotScales = [dot1Scale, dot2Scale, dot3Scale, dot4Scale];

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

  const handleNavClick = (item) => {
    setActiveNav(item);
    setMobileMenuOpen(false);
    if (item === 'Explore') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      runMorphSequence();
    } else {
      const targetFraction = NAV_TARGETS[item];
      if (targetFraction !== undefined) {
        scrollToStep(targetFraction);
      }
    }
  };

  useMotionValueEvent(smoothProgress, 'change', (latest) => {
    if (latest < 0.38) {
      setActiveNav('Explore');
    } else if (latest < 0.62) {
      setActiveNav('Publications');
    } else if (latest < 0.82) {
      setActiveNav('Writers');
    } else if (latest < 0.96) {
      setActiveNav('Topics');
    } else {
      setActiveNav('Membership');
    }
  });

  const extraPagesConfig = [
    { data: EXTRA_SCROLL_PAGES[0], opacity: p3Opacity, y: p3Y, pe: p3PointerEvents, align: 'right' },
    { data: EXTRA_SCROLL_PAGES[1], opacity: p4Opacity, y: p4Y, pe: p4PointerEvents, align: 'left' },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative h-[580vh] w-full bg-white text-[#231F20] font-sans"
    >
      {/* Sticky Full-Screen Viewport with Continuous Color-Blending Canvas */}
      <motion.div
        style={{ backgroundColor: stageBackgroundColor }}
        className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden"
      >
        {/* Soft Ambient Radial Highlight Wash for Watercolor-Style Color Transitions */}
        <motion.div
          style={{ opacity: ambientGlowOpacity }}
          className="absolute inset-0 pointer-events-none z-1 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.45)_0%,transparent_55%),radial-gradient(circle_at_80%_75%,rgba(255,255,255,0.35)_0%,transparent_60%)]"
        />

        {/* HOMEPAGE FULL-BLEED FLIPPED BACKGROUND IMAGE */}
        <FloatingSocialCollage smoothProgress={smoothProgress} />

        {/* Top Navigation Bar */}
        <header className="w-full max-w-[1440px] mx-auto px-5 sm:px-9 pt-5 pb-2 flex flex-col z-50">
          <div className="w-full flex items-center justify-between">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('Explore');
              }}
              className="flex items-center gap-2.5 group focus:outline-none bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#231F20]/10 shadow-2xs"
              aria-label="Orvexa Home"
            >
              <OrvexaNewspaperBadge className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
            </a>

            {/* <nav className="hidden md:flex items-center gap-7 lg:gap-8 bg-white/80 backdrop-blur-md px-6 py-2 rounded-full border border-[#231F20]/10 shadow-2xs">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item;
                return (
                  <button
                    key={item}
                    onClick={() => handleNavClick(item)}
                    aria-current={isActive ? 'page' : undefined}
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
            </nav> */}

            <div className="flex items-center gap-2">
              <Link
                to="/app"
                className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-[12px] font-semibold px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-lg flex items-center gap-1.5 shadow-[0_2px_0_#2b41ab] transition-colors cursor-pointer"
                title="Launch the Orvexa community app"
              >
                <span>Enter App</span>
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </Link>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                className="md:hidden p-2 rounded-lg bg-white/80 backdrop-blur-md border border-[#231F20]/10 text-[#231F20] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="md:hidden w-full mt-2.5 bg-white/95 backdrop-blur-xl border border-[#231F20]/10 rounded-2xl p-2.5 shadow-lg flex flex-col gap-1 z-50 pointer-events-auto"
              >
                <Link
                  to="/app"
                  className="text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#3f5ce8] text-white flex items-center justify-between"
                >
                  <span>Enter Orvexa App</span>
                  <span>→</span>
                </Link>
                {NAV_ITEMS.map((item) => {
                  const isActive = activeNav === item;
                  return (
                    <button
                      key={item}
                      onClick={() => handleNavClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#231F20]/10 text-[#231F20] font-semibold'
                          : 'text-[#4A4644] hover:bg-[#231F20]/5 hover:text-[#231F20]'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </motion.nav>
            )}
          </AnimatePresence>
        </header>

        {/* HERO LAYER: Positioned Top-Left Over Full-Page Illustration */}
        <div className="flex-1 w-full max-w-[1440px] mx-auto px-5 sm:px-9 pt-3 sm:pt-6 flex items-start justify-start z-30 pointer-events-none">
          <motion.main
            style={{
              y: heroExitY,
              opacity: heroExitOpacity,
              pointerEvents: heroPointerEvents,
            }}
            className="w-full max-w-[560px] bg-white/70 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_rgba(20,20,20,0.1)] rounded-[28px] p-6 sm:p-8 flex flex-col items-start text-left"
          >
            <div
              onClick={runMorphSequence}
              title="Click to replay doodle animation"
              className="cursor-pointer select-none flex items-center justify-start gap-3.5 sm:gap-4 mb-4"
            >
              <motion.div
                whileHover={{ rotate: -4, scale: 1.04 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              >
                <OrvexaNewspaperBadge className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_6px_14px_rgba(238,93,59,0.22)]" />
              </motion.div>

              <h1
                aria-label="orvexa"
                className="flex items-center justify-center text-[50px] sm:text-[68px] md:text-[78px] font-black tracking-[-0.045em] text-[#1A1817] leading-none"
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

            <h2
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              className="text-[28px] sm:text-[35px] md:text-[22px] font-extrabold tracking-[-0.025em] text-[#111111] leading-[1.1]"
            >
              Discover Ideas,{' '}
              <span className="italic font-light">Connect</span>{' '}
              Perspectives.
            </h2>

            <p
              style={{ fontFamily: '"Inter", sans-serif' }}
              className="mt-3 text-[12.5px] sm:text-[13.5px] font-normal tracking-[-0.015em] text-[#1F1D1C] leading-[1.45]"
            >
              Explore content from across the world, share what you think, and build on ideas with people who see things differently. Turn everyday discoveries and conversations into something worth keeping.
            </p>
          </motion.main>
        </div>

        {/* =====================================================================
            SCROLL PAGE 1: Blended Pink Canvas + Top-Right Blurred Content + Large Clear Frames
           ===================================================================== */}
        <div
          style={{ zIndex: 25 }}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
        >
          <div className="relative w-full h-full max-w-[1440px] mx-auto">
            {/* Top-Right Larger Frosted-Glass Blurred Text Content Div */}
            <motion.div
              style={{
                opacity: p1ContentOpacity,
                y: p1ContentY,
                pointerEvents: p1PointerEvents,
              }}
              className="absolute top-[96px] sm:top-[104px] right-5 sm:right-9 w-[calc(100%-2.5rem)] max-w-[560px] bg-white/75 backdrop-blur-xl border border-white/85 shadow-[0_24px_60px_rgba(140,34,88,0.18)] rounded-[30px] p-7 sm:p-10 space-y-4 z-30"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/95 border border-[#231F20]/12 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#E0438E]" />
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                  01 / DISCOVER
                </span>
              </div>

              <h3
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.08]"
              >
                Explore global{' '}
                <span className="italic font-semibold">perspectives.</span>
              </h3>

              <p className="text-sm sm:text-[16px] text-[#231F20] leading-relaxed">
                Follow essays, field notes, and visual threads written by independent thinkers across the world—curated without algorithmic noise.
              </p>

              <ul className="space-y-2.5 pt-1">
                {[
                  'Distraction-free reading across art, science, and culture',
                  'Curated collections from independent voices',
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-xs sm:text-[14px] font-medium text-[#1A1618]"
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#FFD1E7] text-[#C92A76]">
                      <Sparkles className="w-3 h-3" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* 3 Large Varied-Size Frames Scattered Clear of the Top-Right Content Card */}
            <motion.div
              style={{
                opacity: p1FramesOpacity,
                scale: p1FramesScale,
                pointerEvents: p1PointerEvents,
              }}
              className="w-full h-full"
            >
              {PAGE1_SCATTERED_FRAMES.map((frame) => (
                <ScatteredMediaFrame key={frame.id} frame={frame} />
              ))}
            </motion.div>
          </div>
        </div>

        {/* =====================================================================
            SCROLL PAGE 2: Vibrant Purple (#9333EA) + Top-Left Blurred Content + 2 Big Frameless Media Items
           ===================================================================== */}
        <div
          style={{ zIndex: 26 }}
          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
        >
          <div className="relative w-full h-full max-w-[1440px] mx-auto">
            {/* Top-Left Frosted-Glass Blurred Text Content Div */}
            <motion.div
              style={{
                opacity: p2ContentOpacity,
                y: p2ContentY,
                pointerEvents: p2PointerEvents,
              }}
              className="absolute top-[96px] sm:top-[104px] left-5 sm:left-9 w-[calc(100%-2.5rem)] max-w-[560px] bg-white/78 backdrop-blur-xl border border-white/85 shadow-[0_24px_60px_rgba(48,12,92,0.28)] rounded-[30px] p-7 sm:p-10 space-y-4 z-30"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/95 border border-[#231F20]/12 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#9333EA]" />
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                  02 / PUBLISH
                </span>
              </div>

              <h3
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.08]"
              >
                Craft stories worth{' '}
                <span className="italic font-semibold">keeping.</span>
              </h3>

              <p className="text-sm sm:text-[16px] text-[#231F20] leading-relaxed">
                Write long-form essays or concise visual dispatches in a distraction-free editorial canvas designed to let your ideas breathe.
              </p>

              <ul className="space-y-2.5 pt-1">
                {[
                  'Clean typography built for thoughtful writing',
                  'Instant publishing to your personal shelf or publication',
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-xs sm:text-[14px] font-medium text-[#1A1618]"
                  >
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#EFE3FF] text-[#7E22CE]">
                      <Sparkles className="w-3 h-3" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* 2 Very Big Frameless Media Items Floating on the Purple Canvas */}
            <motion.div
              style={{
                opacity: p2MediaOpacity,
                scale: p2MediaScale,
                pointerEvents: p2PointerEvents,
              }}
              className="w-full h-full"
            >
              {PAGE2_FRAMELESS_MEDIA.map((frame) => (
                <ScatteredMediaFrame key={frame.id} frame={frame} frameless />
              ))}
            </motion.div>
          </div>
        </div>

        {/* =====================================================================
            SCROLL PAGES 3 & 4: Alternating Scroll Transitions
           ===================================================================== */}
        {extraPagesConfig.map(({ data, opacity, y, pe, align }) => (
          <motion.div
            key={data.id}
            style={{ opacity, y, pointerEvents: pe, zIndex: 30 }}
            className="absolute inset-0 w-full max-w-[1220px] mx-auto px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-12"
          >
            {/* Content Column */}
            <div
              className={`lg:col-span-6 space-y-4 max-w-[520px] ${
                align === 'right' ? 'lg:order-2 lg:ml-auto' : 'lg:order-1'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-[#231F20]/15 shadow-2xs">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: data.accentColor }}
                />
                <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#231F20]">
                  {data.step}
                </span>
              </div>

              <h3
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                className="text-[32px] sm:text-[44px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.1]"
              >
                {data.heading}{' '}
                <span className="italic font-semibold">{data.italicWord}.</span>
              </h3>

              <p className="text-sm sm:text-[15.5px] text-[#3B3836] leading-relaxed">
                {data.description}
              </p>

              <ul className="space-y-2.5 pt-1">
                {data.highlights.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-xs sm:text-[13.5px] font-medium text-[#231F20]"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: data.backdropColor,
                        color: data.accentColor,
                      }}
                    >
                      <Sparkles className="w-3 h-3" />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual Showcase Column */}
            <div
              className={`lg:col-span-6 flex items-center justify-center ${
                align === 'right' ? 'lg:order-1' : 'lg:order-2'
              }`}
            >
              <div
                className="w-full max-w-[440px] aspect-[4/3] rounded-[28px] p-8 flex flex-col justify-between border border-white/80 bg-white/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(24,22,21,0.08)]"
              >
                <span
                  className="self-start text-[11px] font-bold tracking-[0.16em] uppercase px-3 py-1 rounded-full bg-white/90"
                  style={{ color: data.accentColor }}
                >
                  {data.step}
                </span>
                <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-5 border border-[#231F20]/10 space-y-1.5">
                  <p className="text-base font-bold text-[#141414]">
                    {data.badgeTitle}
                  </p>
                  <p className="text-xs text-[#4A4644] leading-relaxed">
                    {data.badgeSubtitle}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Bottom 4-Page Step Indicator Dots */}
        <motion.div
          style={{ opacity: dotsOpacity, zIndex: 40 }}
          className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/85 backdrop-blur-md px-4 py-2 rounded-full border border-[#231F20]/12 shadow-sm"
        >
          {[
            { label: 'Page 01', fraction: 0.29 },
            { label: 'Page 02', fraction: 0.52 },
            { label: 'Page 03', fraction: 0.72 },
            { label: 'Page 04', fraction: 0.92 },
          ].map((step, idx) => (
            <button
              key={step.label}
              onClick={() => scrollToStep(step.fraction)}
              aria-label={`Jump to ${step.label}`}
              className="p-1 cursor-pointer focus:outline-none"
            >
              <motion.span
                style={{ scale: dotScales[idx] }}
                className="block w-2 h-2 rounded-full bg-[#231F20]"
              />
            </button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
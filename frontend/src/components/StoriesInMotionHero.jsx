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
import {
  ArrowRight,
  Sparkles,
  Compass,
  MessageSquare,
  BookOpen,
  Users,
  Send,
  GitBranch,
  Layers,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import { DOODLES } from './DoodleLetters';
import { OrvexaNewspaperBadge } from './OrvexaNewspaperBadge';
import { FloatingSocialCollage } from './FloatingSocialCollage';

const NAV_ITEMS = ['Explore', 'Discover', 'Conversations', 'Knowledge', 'Circles'];

const NAV_TARGETS = {
  Explore: 0,
  Discover: 0.28,
  Conversations: 0.50,
  Knowledge: 0.72,
  Circles: 0.94,
};

const PHRASE_TOKENS = [
  { char: 'o', doodleIdx: 0 },
  { char: 'r', doodleIdx: 1 },
  { char: 'v', doodleIdx: 2 },
  { char: 'e', doodleIdx: 3 },
  { char: 'x', doodleIdx: 4 },
  { char: 'a', doodleIdx: 5 },
];

// 4 Feature walkthrough pages matching the exact style of Reference Scroll Page 3
const FEATURE_SCROLL_PAGES = [
  {
    id: 'page-discover',
    step: '01 / DISCOVER',
    heading: 'Smart feeds that spark',
    italicWord: 'curiosity',
    description:
      'Explore an interleaved stream of everyday updates, trending questions, and verified knowledge guides curated without algorithmic noise.',
    accentColor: '#3F5CE8',
    backdropColor: '#E8ECFD',
    highlights: [
      'Interleaved Posts, Discussions, and Knowledge in one feed',
      'Trending topics ranked by community momentum and real engagement',
    ],
    badgeTitle: 'Discovery Stream',
    badgeSubtitle: 'Filtered by For You, Trending, or People you follow',
    cardTag: 'Discover Feed',
    cardIcon: Compass,
    cardPreview: {
      tag: 'Trending in Orvexa',
      headline: 'What should a truly useful AI assistant remember?',
      subtext: '48 replies · 12 contributors · Active now',
    },
  },
  {
    id: 'page-conversations',
    step: '02 / CONVERSE',
    heading: 'Talk freely, graduate to',
    italicWord: 'discussions',
    description:
      'Share quick thoughts or send private direct messages. When a post sparks deep debate, graduate it into a structured Discussion with nested replies.',
    accentColor: '#EE5D3B',
    backdropColor: '#FDECE6',
    highlights: [
      'Casual micro-posts with nested Reddit & YouTube style replies',
      'Post-to-Discussion conversion that preserves original timestamps',
      'Direct 1-on-1 real-time messaging for private collaboration',
    ],
    badgeTitle: 'Graduated Threads & DMs',
    badgeSubtitle: 'From everyday observations to deep community debates',
    cardTag: 'Posts & Discussions',
    cardIcon: MessageSquare,
    cardPreview: {
      tag: 'Graduated Discussion',
      headline: 'Clarity over consensus: Designing better team rituals',
      subtext: 'Migrated from Post · 18 contributions · Origin linked',
    },
  },
  {
    id: 'page-knowledge',
    step: '03 / SYNTHESIZE',
    heading: 'Turn conversations into',
    italicWord: 'knowledge',
    description:
      'Distill noisy threads into permanent, multi-section playbooks and guides. Every knowledge article keeps a verified citation link back to the catalyst conversation.',
    accentColor: '#059669',
    backdropColor: '#E4F4ED',
    highlights: [
      'Zero-cost local outline builder and structured block editor',
      'Living provenance: traceable back to original posts and commenters',
      'Version history checkpoints with instant rollback support',
    ],
    badgeTitle: 'Knowledge Base',
    badgeSubtitle: 'Permanent documentation that honors where ideas began',
    cardTag: 'Knowledge Studio',
    cardIcon: BookOpen,
    cardPreview: {
      tag: 'Published Guide',
      headline: 'A practical playbook for asynchronous remote cadence',
      subtext: '5 min read · Derived from community Post & 14 contributors',
    },
  },
  {
    id: 'page-circles',
    step: '04 / BELONG',
    heading: 'Find your people in',
    italicWord: 'circles',
    description:
      'Create or join shared communities built around passions, domains, and teams. Host dedicated feeds, announcements, and private knowledge bases.',
    accentColor: '#8A62D5',
    backdropColor: '#F2ECFA',
    highlights: [
      'Public, private, and invite-only community spaces',
      'Dedicated circle feeds, pinned discussions, and member directories',
      'Personal Library to bookmark and recall anything across circles',
    ],
    badgeTitle: 'Community Spaces',
    badgeSubtitle: 'Where focused teams and shared interests gather',
    cardTag: 'Circles Hub',
    cardIcon: Users,
    cardPreview: {
      tag: 'Active Circle',
      headline: 'Distributed Systems & Engineering Culture',
      subtext: '284 members · 42 discussions · 16 knowledge guides',
    },
  },
];

export default function StoriesInMotionHero() {
  const [stages, setStages] = useState(
    () => PHRASE_TOKENS.map(() => 'letter')
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeNav, setActiveNav] = useState('Explore');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 95,
    damping: 24,
    restDelta: 0.001,
    mass: 0.65,
  });

  // CONTINUOUS AMBIENT BACKGROUND COLOR BLENDING
  // Hero (Creamy Warm White #FAF7F2) -> Page 1 Discover (#F0F4FF) -> Page 2 Converse (#FDECE6) -> Page 3 Knowledge (#EAF6F1) -> Page 4 Circles (#F4EFFB)
  const stageBackgroundColor = useTransform(
    smoothProgress,
    [0, 0.12, 0.28, 0.40, 0.52, 0.64, 0.76, 0.88, 1],
    [
      '#FFFFFF',
      '#FAF7F2',
      '#F0F4FF',
      '#F0F4FF',
      '#FDECE6',
      '#FDECE6',
      '#EAF6F1',
      '#EAF6F1',
      '#F4EFFB',
    ]
  );

  // Soft ambient radial glow
  const ambientGlowOpacity = useTransform(
    smoothProgress,
    [0, 0.18, 0.45, 0.75, 1],
    [0, 0.4, 0.5, 0.5, 0.4]
  );

  // HERO (0.00 -> 0.18): Gentle upward drift & gradual dissolve
  const heroExitY = useTransform(smoothProgress, [0, 0.18], [0, -120]);
  const heroExitOpacity = useTransform(smoothProgress, [0, 0.06, 0.16], [1, 0.9, 0]);
  const heroPointerEvents = useTransform(smoothProgress, (v) =>
    v > 0.15 ? 'none' : 'auto'
  );

  // SCROLL PAGE 1: DISCOVERY (0.16 -> 0.38)
  const p1Opacity = useTransform(smoothProgress, [0.15, 0.23, 0.33, 0.40], [0, 1, 1, 0]);
  const p1Y = useTransform(smoothProgress, [0.15, 0.23, 0.33, 0.40], [40, 0, 0, -40]);
  const p1PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.18 && v <= 0.37 ? 'auto' : 'none'
  );

  // SCROLL PAGE 2: CONVERSATIONS (0.37 -> 0.60)
  const p2Opacity = useTransform(smoothProgress, [0.37, 0.45, 0.55, 0.62], [0, 1, 1, 0]);
  const p2Y = useTransform(smoothProgress, [0.37, 0.45, 0.55, 0.62], [40, 0, 0, -40]);
  const p2PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.40 && v <= 0.59 ? 'auto' : 'none'
  );

  // SCROLL PAGE 3: KNOWLEDGE (0.59 -> 0.82)
  const p3Opacity = useTransform(smoothProgress, [0.59, 0.67, 0.77, 0.84], [0, 1, 1, 0]);
  const p3Y = useTransform(smoothProgress, [0.59, 0.67, 0.77, 0.84], [40, 0, 0, -40]);
  const p3PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.62 && v <= 0.81 ? 'auto' : 'none'
  );

  // SCROLL PAGE 4: CIRCLES (0.81 -> 1.00)
  const p4Opacity = useTransform(smoothProgress, [0.81, 0.89, 1], [0, 1, 1]);
  const p4Y = useTransform(smoothProgress, [0.81, 0.89, 1], [40, 0, 0]);
  const p4PointerEvents = useTransform(smoothProgress, (v) =>
    v >= 0.84 ? 'auto' : 'none'
  );

  // Bottom 4-step indicator dots
  const dotsOpacity = useTransform(smoothProgress, [0.14, 0.20], [0, 1]);
  const dot1Scale = useTransform(smoothProgress, [0.15, 0.28, 0.39], [1, 1.45, 1]);
  const dot2Scale = useTransform(smoothProgress, [0.39, 0.50, 0.61], [1, 1.45, 1]);
  const dot3Scale = useTransform(smoothProgress, [0.61, 0.72, 0.83], [1, 1.45, 1]);
  const dot4Scale = useTransform(smoothProgress, [0.83, 0.94, 1], [1, 1.45, 1.45]);
  const dotScales = [dot1Scale, dot2Scale, dot3Scale, dot4Scale];

  const runMorphSequence = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    const order = [0, 1, 2, 3, 4, 5];
    const triggerDoodles = () => {
      order.forEach((charIdx, i) => {
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[charIdx] = 'doodle';
            return next;
          });
        }, i * 90);
      });
    };

    const triggerLetters = () => {
      order.forEach((charIdx, i) => {
        setTimeout(() => {
          setStages((prev) => {
            const next = [...prev];
            next[charIdx] = 'letter';
            return next;
          });
          if (i === order.length - 1) {
            setTimeout(() => setIsAnimating(false), 300);
          }
        }, i * 80);
      });
    };

    triggerDoodles();
    setTimeout(triggerLetters, 1400);
  }, [isAnimating]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runMorphSequence();
    }, 700);
    return () => clearTimeout(timer);
  }, [runMorphSequence]);

  const scrollToStep = (fraction) => {
    if (!sectionRef.current) return;
    const scrollHeight = sectionRef.current.offsetHeight - window.innerHeight;
    const targetY = sectionRef.current.offsetTop + scrollHeight * fraction;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
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
    if (latest < 0.20) {
      setActiveNav('Explore');
    } else if (latest < 0.42) {
      setActiveNav('Discover');
    } else if (latest < 0.64) {
      setActiveNav('Conversations');
    } else if (latest < 0.86) {
      setActiveNav('Knowledge');
    } else {
      setActiveNav('Circles');
    }
  });

  const pagesConfig = [
    { data: FEATURE_SCROLL_PAGES[0], opacity: p1Opacity, y: p1Y, pe: p1PointerEvents, align: 'right' },
    { data: FEATURE_SCROLL_PAGES[1], opacity: p2Opacity, y: p2Y, pe: p2PointerEvents, align: 'left' },
    { data: FEATURE_SCROLL_PAGES[2], opacity: p3Opacity, y: p3Y, pe: p3PointerEvents, align: 'right' },
    { data: FEATURE_SCROLL_PAGES[3], opacity: p4Opacity, y: p4Y, pe: p4PointerEvents, align: 'left' },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative h-[560vh] w-full bg-white text-[#231F20] font-sans"
    >
      {/* Sticky Full-Screen Viewport with Continuous Color-Blending Canvas */}
      <motion.div
        style={{ backgroundColor: stageBackgroundColor }}
        className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden"
      >
        {/* Soft Ambient Radial Highlight Wash */}
        <motion.div
          style={{ opacity: ambientGlowOpacity }}
          className="absolute inset-0 pointer-events-none z-1 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.65)_0%,transparent_55%),radial-gradient(circle_at_80%_75%,rgba(255,255,255,0.45)_0%,transparent_60%)]"
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
              className="flex items-center gap-2.5 group focus:outline-none bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#231F20]/10 shadow-2xs cursor-pointer"
              aria-label="Orvexa Home"
            >
              <OrvexaNewspaperBadge className="w-8 h-8 transition-transform duration-300 group-hover:scale-105" />
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-7 bg-white/85 backdrop-blur-md px-6 py-2 rounded-full border border-[#231F20]/10 shadow-2xs">
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item;
                return (
                  <button
                    key={item}
                    onClick={() => handleNavClick(item)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-[13px] tracking-tight transition-colors duration-200 cursor-pointer ${
                      isActive
                        ? 'font-bold text-[#231F20]'
                        : 'font-medium text-[#4A4644] hover:text-[#231F20]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Link
                to="/app"
                className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-[12px] font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer hover:shadow-md"
                title="Launch the Orvexa community app"
              >
                <span>Enter App</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                className="md:hidden p-2 rounded-xl bg-white/80 backdrop-blur-md border border-[#231F20]/10 text-[#231F20] cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile navigation dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="md:hidden mt-3 p-3 bg-white/95 backdrop-blur-xl border border-[#231F20]/10 rounded-2xl shadow-xl flex flex-col gap-1 z-50"
              >
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
            className="w-full max-w-[560px] bg-white/75 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_rgba(20,20,20,0.1)] rounded-[28px] p-6 sm:p-8 flex flex-col items-start text-left"
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
              A collaborative knowledge ecosystem where casual posts graduate into deep discussions, and discussions crystallize into permanent guides.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Link
                to="/app"
                className="bg-[#3f5ce8] hover:bg-[#324ecc] text-white text-[12px] font-bold px-4 py-2.5 rounded-xl shadow-[0_2px_0_#2b41ab] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Explore Community</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => scrollToStep(0.28)}
                className="text-[12px] font-semibold text-[#55504E] hover:text-[#111111] px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                See how it works ↓
              </button>
            </div>
          </motion.main>
        </div>

        {/* =====================================================================
            FEATURE SCROLL PAGES (All 4 structured using Reference Scroll Page 3 Layout)
           ===================================================================== */}
        {pagesConfig.map(({ data, opacity, y, pe, align }) => {
          const CardIcon = data.cardIcon;
          return (
            <motion.div
              key={data.id}
              style={{ opacity, y, pointerEvents: pe, zIndex: 30 }}
              className="absolute inset-0 w-full max-w-[1240px] mx-auto px-6 sm:px-12 grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-14"
            >
              {/* Content Column */}
              <div
                className={`lg:col-span-6 space-y-4 max-w-[540px] ${
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
                  className="text-[34px] sm:text-[46px] font-extrabold tracking-[-0.025em] text-[#141414] leading-[1.1]"
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

              {/* Visual Showcase Card Column (Matching Reference Image Style) */}
              <div
                className={`lg:col-span-6 flex items-center justify-center ${
                  align === 'right' ? 'lg:order-1' : 'lg:order-2'
                }`}
              >
                <div className="w-full max-w-[460px] aspect-[4/3] rounded-[30px] p-7 sm:p-9 flex flex-col justify-between border border-white/85 bg-white/70 backdrop-blur-xl shadow-[0_24px_55px_rgba(24,22,21,0.09)] transition-all hover:shadow-[0_30px_65px_rgba(24,22,21,0.14)]">
                  {/* Top Badge inside Card */}
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] uppercase px-3 py-1 rounded-full bg-white/95 border border-[#231F20]/10 shadow-2xs"
                      style={{ color: data.accentColor }}
                    >
                      <CardIcon className="w-3.5 h-3.5" />
                      <span>{data.cardTag}</span>
                    </span>

                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Orvexa
                    </span>
                  </div>

                  {/* Dynamic Preview Card inside Showcase */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-[#231F20]/10 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider"
                        style={{
                          backgroundColor: data.backdropColor,
                          color: data.accentColor,
                        }}
                      >
                        {data.cardPreview.tag}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-[#141414] leading-snug">
                      {data.cardPreview.headline}
                    </p>

                    <p className="text-[11px] text-[#6B6562] font-medium">
                      {data.cardPreview.subtext}
                    </p>
                  </div>

                  {/* Bottom Explanatory Label */}
                  <div className="pt-1 border-t border-[#231F20]/8 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#141414]">{data.badgeTitle}</span>
                    <span className="text-slate-500 font-medium">{data.badgeSubtitle}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Bottom 4-Page Step Indicator Dots */}
        <motion.div
          style={{ opacity: dotsOpacity, zIndex: 40 }}
          className="pointer-events-auto absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/85 backdrop-blur-md px-4 py-2 rounded-full border border-[#231F20]/12 shadow-sm"
        >
          {[
            { label: 'Discover', fraction: 0.28 },
            { label: 'Conversations', fraction: 0.50 },
            { label: 'Knowledge', fraction: 0.72 },
            { label: 'Circles', fraction: 0.94 },
          ].map((step, idx) => (
            <button
              key={step.label}
              onClick={() => scrollToStep(step.fraction)}
              aria-label={`Jump to ${step.label}`}
              className="p-1 cursor-pointer focus:outline-none"
            >
              <motion.span
                style={{ scale: dotScales[idx] }}
                className="block w-2.5 h-2.5 rounded-full bg-[#231F20]"
              />
            </button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

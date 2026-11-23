import React from 'react';

export const ORVEXA_GLYPHS = {
  // 'o' with clean inner hole, smooth planetary ring across front body, sage dot, and top sparkle
  o: () => (
    <svg
      viewBox="2 2 106 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="o"
    >
      <defs>
        {/* Mask so the front ring ONLY draws on the dark 'o' stroke, leaving the inner hole 100% round */}
        <mask id="orvexa-o-front-mask">
          <rect x="0" y="0" width="110" height="110" fill="black" />
          {/* Bottom-right half where the ring passes in front */}
          <polygon points="0,88 110,16 110,110 0,110" fill="white" />
          {/* Cut out the inner center hole so the ring never crosses inside it */}
          <circle cx="55" cy="58" r="15.2" fill="black" />
        </mask>
      </defs>

      {/* Full smooth tilted ellipse behind the 'o' */}
      <ellipse
        cx="55"
        cy="58"
        rx="48"
        ry="15.5"
        transform="rotate(-33 55 58)"
        fill="none"
        stroke="#313E48"
        strokeWidth="5.2"
      />

      {/* Main 'o' body */}
      <circle
        cx="55"
        cy="58"
        r="23.5"
        fill="none"
        stroke="#313E48"
        strokeWidth="16.8"
      />

      {/* Front segment of the ring passing across the lower-right body only */}
      <ellipse
        cx="55"
        cy="58"
        rx="48"
        ry="15.5"
        transform="rotate(-33 55 58)"
        fill="none"
        stroke="#313E48"
        strokeWidth="5.2"
        mask="url(#orvexa-o-front-mask)"
      />

      {/* Sage green orbiting dot on the inner right edge */}
      <circle cx="67.5" cy="54" r="4.8" fill="#B5CE9F" />

      {/* Top 4-point star sparkle */}
      <path
        d="M 56 6 Q 56 16.5 66.5 16.5 Q 56 16.5 56 27 Q 56 16.5 45.5 16.5 Q 56 16.5 56 6 Z"
        fill="#313E48"
      />
    </svg>
  ),

  // 'r' with clean right breathing room so it never touches 'v'
  r: () => (
    <svg
      viewBox="8 2 48 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="r"
    >
      <path
        d="M 12 31 H 27 V 41 C 31 33, 39 30, 50 30 V 45.5 C 37 45.5, 29 50.5, 29 63 V 87 H 12 Z"
        fill="#313E48"
      />
    </svg>
  ),

  // 'v' heavy geometric sans with balanced side bearings
  v: () => (
    <svg
      viewBox="2 2 78 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="v"
    >
      <polygon
        points="6,31 24,31 41,70 58,31 76,31 50,87 32,87"
        fill="#313E48"
      />
    </svg>
  ),

  // 'e' heavy geometric rounded sans
  e: () => (
    <svg
      viewBox="4 2 74 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="e"
    >
      <path
        d="M 73 63 H 25 C 27 71, 34 75, 43 75 C 50 75, 55 72, 59 68 L 71 76 C 64 84, 54 89, 42 89 C 22 89, 8 76, 8 59 C 8 42, 22 29, 41 29 C 61 29, 74 42, 74 58 C 74 60, 73.5 61.5, 73 63 Z M 25 52 H 57 C 55 45, 49 41, 41 41 C 33 41, 27 45, 25 52 Z"
        fill="#313E48"
      />
    </svg>
  ),

  // 'x' matching the reference: lavender & sage orbital loops + solid inner X arms + peach center diamond
  x: () => (
    <svg
      viewBox="8 2 80 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="x"
    >
      {/* Sage green outer orbital loop (top-right to bottom-left) */}
      <ellipse
        cx="48"
        cy="58"
        rx="13.5"
        ry="41"
        transform="rotate(34 48 58)"
        fill="none"
        stroke="#B5CE9F"
        strokeWidth="6.5"
      />

      {/* Lavender outer orbital loop (top-left to bottom-right) */}
      <ellipse
        cx="48"
        cy="58"
        rx="13.5"
        ry="41"
        transform="rotate(-34 48 58)"
        fill="none"
        stroke="#B8A1E3"
        strokeWidth="6.5"
      />

      {/* Solid sage green forward-slash arm (top-right to bottom-left) */}
      <polygon points="56,31 74,31 40,87 22,87" fill="#B5CE9F" />

      {/* Solid lavender back-slash arm (top-left to bottom-right) */}
      <polygon points="22,31 40,31 74,87 56,87" fill="#B8A1E3" />

      {/* Peach center intersection diamond */}
      <polygon points="48,47 57,59 48,71 39,59" fill="#E89D72" />

      {/* Top peach 4-point star sparkle */}
      <path
        d="M 48 4 Q 48 14 58 14 Q 48 14 48 24 Q 48 14 38 14 Q 48 14 48 4 Z"
        fill="#E89D72"
      />
    </svg>
  ),

  // 'a' heavy geometric single-story sans
  a: () => (
    <svg
      viewBox="4 2 73 106"
      className="h-[1.08em] w-auto overflow-visible inline-block"
      aria-label="a"
    >
      <path
        d="M 56 31 H 72 V 87 H 56 V 80 C 51 86, 44 89, 35 89 C 19 89, 8 76, 8 59 C 8 42, 19 29, 35 29 C 44 29, 51 32, 56 38 Z M 40 43 C 30 43, 24 50, 24 59 C 24 68, 30 75, 40 75 C 50 75, 56 68, 56 59 C 56 50, 50 43, 40 43 Z"
        fill="#313E48"
      />
    </svg>
  ),
};

// Compact brand icon for the top-left navbar
export function OrvexaMiniMark() {
  return (
    <div className="flex items-center gap-2 select-none">
      <svg viewBox="2 2 106 106" className="w-8 h-8 overflow-visible">
        <defs>
          <mask id="orvexa-mini-front-mask">
            <rect x="0" y="0" width="110" height="110" fill="black" />
            <polygon points="0,88 110,16 110,110 0,110" fill="white" />
            <circle cx="55" cy="58" r="15.2" fill="black" />
          </mask>
        </defs>
        <ellipse
          cx="55"
          cy="58"
          rx="48"
          ry="15.5"
          transform="rotate(-33 55 58)"
          fill="none"
          stroke="#313E48"
          strokeWidth="6"
        />
        <circle
          cx="55"
          cy="58"
          r="23.5"
          fill="none"
          stroke="#313E48"
          strokeWidth="17.5"
        />
        <ellipse
          cx="55"
          cy="58"
          rx="48"
          ry="15.5"
          transform="rotate(-33 55 58)"
          fill="none"
          stroke="#313E48"
          strokeWidth="6"
          mask="url(#orvexa-mini-front-mask)"
        />
        <circle cx="67.5" cy="54" r="5" fill="#B5CE9F" />
        <path
          d="M 56 6 Q 56 16.5 66.5 16.5 Q 56 16.5 56 27 Q 56 16.5 45.5 16.5 Q 56 16.5 56 6 Z"
          fill="#313E48"
        />
      </svg>
      <span className="text-[17px] font-extrabold tracking-[-0.03em] text-[#313E48]">
        orvexa
      </span>
    </div>
  );
}
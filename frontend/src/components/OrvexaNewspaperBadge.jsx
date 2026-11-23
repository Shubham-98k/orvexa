import React from 'react';

export function OrvexaNewspaperBadge({ className = 'w-20 h-20 md:w-24 md:h-24' }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} shrink-0 select-none overflow-visible`}
      aria-label="Orvexa Logo"
    >
      {/* Rounded Coral-Red App Squircle */}
      <rect x="4" y="4" width="112" height="112" rx="28" fill="#EB5736" />

      {/* 1. Outermost Left Folded Page Tab */}
      <path
        d="M 15 53 L 26 50 L 35 84 C 36.5 89 31 92 27.5 88 C 25.5 85.5 24 81 22.5 76 L 15 53 Z"
        fill="#EAD7B3"
        stroke="#241C18"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Middle Folded Page Tab */}
      <path
        d="M 22 43 L 34 40 L 43 85 C 44.5 90 38.5 93 34.5 89 C 32 86.5 30.5 82 29 76 L 22 43 Z"
        fill="#F5E4C3"
        stroke="#241C18"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Main Front Newspaper Sheet with Rolled Bottom J-Spine */}
      <path
        d="M 33 34
           L 89 24
           C 92.5 23.4 95.2 25.6 95.8 29
           L 104.5 73
           C 105.2 76.5 102.8 79.6 99.3 80.2
           L 47 89.5
           C 38.5 91 34.5 87 33.2 80
           L 28.5 40
           C 28 36.8 29.8 34.6 33 34 Z"
        fill="#FBF0D9"
        stroke="#241C18"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Grey Fold Shadow Band Tucked Inside the Bottom-Left Roll */}
      <path
        d="M 35 81.5
           L 57 77.6
           L 58.6 86.2
           L 43 89
           C 38.2 89.8 35.8 86.5 35 81.5 Z"
        fill="#A8A49E"
        stroke="#241C18"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* 5. Top Wide Masthead Box */}
      <polygon
        points="38,40.5 86,32 88,42.5 40,51"
        fill="#EBD7B2"
        stroke="#241C18"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />

      {/* 6. Bottom-Left Square Article Box */}
      <polygon
        points="41,57.5 62,53.8 66.2,75.5 45.2,79.2"
        fill="#EBD7B2"
        stroke="#241C18"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />

      {/* 7. Bottom-Right Vertical Article Box */}
      <polygon
        points="68,52.8 89,49 94.2,75 73.2,78.8"
        fill="#EBD7B2"
        stroke="#241C18"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />

      {/* 8. Upper-Right Gold 4-Point Sparkle */}
      <path
        d="M 96 15.5
           Q 96 24 104.5 24
           Q 96 24 96 32.5
           Q 96 24 87.5 24
           Q 96 24 96 15.5 Z"
        fill="#E5B73B"
        stroke="#241C18"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />

      {/* 9. Primary Sky-Blue 4-Point Sparkle */}
      <path
        d="M 83 23
           Q 83 38.5 98.5 38.5
           Q 83 38.5 83 54
           Q 83 38.5 67.5 38.5
           Q 83 38.5 83 23 Z"
        fill="#82C6E7"
        stroke="#241C18"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* 10. Lower-Right Gold 4-Point Sparkle */}
      <path
        d="M 96 42.5
           Q 96 51 104.5 51
           Q 96 51 96 59.5
           Q 96 51 87.5 51
           Q 96 51 96 42.5 Z"
        fill="#E5B73B"
        stroke="#241C18"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
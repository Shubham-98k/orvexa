import React from 'react';

// Social-publishing SVG doodles styled in the Orvexa brand palette
export const DOODLES = [
  // o -> Open Story Book / Journal
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M10 18 C18 15, 26 17, 32 22 C38 17, 46 15, 54 18 L54 46 C46 43, 38 45, 32 50 C26 45, 18 43, 10 46 Z"
        fill="#F7F5EE"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <line x1="32" y1="22" x2="32" y2="50" stroke="#313E48" strokeWidth="3" />
      <path d="M16 26 L26 28 M16 33 L26 35 M38 28 L48 26 M38 35 L48 33" stroke="#B5CE9F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  // r -> Fountain Pen Nib (Writing & Publishing)
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M32 8 L48 34 L41 48 L23 48 L16 34 Z"
        fill="#F7F5EE"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <line x1="32" y1="8" x2="32" y2="30" stroke="#313E48" strokeWidth="2.8" />
      <circle cx="32" cy="33" r="4" fill="#E89D72" stroke="#313E48" strokeWidth="2.4" />
      <rect x="21" y="48" width="22" height="7" rx="2" fill="#B8A1E3" stroke="#313E48" strokeWidth="3" />
    </svg>
  ),
  // v -> Social Discussion / Speech Bubble with Heart
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M12 16 H52 A4 4 0 0 1 56 20 V40 A4 4 0 0 1 52 44 H26 L16 53 V44 H12 A4 4 0 0 1 8 40 V20 A4 4 0 0 1 12 16 Z"
        fill="#F7F5EE"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M32 37 C32 37 23 31.5 23 26.5 A4.5 4.5 0 0 1 32 25 A4.5 4.5 0 0 1 41 26.5 C41 31.5 32 37 32 37 Z"
        fill="#E89D72"
        stroke="#313E48"
        strokeWidth="2.2"
      />
    </svg>
  ),
  // e -> Saved Bookmark / Curated Article
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M18 12 H46 A3 3 0 0 1 49 15 V52 L32 41 L15 52 V15 A3 3 0 0 1 18 12 Z"
        fill="#B5CE9F"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M32 20 L34 25 L39 27 L34 29 L32 34 L30 29 L25 27 L30 25 Z"
        fill="#F7F5EE"
      />
    </svg>
  ),
  // x -> Paper Airplane (Sharing & Reach)
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M8 38 L54 14 L38 50 L28 38 L54 14"
        fill="#F7F5EE"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 38 L28 50 L35 43"
        fill="#B8A1E3"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 45 L14 42 M4 32 L12 31"
        stroke="#E89D72"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 4"
      />
    </svg>
  ),
  // a -> Broadcast Megaphone (Community & Audience)
  () => (
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-20 md:h-20 overflow-visible">
      <path
        d="M14 26 H24 L46 14 V46 L24 34 H14 A3 3 0 0 1 11 31 V29 A3 3 0 0 1 14 26 Z"
        fill="#F7F5EE"
        stroke="#313E48"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path d="M24 26 V34" stroke="#313E48" strokeWidth="3" />
      <path d="M18 34 L21 48 H27 L24 34" fill="#E89D72" stroke="#313E48" strokeWidth="3" strokeLinejoin="round" />
      <path d="M51 24 C54 27, 54 33, 51 36 M55 19 C60 25, 60 35, 55 41" fill="none" stroke="#B5CE9F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
];
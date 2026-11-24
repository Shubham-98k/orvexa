import React from 'react';

const COLOR_MAP = {
  purple: 'bg-[#8a62d5]',
  blue: 'bg-[#5475d9]',
  pink: 'bg-[#d87978]',
  gold: 'bg-[#c88c46]',
  green: 'bg-[#669a86]',
  dark: 'bg-[#44506e]',
};

export default function Avatar({
  initials = 'OP',
  color = 'purple',
  src = '',
  size = 'w-8 h-8 text-xs',
  className = '',
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={initials}
        className={`${size} rounded-full object-cover shrink-0 select-none shadow-2xs ${className}`}
      />
    );
  }

  const bg = COLOR_MAP[color] || COLOR_MAP.purple;

  return (
    <span
      className={`${size} ${bg} rounded-full text-white font-extrabold flex items-center justify-center shrink-0 select-none shadow-2xs ${className}`}
    >
      {initials}
    </span>
  );
}

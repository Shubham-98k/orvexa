import React from 'react';
import { motion, useTransform } from 'framer-motion';
import socialCollage from '../assets/social-collage.png';

export function FloatingSocialCollage({ smoothProgress }) {
  // Subtle parallax drift and fade out as you scroll into the card stories
  const parallaxY = useTransform(smoothProgress, [0, 0.28], [0, -90]);
  const parallaxOpacity = useTransform(smoothProgress, [0, 0.24], [1, 0]);

  return (
    <motion.div
      style={{ y: parallaxY, opacity: parallaxOpacity }}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-10"
    >
      <img
        src={socialCollage}
        alt="Orvexa creative perspectives canvas"
        className="w-full h-full object-cover object-center -scale-x-100"
      />
      {/* Soft top edge gradient so the top navigation links stay crisp */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/75 via-white/30 to-transparent" />
    </motion.div>
  );
}
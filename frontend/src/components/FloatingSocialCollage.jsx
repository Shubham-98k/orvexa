import React from 'react';
import { motion, useTransform } from 'framer-motion';
import socialCollage from '../assets/social-collage.png';

export function FloatingSocialCollage({ smoothProgress }) {
  const parallaxY = useTransform(smoothProgress, [0, 0.26], [0, -70]);
  const parallaxScale = useTransform(smoothProgress, [0, 0.26], [1, 1.06]);
  const parallaxOpacity = useTransform(smoothProgress, [0, 0.08, 0.24], [1, 0.92, 0]);

  return (
    <motion.div
      style={{
        y: parallaxY,
        scale: parallaxScale,
        opacity: parallaxOpacity,
        zIndex: 5,
      }}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
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
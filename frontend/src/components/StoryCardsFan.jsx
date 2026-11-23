import React from 'react';
import card1Video from '../assets/card1-video.mp4';

// Automatically resolves card1-cover.jpeg, card1-cover.jpg, or card1-cover.png
const coverModules = import.meta.glob('../assets/card1-cover.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});
const card1Cover = Object.values(coverModules)[0];

export const STORY_CARDS = [
  {
    id: 1,
    step: '01 / DISCOVER',
    heading: 'Explore global',
    italicWord: 'perspectives',
    description:
      'Follow essays, field notes, and visual threads written by independent thinkers across the world—curated without algorithmic noise.',
    highlights: [
      'Distraction-free reading across art, science, and culture',
      'Curated collections from independent voices',
    ],
    accentColor: '#679B68',
    backdropColor: '#D6EDE2',
    videoSrc: card1Video,
    posterSrc: card1Cover,
    fan: { rotate: -11, xOffset: -155, yOffset: 24, zIndex: 10 },
    artwork: (
      <div className="w-full h-full bg-[#F7F3E8] p-2 border-2 border-[#231F20] rounded-[16px]">
        <div className="w-full h-full rounded-xl overflow-hidden border-2 border-[#231F20] relative bg-[#EAE5D9]">
          <img
            src={card1Cover}
            alt="Explore global perspectives"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    ),
  },
  {
    id: 2,
    step: '02 / PUBLISH',
    heading: 'Craft stories worth',
    italicWord: 'keeping',
    description:
      'Write long-form articles or concise reflections in a clean editorial canvas designed to let your ideas breathe and resonate.',
    highlights: [
      'Clean typography built for thoughtful writing',
      'Instant publishing to your personal shelf or publication',
    ],
    accentColor: '#7E6BA8',
    backdropColor: '#E5DFF5',
    fan: { rotate: 0, xOffset: 0, yOffset: 8, zIndex: 25 },
    artwork: (
      <div className="w-full h-full bg-[#D9D1EB] p-5 border-2 border-[#231F20] rounded-[16px] flex flex-col justify-center">
        <div className="w-full space-y-2.5">
          {[42, 40, 38, 35, 32, 29, 26, 22, 18].map((widthPct, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div
                className="h-[2.5px] bg-[#231F20] rounded-full"
                style={{ width: `${widthPct}%` }}
              />
              <div
                className="h-[2.5px] bg-[#231F20] rounded-full"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 3,
    step: '03 / CONNECT',
    heading: 'Build on ideas',
    italicWord: 'together',
    description:
      'Highlight passages, spark meaningful replies, and link related viewpoints with readers who see the world differently.',
    highlights: [
      'Inline passage highlights and threaded replies',
      'Turn everyday conversations into lasting knowledge',
    ],
    accentColor: '#EE5D3B',
    backdropColor: '#F6DFC9',
    fan: { rotate: 11, xOffset: 155, yOffset: 24, zIndex: 15 },
    artwork: (
      <div className="w-full h-full bg-[#F5CD4B] p-2.5 border-2 border-[#231F20] rounded-[16px]">
        <div className="w-full h-full bg-[#F5CD4B] border-2 border-[#231F20] rounded-xl relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-[#EE6B4D] border-2 border-[#231F20] -translate-x-8 -translate-y-4" />
          <div className="w-28 h-28 rounded-full bg-[#EE6B4D] border-2 border-[#231F20] absolute -bottom-8 -right-6" />
          <div className="w-16 h-24 bg-[#F7F3E8] border-2 border-[#231F20] absolute top-6 right-0 rounded-l-xl" />
        </div>
      </div>
    ),
  },
];
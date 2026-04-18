'use client';

import { useState, useEffect } from 'react';

interface BackgroundCarouselProps {
  images: string[];
  interval?: number;
}

export default function BackgroundCarousel({
  images,
  interval = 15000,
}: BackgroundCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <div className="fixed inset-0 -z-10">
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      {/* 暗色遮罩层 */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'bg-carousel-index';
const TIMESTAMP_KEY = 'bg-carousel-timestamp';

interface BackgroundCarouselProps {
  images: string[];
  interval?: number;
}

function getSavedIndex(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

function getSavedTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(TIMESTAMP_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

export default function BackgroundCarousel({
  images,
  interval = 15000,
}: BackgroundCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // 从 localStorage 恢复状态
  useEffect(() => {
    const savedIndex = getSavedIndex();
    const savedTime = getSavedTimestamp();
    const now = Date.now();
    const timePassed = now - savedTime;

    // 计算应该显示哪张图（考虑时间流逝）
    if (images.length > 0 && interval > 0) {
      const cyclesPassed = Math.floor(timePassed / interval);
      const adjustedIndex = (savedIndex + cyclesPassed) % images.length;
      setCurrentIndex(adjustedIndex);
    }

    setIsHydrated(true);
  }, [images.length, interval]);

  // 保存当前索引
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, currentIndex.toString());
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
  }, [currentIndex, isHydrated]);

  // 定期切换
  useEffect(() => {
    if (images.length <= 1 || !isHydrated) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval, isHydrated]);

  if (images.length === 0) return null;

  // 服务端渲染时只显示第一张图，避免闪烁
  const displayIndex = isHydrated ? currentIndex : 0;

  return (
    <div className="fixed inset-0 -z-10">
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === displayIndex ? 'opacity-100' : 'opacity-0'
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

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
}

interface Constellation {
  x: number;
  y: number;
  stars: Star[];
  lines: [number, number][];
  scale: number;
  alpha: number;
  rotation: number;
  colorScheme: typeof colorSchemes[0];
}

// 生成艺术化的随机星座图案
function generateArtisticConstellation(): { stars: Star[]; lines: [number, number][] } {
  const starCount = 4 + Math.floor(Math.random() * 4);
  const stars: Star[] = [];

  stars.push({ x: 0, y: 0, size: 2 + Math.random() * 1.5 });

  for (let i = 1; i < starCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 15 + Math.random() * 25;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    stars.push({
      x,
      y,
      size: 1.5 + Math.random() * 1.5
    });
  }

  const lines: [number, number][] = [];

  for (let i = 1; i < stars.length; i++) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let j = 0; j < i; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = j;
      }
    }

    lines.push([i, nearestIndex]);

    if (Math.random() > 0.6 && i > 1) {
      const extraIndex = Math.floor(Math.random() * i);
      if (extraIndex !== nearestIndex) {
        lines.push([i, extraIndex]);
      }
    }
  }

  return { stars, lines };
}

// 多种深蓝色调
const colorSchemes = [
  { star: '#1e3a5f', glow: 'rgba(59, 130, 246, 0.35)', core: '#60a5fa', line: 'rgba(30, 58, 95, 0.5)' },
  { star: '#1e3d6f', glow: 'rgba(37, 99, 235, 0.35)', core: '#3b82f6', line: 'rgba(30, 64, 175, 0.5)' },
  { star: '#1e40af', glow: 'rgba(29, 78, 216, 0.35)', core: '#2563eb', line: 'rgba(30, 58, 138, 0.5)' },
  { star: '#172554', glow: 'rgba(30, 64, 175, 0.35)', core: '#4f46e5', line: 'rgba(49, 46, 129, 0.5)' },
  { star: '#1e1b4b', glow: 'rgba(79, 70, 229, 0.35)', core: '#6366f1', line: 'rgba(55, 48, 163, 0.5)' },
];

export default function ConstellationTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const constellationsRef = useRef<Constellation[]>([]);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const createConstellation = useCallback((x: number, y: number): Constellation => {
    const pattern = generateArtisticConstellation();
    const scale = 0.6 + Math.random() * 0.9;
    const colorScheme = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];

    return {
      x,
      y,
      stars: pattern.stars,
      lines: pattern.lines,
      scale,
      alpha: 0.85,
      rotation: Math.random() * Math.PI * 2,
      colorScheme,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 70) {
        constellationsRef.current.push(createConstellation(e.clientX, e.clientY));
        lastPosRef.current.x = e.clientX;
        lastPosRef.current.y = e.clientY;
      }
    };

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      constellationsRef.current = constellationsRef.current.filter((constellation) => {
        constellation.scale *= 0.99;
        constellation.alpha -= 0.005;
        constellation.rotation += 0.0005;

        if (constellation.alpha <= 0 || constellation.scale <= 0.2) {
          return false;
        }

        ctx.save();
        ctx.translate(constellation.x, constellation.y);
        ctx.rotate(constellation.rotation);
        ctx.scale(constellation.scale, constellation.scale);

        ctx.strokeStyle = constellation.colorScheme.line;
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.globalAlpha = constellation.alpha * 0.6;
        ctx.beginPath();
        constellation.lines.forEach(([start, end]) => {
          const s1 = constellation.stars[start];
          const s2 = constellation.stars[end];
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(s2.x, s2.y);
        });
        ctx.stroke();

        constellation.stars.forEach((star) => {
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3.5);
          gradient.addColorStop(0, constellation.colorScheme.glow);
          gradient.addColorStop(0.5, constellation.colorScheme.glow.replace('0.35)', '0.08)'));
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.globalAlpha = constellation.alpha * 0.4;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = constellation.colorScheme.star;
          ctx.globalAlpha = constellation.alpha;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = constellation.colorScheme.core;
          ctx.globalAlpha = constellation.alpha * 0.85;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 0.45, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
        return true;
      });

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [createConstellation]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}

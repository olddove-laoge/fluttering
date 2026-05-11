'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Post } from '@/lib/posts';

interface StarTimelineProps {
  posts: Post[];
}

interface Point {
  x: number;
  y: number;
}

const starOffsets = [-16, 12, -8, 18, -12, 8, -6, 14];
const contentOffsets = [-8, 10, -4, 12, -10, 6, -6, 8];

export default function StarTimeline({ posts }: StarTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const starRefs = useRef<Array<HTMLDivElement | null>>([]);
  const articleRefs = useRef<Record<string, HTMLElement | null>>({});
  const [points, setPoints] = useState<Point[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const monthGroups = useMemo(() => {
    const map = new Map<string, Post[]>();

    posts.forEach((post) => {
      const key = format(new Date(post.date), 'yyyy年MM月', { locale: zhCN });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });

    return Array.from(map.entries()).map(([month, monthPosts]) => ({
      month,
      posts: monthPosts,
    }));
  }, [posts]);

  const recalcLines = () => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const nextPoints = starRefs.current
      .map((el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: r.left + r.width / 2 - cRect.left,
          y: r.top + r.height / 2 - cRect.top,
        };
      })
      .filter((p): p is Point => p !== null);

    setPoints(nextPoints);
  };

  const handleJumpToPost = (slug: string) => {
    const el = articleRefs.current[slug];
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveSlug(slug);
    window.setTimeout(() => setActiveSlug((prev) => (prev === slug ? null : prev)), 1800);
  };

  useEffect(() => {
    recalcLines();
    const onResize = () => recalcLines();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [posts.length]);

  useEffect(() => {
    const t = setTimeout(recalcLines, 30);
    return () => clearTimeout(t);
  });

  const lines = useMemo(() => {
    const result: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      result.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
      });
    }
    return result;
  }, [points]);

  return (
    <section className="grid grid-cols-1 md:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr] gap-6 md:gap-8">
      <aside className="hidden md:block sticky top-24 self-start bg-slate-950/55 border border-white/15 rounded-xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/55 mb-4">Timeline</p>

        <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
          {monthGroups.map((group) => (
            <div key={group.month}>
              <div className="text-sm font-medium text-white/80 mb-2">{group.month}</div>
              <div className="space-y-1.5">
                {group.posts.map((post) => (
                  <button
                    key={post.slug}
                    onClick={() => handleJumpToPost(post.slug)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                      activeSlug === post.slug
                        ? 'bg-blue-500/25 text-blue-100 border border-blue-300/35'
                        : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                    title={post.title}
                  >
                    <div className="truncate">{post.title}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="bg-slate-950/70 border border-white/15 rounded-2xl p-6 md:p-10">
        <div ref={containerRef} className="relative">
          <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            {lines.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(147, 197, 253, 0.5)"
                strokeWidth="1"
              />
            ))}
          </svg>

          <div className="space-y-10 md:space-y-14">
            {posts.map((post, index) => {
              const isRight = index % 2 === 1;
              const isFeatured = index === 0;
              const starShift = starOffsets[index % starOffsets.length];
              const contentShift = contentOffsets[index % contentOffsets.length];

              return (
                <article
                  key={post.slug}
                  ref={(el: HTMLElement | null) => {
                    articleRefs.current[post.slug] = el;
                  }}
                  className={`relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 items-center scroll-mt-24 transition-all duration-500 ${
                    activeSlug === post.slug
                      ? 'ring-1 ring-blue-300/60 bg-blue-500/10 rounded-xl p-3 -m-3'
                      : ''
                  }`}
                >
                  <div
                    className={`md:pr-12 ${isRight ? 'md:order-2 md:pl-12 md:pr-0' : ''}`}
                    style={{
                      marginLeft: `${contentShift}px`,
                      marginTop: `${index % 3 === 0 ? 0 : index % 3 === 1 ? 4 : -4}px`,
                    }}
                  >
                    <div className="ml-12 md:ml-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-white/60 tracking-[0.08em] uppercase">
                        <span>{format(new Date(post.date), 'yyyy.MM.dd', { locale: zhCN })}</span>
                        <span>•</span>
                        <span>{post.readingTime} min</span>
                        {isFeatured && (
                          <span className="px-2 py-0.5 rounded-full border border-blue-300/40 text-blue-200">
                            Featured
                          </span>
                        )}
                      </div>

                      <Link href={`/posts/${post.slug}`}>
                        <h2 className="mt-2 text-2xl md:text-3xl font-semibold text-white leading-tight hover:text-blue-200 transition-colors">
                          {post.title}
                        </h2>
                      </Link>

                      <p className="mt-3 text-white/75 leading-relaxed line-clamp-3">{post.excerpt}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <Link
                            key={tag}
                            href={`/tags/${encodeURIComponent(tag)}`}
                            className="px-2.5 py-1 rounded-full border border-white/20 text-white/75 text-xs hover:border-white/40 hover:text-white transition-colors"
                          >
                            {tag}
                          </Link>
                        ))}
                        {post.tags.length > 4 && (
                          <span className="px-2.5 py-1 rounded-full border border-white/10 text-white/50 text-xs">
                            +{post.tags.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`hidden md:block ${isRight ? 'md:order-1' : ''}`} aria-hidden />

                  <div
                    ref={(el) => {
                      starRefs.current[index] = el;
                    }}
                    className="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-7 md:top-1/2 md:-translate-y-1/2"
                    style={{ marginLeft: `${starShift}px` }}
                  >
                    <div
                      className={`absolute inset-0 rounded-full blur-md ${
                        isFeatured ? 'w-8 h-8 -left-2 -top-2 bg-blue-300/35' : 'w-6 h-6 -left-1.5 -top-1.5 bg-blue-300/25'
                      }`}
                    />
                    <div
                      className={`relative rounded-full border border-white/70 ${isFeatured ? 'w-4 h-4 bg-blue-300' : 'w-3 h-3 bg-blue-200'}`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

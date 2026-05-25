'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PostHeading } from '@/lib/posts';

interface PostTocProps {
  headings: PostHeading[];
}

export default function PostToc({ headings }: PostTocProps) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id || '');

  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);

  useEffect(() => {
    const onScroll = () => {
      let current = headingIds[0] || '';

      for (const id of headingIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = id;
      }

      setActiveId(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headingIds]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  if (!headings.length) return null;

  return (
    <aside className="hidden lg:block lg:w-52 xl:w-56 shrink-0 sticky top-24 self-start">
      <div className="bg-slate-950/55 border border-white/15 rounded-xl p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-white/55 mb-3">目录</p>
        <nav className="space-y-1.5 max-h-[calc(100vh-8rem)] overflow-auto no-scrollbar pr-1">
          {headings.map((heading) => (
            <button
              key={heading.id}
              onClick={() => jumpTo(heading.id)}
              className={`w-full text-left rounded px-2 py-1.5 text-sm transition-colors ${
                activeId === heading.id
                  ? 'bg-blue-500/25 text-blue-100 border border-blue-300/35'
                  : 'text-white/65 hover:text-white hover:bg-white/10 border border-transparent'
              } ${heading.level === 3 ? 'pl-5' : ''}`}
              title={heading.text}
            >
              <span className="line-clamp-2">{heading.text}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

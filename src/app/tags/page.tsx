import { getAllTags, getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function TagsPage() {
  const tags = getAllTags();
  const posts = getAllPosts();

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="text-center pt-2">
        <h1 className="text-4xl md:text-5xl font-semibold text-white drop-shadow-lg">标签</h1>
        <p className="mt-3 text-white/80">按主题查看文章，快速找到你感兴趣的内容。</p>
      </section>

      <section className="bg-slate-950/70 border border-white/15 rounded-2xl p-6 md:p-10 space-y-8">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-white/55 mb-3">Tag Cloud</div>
          <div className="flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="px-3 py-1.5 rounded-full border border-white/20 text-white/80 text-sm hover:border-white/40 hover:text-white transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-white/15 pt-6">
          <div className="text-xs tracking-[0.2em] uppercase text-white/55 mb-5">All Posts</div>

          {posts.length === 0 ? (
            <p className="text-white/60">暂无文章。</p>
          ) : (
            <div className="space-y-6 md:space-y-7">
              {posts.map((post, index) => (
                <article key={post.slug} className="pb-6 border-b border-white/10 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl font-semibold text-white/20 tabular-nums min-w-[3rem]">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link href={`/posts/${post.slug}`}>
                        <h2 className="text-2xl font-semibold text-white leading-tight hover:text-blue-200 transition-colors">
                          {post.title}
                        </h2>
                      </Link>

                      <div className="mt-2 text-sm text-white/60">
                        {format(new Date(post.date), 'yyyy年MM月dd日', { locale: zhCN })}
                        <span className="mx-2">·</span>
                        {post.readingTime} 分钟阅读
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/tags/${tag}`}
                            className="px-2.5 py-1 rounded-full border border-white/20 text-white/70 text-xs hover:border-white/40 hover:text-white transition-colors"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

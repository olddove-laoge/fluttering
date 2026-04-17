import { getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Home() {
  const posts = getAllPosts();

  return (
    <div>
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4 text-white drop-shadow-lg">振翅</h1>
        <p className="text-xl text-white/80">
          记录我探索 AI Agent 的过程，从入门到实践
        </p>
      </div>

      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-white/60 bg-black/20 rounded-lg backdrop-blur-sm">
            <p>还没有文章，使用管理端发布你的第一篇文章吧！</p>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="bg-white/90 backdrop-blur-sm rounded-lg p-6 hover:bg-white transition-all hover:shadow-xl hover:scale-[1.02]"
            >
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-2xl font-bold mb-2 text-gray-800 hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
              </Link>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <time dateTime={post.date}>
                  {format(new Date(post.date), 'yyyy年MM月dd日', { locale: zhCN })}
                </time>
                <span>·</span>
                <span>{post.readingTime} 分钟阅读</span>
              </div>

              <p className="text-gray-600 mb-4">{post.excerpt}</p>

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

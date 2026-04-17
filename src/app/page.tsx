import { getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function Home() {
  const posts = getAllPosts();

  return (
    <div>
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">学习 Agent 的旅程</h1>
        <p className="text-xl text-gray-600">
          记录我探索 AI Agent 的过程，从入门到实践
        </p>
      </div>

      <div className="space-y-8">
        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>还没有文章，使用管理端发布你的第一篇文章吧！</p>
          </div>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <Link href={`/posts/${post.slug}`}>
                <h2 className="text-2xl font-bold mb-2 hover:text-primary-600">
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
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

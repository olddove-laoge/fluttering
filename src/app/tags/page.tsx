import { getAllTags, getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function TagsPage() {
  const tags = getAllTags();
  const posts = getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">标签</h1>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-3 mb-12">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* 所有文章列表 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4">所有文章</h2>
        {posts.map((post) => (
          <article
            key={post.slug}
            className="border-b pb-6 last:border-0"
          >
            <Link href={`/posts/${post.slug}`}>
              <h3 className="text-xl font-bold mb-2 hover:text-primary-600">
                {post.title}
              </h3>
            </Link>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <time dateTime={post.date}>
                {format(new Date(post.date), 'yyyy年MM月dd日', { locale: zhCN })}
              </time>
              <span>·</span>
              <span>{post.readingTime} 分钟阅读</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="text-xs text-primary-600 hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

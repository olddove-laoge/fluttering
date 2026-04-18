import { getAllTags, getPostsByTag } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { notFound } from 'next/navigation';

interface Props {
  params: { tag: string };
}

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map((tag) => ({
    tag: tag,
  }));
}

export async function generateMetadata({ params }: Props) {
  const tag = decodeURIComponent(params.tag);
  return {
    title: `标签: ${tag} | 振翅`,
  };
}

export default function TagPage({ params }: Props) {
  const tag = decodeURIComponent(params.tag);
  const tags = getAllTags();
  const posts = getPostsByTag(tag);

  if (posts.length === 0 && !tags.includes(tag)) {
    notFound();
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">标签</h1>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-3 mb-12">
        <Link
          href="/tags"
          className="px-4 py-2 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          全部
        </Link>
        {tags.map((t) => (
          <Link
            key={t}
            href={`/tags/${encodeURIComponent(t)}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              t === tag
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* 该标签的文章列表 */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          「{tag}」标签的文章
        </h2>
        {posts.length === 0 ? (
          <p className="text-gray-500">该标签下暂无文章</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.slug}
              className="border-b border-gray-200 pb-6 last:border-0"
            >
              <Link href={`/posts/${post.slug}`}>
                <h3 className="text-xl font-bold mb-2 text-gray-800 hover:text-blue-600 transition-colors">
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
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/tags/${encodeURIComponent(t)}`}
                    className={`text-xs hover:underline ${
                      t === tag ? 'text-blue-700 font-medium' : 'text-blue-600'
                    }`}
                  >
                    #{t}
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

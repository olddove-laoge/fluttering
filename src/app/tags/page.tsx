import { getAllTags, getPostsByTag, getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Props {
  searchParams: { tag?: string };
}

export default function TagsPage({ searchParams }: Props) {
  const tags = getAllTags();
  const selectedTag = searchParams.tag;
  const posts = selectedTag ? getPostsByTag(selectedTag) : getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">标签</h1>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-3 mb-12">
        <Link
          href="/tags"
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            !selectedTag
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags?tag=${encodeURIComponent(tag)}`}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedTag === tag
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* 文章列表 */}
      <div className="space-y-6">
        {selectedTag && (
          <h2 className="text-xl font-semibold mb-4">
            「{selectedTag}」标签的文章
          </h2>
        )}
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
          </article>
        ))}
      </div>
    </div>
  );
}

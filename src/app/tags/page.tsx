'use client';

import { useState } from 'react';
import { getAllTags, getPostsByTag, getAllPosts } from '@/lib/posts';
import Link from 'next/link';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 为了静态导出，获取所有数据
const allTags = getAllTags();
const allPosts = getAllPosts();
const postsByTag = new Map(
  allTags.map((tag) => [tag, getPostsByTag(tag)])
);

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const posts = selectedTag ? postsByTag.get(selectedTag) || [] : allPosts;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">标签</h1>

      {/* 标签云 */}
      <div className="flex flex-wrap gap-3 mb-12">
        <button
          onClick={() => setSelectedTag(null)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${
            !selectedTag
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              selectedTag === tag
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tag}
          </button>
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

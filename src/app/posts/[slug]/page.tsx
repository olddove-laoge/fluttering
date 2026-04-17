import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Giscus from '@/components/Giscus';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: 'Not Found' };

  return {
    title: `${post.title} | Agent Learning`,
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-gray-500">
          <time dateTime={post.date}>
            {format(new Date(post.date), 'yyyy年MM月dd日', { locale: zhCN })}
          </time>
          <span>·</span>
          <span>{post.readingTime} 分钟阅读</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags?tag=${encodeURIComponent(tag)}`}
              className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm hover:bg-primary-100"
            >
              {tag}
            </Link>
          ))}
        </div>
      </header>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mt-16 pt-8 border-t">
        <Giscus />
      </div>
    </article>
  );
}

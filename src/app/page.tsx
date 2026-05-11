import { getAllPosts } from '@/lib/posts';
import StarTimeline from '@/components/StarTimeline';

export default function Home() {
  const posts = getAllPosts();

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="text-center pt-2">
        <h1 className="text-4xl md:text-5xl font-semibold text-white drop-shadow-lg">振翅</h1>
        <p className="mt-3 text-white/80">沿着一条纵向星轨，记录每篇文章的诞生。</p>
      </section>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-white/70 bg-black/25 border border-white/15 rounded-xl">
          还没有文章，使用管理端发布你的第一篇文章吧。
        </div>
      ) : (
        <StarTimeline posts={posts} />
      )}
    </div>
  );
}

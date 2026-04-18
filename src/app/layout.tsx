import type { Metadata } from 'next';
import './globals.css';
import BackgroundCarousel from '@/components/BackgroundCarousel';
import { getBackgroundImages } from '@/lib/bg-images';

export const metadata: Metadata = {
  title: '振翅',
  description: '记录学习 Agent 过程的博客',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const images = getBackgroundImages();

  return (
    <html lang="zh-CN">
      <head>
        {/* Umami 分析脚本 */}
        <script defer src="https://cloud.umami.is/script.js" data-website-id="27056cda-05fb-4479-98d6-7dfb9f076ed1" />
      </head>
      <body className="text-gray-900 min-h-screen">
        {/* 背景图片轮播 - 自动扫描 public/bg 目录 */}
        <BackgroundCarousel
          images={images}
          interval={8000}
        />

        <div className="min-h-screen bg-black/30">
          <nav className="bg-black/40 backdrop-blur-sm border-b border-white/10">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                {/* 左侧：头像 + 标题 */}
                <a href="/" className="flex items-center gap-3 group">
                  <img
                    src="/images/avatar.jpg"
                    alt="avatar"
                    className="w-10 h-10 rounded-full border-2 border-white/50 group-hover:border-white transition-colors object-cover"
                  />
                  <span className="text-2xl font-bold text-white/90 group-hover:text-white transition-colors">
                    振翅
                  </span>
                </a>

                {/* 右侧：导航 + GitHub */}
                <div className="flex items-center gap-6">
                  <a href="/" className="text-white/70 hover:text-white transition-colors">
                    文章
                  </a>
                  <a href="/tags" className="text-white/70 hover:text-white transition-colors">
                    标签
                  </a>
                  <a href="/about" className="text-white/70 hover:text-white transition-colors">
                    关于
                  </a>
                  <a
                    href="https://github.com/olddove-laoge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2"
                  >
                    <img
                      src="https://github.com/olddove-laoge.png"
                      alt="GitHub"
                      className="w-9 h-9 rounded-full border-2 border-white/30 hover:border-white/80 transition-colors bg-gray-800"
                    />
                  </a>
                </div>
              </div>
            </div>
          </nav>

          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>

          <footer className="border-t border-white/10 mt-16 py-8 bg-black/20">
            <div className="max-w-4xl mx-auto px-4 text-center text-white/50">
              <p>Built with Next.js & Markdown</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Learning Blog',
  description: '记录学习 Agent 过程的博客',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Umami 分析脚本 */}
        <script defer src="https://cloud.umami.is/script.js" data-website-id="27056cda-05fb-4479-98d6-7dfb9f076ed1" />
      </head>
      <body className="bg-gray-50 text-gray-900">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-primary-600">
                Agent Learning
              </a>
              <div className="flex gap-6">
                <a href="/" className="text-gray-600 hover:text-primary-600">
                  文章
                </a>
                <a href="/tags" className="text-gray-600 hover:text-primary-600">
                  标签
                </a>
                <a href="/about" className="text-gray-600 hover:text-primary-600">
                  关于
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center text-gray-500">
            <p>Built with Next.js & Markdown</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

const postsDirectory = path.join(process.cwd(), 'posts');

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w一-龥-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  if (Array.isArray(node.children)) {
    return node.children.map((child: any) => extractText(child)).join('');
  }
  return '';
}

export interface PostHeading {
  id: string;
  text: string;
  level: number;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  tags: string[];
  readingTime: number;
  views?: number;
  headings?: PostHeading[];
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      // 获取文件修改时间（用于相同日期的排序）
      const stats = fs.statSync(fullPath);
      const modifiedTime = stats.mtime.getTime();

      // 计算阅读时间（假设每分钟阅读 200 字）
      const wordCount = content.replace(/\s/g, '').length;
      const readingTime = Math.ceil(wordCount / 200);

      return {
        slug,
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || content.slice(0, 150) + '...',
        content,
        tags: data.tags || [],
        readingTime,
        modifiedTime,
      };
    })
    .sort((a: any, b: any) => {
      // 首先按日期排序
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      // 日期相同则按文件修改时间排序（新的在前）
      return b.modifiedTime - a.modifiedTime;
    });

  return allPosts;
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const headings: PostHeading[] = [];
  const slugCount = new Map<string, number>();

  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkMath)
    .use(() => (tree: any) => {
      const walk = (node: any) => {
        if (!node) return;

        if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
          const text = extractText(node).trim();
          if (text) {
            const base = slugifyHeading(text);
            const used = slugCount.get(base) || 0;
            const id = used === 0 ? base : `${base}-${used + 1}`;
            slugCount.set(base, used + 1);

            node.data = node.data || {};
            node.data.hProperties = node.data.hProperties || {};
            node.data.hProperties.id = id;

            headings.push({ id, text, level: node.depth });
          }
        }

        if (Array.isArray(node.children)) {
          node.children.forEach((child: any) => walk(child));
        }
      };

      walk(tree);
    })
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(content);
  const contentHtml = processedContent.toString();

  const wordCount = content.replace(/\s/g, '').length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    slug,
    title: data.title || 'Untitled',
    date: data.date || new Date().toISOString(),
    excerpt: data.excerpt || content.slice(0, 150) + '...',
    content: contentHtml,
    tags: data.tags || [],
    readingTime,
    headings,
  };
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tagSet = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet);
}

export function getPostsByTag(tag: string): Post[] {
  const posts = getAllPosts();
  return posts.filter((post) => post.tags.includes(tag));
}

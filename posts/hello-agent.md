---
title: Welcome to fluttering
date: '2026-04-18'
tags:
  - Hello World
  - olddove
excerpt: 欢迎来到fluttering!这里是介绍！
---
# Welcome to My blog
各位好，我是老鸽，这是我通过vibe coding制作的一个个人博客网站，技术栈如下所示
 1. 前端框架：Next.js 14

  - 静态导出 (output: 'export')：生成纯 HTML/CSS/JS，部署到任何静态托管
  - App Router：新的文件路由系统，支持服务端组件
  - TypeScript：类型安全，开发体验好
  - 图片优化：自动优化和懒加载

  src/app/
  ├── page.tsx          # 首页
  ├── posts/[slug]/     # 文章详情页（动态路由）
  ├── tags/             # 标签页
  ├── about/            # 关于页
  └── layout.tsx        # 全局布局

  2. 样式：Tailwind CSS

  特点：
  - 原子化 CSS：bg-white, p-4, rounded-lg 这样的工具类
  - 响应式：内置 md:, lg: 等断点
  - 暗黑适配：使用 white/90, black/30 这种带透明度的颜色，适配背景图

  3. 内容：Markdown 驱动

  工具链：

  ┌─────────────┬─────────────────────────────────────────────┐
  │     包      │                    作用                     │
  ├─────────────┼─────────────────────────────────────────────┤
  │ gray-matter │ 解析 YAML frontmatter（标题、日期、标签）   │
  ├─────────────┼─────────────────────────────────────────────┤
  │ remark      │ Markdown → AST（抽象语法树）                │
  ├─────────────┼─────────────────────────────────────────────┤
  │ remark-html │ AST → HTML                                  │
  ├─────────────┼─────────────────────────────────────────────┤
  │ remark-gfm  │ 支持 GitHub 风格 Markdown（表格、删除线等） │
  └─────────────┴─────────────────────────────────────────────┘

  工作流程：
  posts/hello-agent.md → gray-matter → remark → HTML → 页面

  4. 部署：Vercel

  - 与 Next.js 深度集成
  - 自动部署：git push 自动触发
  - 全球 CDN：自动分发到全球节点
  - 免费额度：个人项目完全够用

  5. 统计：Umami

  - 开源：代码透明，自己掌控数据
  - 隐私友好：无 Cookie，不需要弹窗
  - 轻量：脚本很小，不影响性能

  数据流向：
  访客访问博客 → Umami 脚本上报 → Umami Cloud 面板 → 管理端 API 拉取

  6. 评论：Giscus

  原理：
  - 使用 GitHub Discussions 存储评论
  - 每篇文章对应一个 Discussion
  - 读者用 GitHub 账号登录评论

  优势：
  - 免费、稳定
  - 通知直达 GitHub
  - 数据不怕丢失

  ---
  管理端技术栈（admin/）

  管理端是完全独立的 Next.js 项目，只在你本地运行。

  1. Monaco Editor

  - VS Code 同款编辑器
  - 支持 Markdown 语法高亮
  - 实时预览分屏

  2. Git 自动化

  使用 Node.js child_process：
  execSync('git add .')
  execSync('git commit -m "xxx"')
  execSync('git push')
  实现"一键发布"。

  3. 数据可视化：Recharts

  - 浏览量趋势图（折线图）
  - 热门文章排名（柱状图）

当然，这个技术栈也是用claude写的，笔记我不懂网页部署（
这个博客将会记录我的agent以及大模型相关知识的学习经历，写下自己的一些思考，也算是我的一个公开笔记本？
不知道你是怎么找到这个博客的，不管怎样，欢迎你的到来！如果有什么建议，欢迎在我的帖子下评论，或者直接查看右上角我的github界面，通过邮箱联系我！

# Agent Learning Blog

一个基于 Next.js + Markdown 的个人博客系统，专为记录学习 Agent 过程而设计。

## 特点

- **公开博客**：所有人可访问，部署在 Vercel（免费）
- **私有管理端**：仅你可用，包含编辑、统计、发布功能
- **Markdown 写作**：支持代码高亮、数学公式
- **数据分析**：接入 Umami 开源分析
- **评论系统**：基于 Giscus（GitHub Discussions）
- **一键发布**：保存文章后自动 Git 提交部署

## 目录结构

```
my-blog/
├── posts/              # Markdown 文章目录
├── src/               # 博客前端代码
├── admin/             # 本地管理端（仅你使用）
│   ├── src/          # 管理端代码
│   └── package.json
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
# 安装博客依赖
cd my-blog
npm install

# 安装管理端依赖
cd admin
npm install
```

### 2. 配置环境

#### 博客端配置（`src/app/layout.tsx`）

1. **Umami 分析**：替换为你自己的 Umami 实例
   ```tsx
   <script
     async
     defer
     data-website-id="YOUR_WEBSITE_ID"
     src="YOUR_UMAMI_URL/umami.js"
   />
   ```

2. **Giscus 评论**：在 `src/components/Giscus.tsx` 中配置
   - 访问 [giscus.app](https://giscus.app) 获取配置
   - 替换 `data-repo`, `data-repo-id` 等字段

#### 管理端配置

管理端不需要额外配置，它直接操作本地的 Git 仓库。

### 3. 启动开发服务器

```bash
# 终端 1：启动博客（端口 3000）
cd my-blog
npm run dev

# 终端 2：启动管理端（端口 3001）
cd my-blog/admin
npm run dev
```

### 4. 部署博客到 Vercel

```bash
# 1. 将代码推送到 GitHub
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. 在 Vercel 导入项目，自动部署
# 博客将部署到 https://your-blog.vercel.app
```

## 工作流程

1. **写文章**：访问 `http://localhost:3001/editor`
2. **保存**：点击"保存草稿"或"保存并发布"
3. **发布**：在仪表盘点击"一键发布"，自动 Git 提交并推送到远程
4. **自动部署**：Vercel 检测到 Git 推送后自动重新部署博客

## 功能说明

### 管理端功能

| 功能 | 说明 |
|------|------|
| **仪表盘** | 查看文章数量、浏览量、热门文章、Git 状态 |
| **文章管理** | 查看、编辑、删除所有文章 |
| **新建文章** | Markdown 编辑器 + 实时预览 |
| **数据分析** | 浏览趋势图、热门文章 TOP 10 |

### 数据来源

- **浏览量**：来自 Umami 分析 API（需要配置 Umami 访问密钥）
- **文章数据**：直接读取本地 `posts/` 目录

## 配置 Umami 数据获取

编辑 `admin/src/app/api/analytics/route.ts` 和 `stats/route.ts`，替换模拟数据为真实的 Umami API 调用：

```typescript
// 从 Umami 获取真实数据
const response = await fetch(`${UMAMI_URL}/api/websites/${WEBSITE_ID}/stats`, {
  headers: {
    'Authorization': `Bearer ${UMAMI_TOKEN}`
  }
});
```

## 技术栈

- **博客**：Next.js 14 + React + TypeScript + Tailwind CSS
- **管理端**：Next.js + Monaco Editor + Recharts
- **统计**：Umami（自托管开源分析）
- **评论**：Giscus（GitHub Discussions）
- **部署**：Vercel（免费）

## 许可证

MIT

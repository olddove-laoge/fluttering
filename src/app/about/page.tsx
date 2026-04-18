export default function AboutPage() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">关于</h1>

      <div className="prose max-w-none text-gray-700">
        <p className="text-lg mb-6">
          大家好！我是老鸽（olddove-laoge），目前正在学习 agent 开发以及大模型相关知识，这里是我的个人博客，名为振翅（fluttering），也算是鸽子的意向？不管怎样，欢迎你阅读我的博客！
        </p>

        <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">本博客涵盖的内容</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Agent 架构与设计模式</li>
          <li>大模型对齐，训练，以及相关的位置编码，各类注意力变体等</li>
          <li>Agent 工具调用手段，记忆管理等技术</li>
          <li>多 Agent 协作系统</li>
          <li>实际项目实践与踩坑记录</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">技术栈</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Next.js 14 - 博客框架</li>
          <li>Markdown - 文章格式</li>
          <li>Umami - 开源分析</li>
          <li>Giscus - 基于 GitHub Discussions 的评论</li>
        </ul>

        <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">联系我</h2>
        <p>
          有问题或建议？欢迎在文章下方留言，或通过 GitHub 联系我。
        </p>
      </div>
    </div>
  );
}

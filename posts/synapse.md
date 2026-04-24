---
title: Synapse开发日志&遇到的困难
date: '2026-04-24'
tags:
  - Agent
excerpt: 准备参加AIGC的作品 Synapse 的开发日志
---
## 项目功能
Synapse是一款基于HippoRAG思想，结合LlamaParse文档分析功能与LlamaIndex agent框架，以Mem0为记忆管理系统的可交互式图式笔记，用户可上传各类文档，agent自动抽取为图式笔记，用户可针对某节点进行提问，LLM依据自身能力或联网搜索功能拓展知识点并更新图，达到递归式学习的效果

## 目前已完成的部分
**核心流程**：
LlamaParse -> chunking -> llm提取fact -> 抽取关系三元组 -> 放入Neo4j数据库 -> 映射到igraph方便后续HippoRAG流程 -> 使用BGE + BM25双塔召回得到topk fact -> 根据fact得到图中的起点节点 -> PPR算法得到最相关的chunk -> 返回topk chunks -> 模型回复 -> 总结回复内知识点，检查是否有值得提取的三元组，更新图

## 目前问题
### 1.实体消歧
会经常出现，不同chunk内相同的概念被分别抽取，导致缓存过多，图过于冗余

### 2.提取到无用信息
虽然已经优化了提取提示词，但还是会出现一些事实性的东西 而非知识点

## 待需完成的部分
接入LlamaIndex与Mem0系统

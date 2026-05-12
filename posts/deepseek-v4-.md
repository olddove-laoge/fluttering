---
title: DeepSeek V4 论文阅读(长期更新)
date: '2026-05-11'
tags:
  - LLM
  - 笔记
excerpt: 阅读DeepSeekV4论文的思考与笔记，长期更新
---
大致阅览了一下, DeepSeekV4的核心创新主要是以下几个部分：CSA,HCA,mHC以及Muon。其中, CSA和HCA都属于注意力机制变体，起到通过压缩KV cache提高长上下文能力的作用，mHC是一种残差连接变体，比普通残差更能连接上下文。Muon我还没看。
##总体架构
![image](/images/posts/1778545767059-zn1wf0.png)
这张图是DeepseekV4的核心流程图，我简单口述下具体是个什么流程
首先，将用户输入Input Tokens转化为词向量Embedding,先进行一个块前混合，交给CSA/HCA的混合注意力机制架构，再块前混合后与原Embedding残差混合，下一步和上述过程差不多，只不过交给了MoE而已，DeeepSeekMoE是沿用的v3的技术，就不多赘述了
## CSA
在DeepSeekV4的论文中，CSA流程图大致如下，我们一一讲解
![image](/images/posts/1778544738870-7md5tb.png)
CSA最重要的作用就是通过将m个Token的KV cache压缩为1/m大小，再结合 Lightning Indexer 的稀疏选择，最终实际参与计算的 KV 只有原来的几十分之一。
同时，由于用于压缩的滑动窗口会有重叠，CSA在压缩过程中会保留上下文依赖关系，这也是CSA的独特之处。接下来，我们来详细介绍CSA的流程与逻辑
### Step1 Token-Level Compressor
CSA的Token级压缩本质是通过两个大小为M的滑动窗口经过一系列计算得到的，我们先给出原文公式，再详细讲解
原文是这样描述的

\[C^{a}=H \cdot W^{aKV}, C^{b}=H \cdot W^{b K V}, \quad (9)\]

\[Z^{a}=H \cdot W^{a Z}, Z^{b}=H \cdot W^{b Z}, (10)\]
where \(W^{a K V}\) \(W^{b K V}\) , \(W^{a Z}\) \(W^{b Z} \in \mathbb{R}^{d ×c}\) are trainable parameters. Next, each m KV entries in \(C^{a}\) and \(C^{b}\) will be compressed into one entry according to their compression weights and learnable positional biases \(B^{a}\) , \(B^{b} \in \mathbb{R}^{m ×c}\) , producing \(C^{Comp } \in \mathbb{R}^{\frac{n}{m} ×c}\) . Each compressed entry \(C_{i}^{Comp } \in \mathbb{R}^{c}\) is computed by 
\[\left[S_{m i: m(i+1)-1}^{a} ; S_{m(i-1): m i-1}^{b}\right]=Softmax_{row }\left(\left[Z_{m i: m(i+1)-1}^{a}+B^{a} ; Z_{m(i-1): m i-1}^{b}+B^{b}\right]\right), (11)\]

\[C_{i}^{Comp }=\sum_{j=m i}^{m(i+1)-1} S_{j}^{a} \odot C_{j}^{a}+\sum_{j=m(i-1)}^{m i-1} S_{j}^{b} \odot C_{j}^{b},\]
where \(\odot\) denotes the Hadamard product; Softma \(x_{row }(\cdot)\) denotes the softmax operation along the row dimension, which performs normalization across the total of \(2 m\) elements from both \(Z^{a}\) and \(Z^{b}\) . When \(i=0\) \(Z_{m(i-1): m i-1}^{b}\) is padded with negative infinity and \(C_{m(i-1): m i-1}^{b}\) is padded with zeros. Note that each \(C_{i}^{Comp }\) is derived from 2𝑚KV entries, but the indexes of \(C^{b}\) used for \(C_{i}^{Comp }\) and the indexes of \(C^{a}\) used for \(C_{i-1}^{Comp }\) are overlapped. Therefore, CSA in fact compresses the sequence length to \(\frac{1}{m}\) times.

要上课了，先写到这

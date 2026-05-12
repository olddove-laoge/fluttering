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

\[C^{a}=H \cdot W^{aKV}, C^{b}=H \cdot W^{b K V}\tag{9}\]

\[Z^{a}=H \cdot W^{a Z}, Z^{b}=H \cdot W^{b Z}\tag{10}\]

where \(W^{aKV}\), \(W^{bKV}\), \(W^{aZ}\), \(W^{bZ} \in \mathbb{R}^{d \times c}\) are trainable parameters. Next, each \(m\) KV entries in \(C^{a}\) and \(C^{b}\) will be compressed into one entry according to their compression weights and learnable positional biases \(B^{a}\), \(B^{b} \in \mathbb{R}^{m \times c}\), producing \(C^{\text{Comp}} \in \mathbb{R}^{\frac{n}{m} \times c}\). Each compressed entry \(C_{i}^{\text{Comp}} \in \mathbb{R}^{c}\) is computed by

\[\left[S_{m i: m(i+1)-1}^{a} ; S_{m(i-1): m i-1}^{b}\right]=\text{Softmax}_{\text{row}}\left(\left[Z_{m i: m(i+1)-1}^{a}+B^{a} ; Z_{m(i-1): m i-1}^{b}+B^{b}\right]\right)\tag{11}\]

\[C_{i}^{\text{Comp}}=\sum_{j=m i}^{m(i+1)-1} S_{j}^{a} \odot C_{j}^{a}+\sum_{j=m(i-1)}^{m i-1} S_{j}^{b} \odot C_{j}^{b},\]

where \(\odot\) denotes the Hadamard product; \(\text{Softmax}_{\text{row}}(\cdot)\) denotes the softmax operation along the row dimension, which performs normalization across the total of \(2 m\) elements from both \(Z^{a}\) and \(Z^{b}\). When \(i=0\), \(Z_{m(i-1): m i-1}^{b}\) is padded with negative infinity and \(C_{m(i-1): m i-1}^{b}\) is padded with zeros. Note that each \(C_{i}^{\text{Comp}}\) is derived from \(2m\) KV entries, but the indexes of \(C^{b}\) used for \(C_{i}^{\text{Comp}}\) and the indexes of \(C^{a}\) used for \(C_{i-1}^{\text{Comp}}\) are overlapped. Therefore, CSA in fact compresses the sequence length to \(\frac{1}{m}\) times.

我们来解释下各个符号的内涵
H：当前层输入的所有 token 隐向量（shape: n × d）
d：模型隐层维度
c：attention head 维度（比 d 小）
n：序列长度
m：压缩块大小（论文里 m=4，每 4 个 token 压成 1 个）
\(W^{aKV}, W^{bKV}\)：两组可学习矩阵，用来得到两组 KV
\(W^{aZ}, W^{bZ}\)：两组可学习矩阵，用来得到压缩权重
\(C^{a}, C^{b}\)：两组压缩用的 KV 向量
\(Z^{a}, Z^{b}\)：两组压缩权重（决定每个 token 占多少比例）
\(B^{a}, B^{b}\)：位置偏置（可学习）
\(S^{a}, S^{b}\)：经过 softmax 归一化后的最终融合权重
\(C^{Comp}\)：压缩后的 KV 条目（CSA 的核心输出）
\(\odot\)：逐元素相乘（不是矩阵乘

我们来看第一个公式，这个公式的目的是把输入 H 分别过两个不同线性层，得到 两套 KV 向量。至于为什么要分为两套，和后面的重叠压缩有关，等我们讲到那里时再详细说明
再看第二个，这个公式把输入 H 过另外两个线性层，得到 两套 “权重分数”。这分数决定：等下压缩时，每个 token 占多少比重。
接下来是重头戏，我们先讲原理，再将公式3和4
首先我们需要知道，CSA的重叠压缩逻辑是通过两个长度为m的滑动窗口（也就是公式中的mi:m(i+1)-1与m(i-1):mi-1，为了和公式能够较好的对应，我们称之为A窗口和B窗口）实现
两个滑动窗口初始相位相差m,也就是说，AB两个窗口的轨迹是如下的
A 0-3 B 空
A 4-7 B 0-3
A 8-11 B 4-7
A 12-15 B 8-11
很容易发现，每次滑动窗口的过程中，总会和上一次的窗口发生重叠，这是CSA能够掌握上下文关系的重要手段，接下来，我们回归到公式。第三个公式主要做了以下几个任务
取出两段 Z
\(Z^a\) 取当前 m 个 token
\(Z^b\) 取上一组 m 个 token
各自加可学习位置偏置\(+B^a,\;+B^b\)给两段窗口各自补上位置信息，让模型知道这两段在序列里的位置差异。
竖着拼接 → 一起做全局 Softmax\([\; \dots ; \dots \;]\) 是上下拼把 前 m 个 + 当前 m 个 拼成一共 2m 个分数，一次性整体 Softmax，生成归一化权重 \(S^a,S^b\)。
此时也能解答之前的问题，为什么需要两套KV向量，毕竟如果是单窗口滑动，也能实现重叠。具体原因如下
从上述A,B滑动过程中发现，每一组窗口是由current window（新信息）和previous tail（过渡 / 上下文）组成的，而两者特征分布不同，必须用两套独立 KV 投影。这也是为什么需要实现重叠，没有重叠的话，会丢失上下文关系
最后通过第四个公式，对每个token加权求和，得到最终向量

累了，先写到这
感觉很多措辞和语言逻辑还有待改进，唉唉

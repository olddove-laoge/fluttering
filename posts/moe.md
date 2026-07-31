---
title: MoE相关知识点的汇总与讲解(上)
date: '2026-07-31'
tags:
  - LLM
  - MoE
  - Transformer
excerpt: 这个应该算是和我那篇KL散度一个系列的文章……
---
## 引言
在写了之前那篇KL散度的文章之后受到了许多佬友的鼓励！深受感动，果然来L站是正确的选择(，今天给大家带来的是MoE相关知识点，其在Transformer中有着相当重要的地位。但是发现很多初学者(包括我)只知道MoE的基本概念:不让所有参数每次都工作，把模型分成很多“专家”，每次输入只激活其中一小部分专家。但是对于MoE背后的专家选择机制(路由)及变体，负载均衡，容量相关机制都不太深入了解，甚至连MoE在模型训练中所处的位置都不知道(好吧就是我)。因此这边写一篇文章来详细讲解下MoE背后更深层次的知识点。
关于KL散度那篇，我这边目前遇到了些问题，稍微鸽一下(，私密马赛
## MoE基本定义
### MoE是什么，在哪？
就像我开头所说的，一些初学者甚至不知道MoE在模型训练中所处的位置。在llm中，它通常放在 Transformer block 的前馈网络 FFN 位置。换句话说，MoE就是更加高级的FFN。
为了更新下的说明MoE作用，我这边简单讲解下FFN又是什么。
我们都知道Transformer架构最出名的就是其注意力机制，但是，在Attention层之后，交换过上下文的token们又去了哪里呢？就是FFN层，FFN的本质是一个我们都很熟悉的的东西，MLP(多层感知机)(不过现在很多实现用了GLU系列的门控变体，这里为了方便讲解简略了)。FFN对每个 token 的表示进行独立的非线性特征变换，其主要作用如下
- 增加非线性表达能力：注意力层主要做 token 之间的信息混合；FFN 通过激活函数学习更复杂的特征组合。
- 加工每个 token 聚合后的信息：自注意力让一个 token 读取上下文，FFN 则把读到的信息进一步“理解”和重编码。

而MoE作为FFN的高级替代，把这个 FFN 替换成多个专家：Expert_1(x), Expert_2(x), ..., Expert_N(x)，每个 Expert 通常本身就是一个 FFN。然后用一个 Router/Gate 决定当前 token 送给哪些专家。这就是MoE最基本的概念了。
FFN的主要作用就是MoE的最基本作用，我们接下来讲MoE相比FFN有哪些优势。
### MoE的优势
**1. 最主要作用：提高参数容量**

普通 dense 模型中，每个 token 都要经过所有参数。
例如一个普通 FFN：
每个 token → 同一个 FFN
而 MoE 中有很多 FFN expert：
每个 token → router 选择 1~2 个 expert
这意味着模型可以存储更多知识、模式和能力。

**2. 让不同 expert 学习不同模式**

不同 token、不同上下文会被分配给不同专家。
理想情况下：
数学类 token → 某些专家
代码类 token → 某些专家
多语言 token → 某些专家

注意这不是人工指定的，而是训练过程中 router 自动学出来的。
所以 MoE 可以让模型形成某种“专家分工”。
但要注意：expert 的分工通常不是完全可解释的，不能简单认为：

Expert 1 = 数学专家
Expert 2 = 中文专家
Expert 3 = 代码专家
实际分工可能更复杂

**3. 提升训练效率和 scaling 效率**
在大模型 scaling 中，能力通常和以下因素有关：
- 参数量
- 训练数据量
- 计算量
- 模型结构

MoE 通过稀疏激活，使得模型可以在相近 FLOPs 下拥有更多参数。
这通常带来更好的 scaling efficiency。


## 路由：专家选择机制
我们在上一章中说过，MoE用一个 Router/Gate 决定当前 token 送给哪些专家,这个Router就是我们所说的路由。
### 初始阶段 TopK 与 Auxiliary Load Balancing Loss
路由机制也有一定的发展历史，在一开始，MoE使用纯topk机制，训练一个线性层作为router，在接收到token后对每个专家进行打分，再通过sofmax得出各个专家被选中的概率并排序，选择前k个将token输入进去。但是这样及其容易发生由于一两个专家初始表现较好导致后续评分一直较高，从而导致**负载不均衡**的现象，具体表现如下
- 专家过载：某些 expert 收到太多 token。
- 专家闲置：某些 expert 几乎没有训练信号。
- 训练不稳定：router 越用某些 expert，它们越强，其他 expert 更弱。
- 计算浪费：MoE 设计了很多 expert，但实际只用了少数。
- token dropping：如果 expert 有容量(这个容量我们后面会讲)上限，过载 expert 收不下的 token 会被丢弃或走 fallback。

这些问题与我们设计MoE的初心是背道而驰的，为此，出现了Auxiliary Load Balancing Loss(我们后面统称aux Loss)，中文常叫辅助负载均衡损失，来解决该问题。
aux Loss函数定义为：
$$
L_{\text{aux}} = \alpha \cdot N \sum_{i=1}^N f_i \cdot P_i
$$
其中：
- $$f_i = \frac{1}{T} \sum_{t=1}^T \mathbb{1}\{\arg \max_j s_j(x_t) = i\} $$  表示分配给 expert \( i \) 的 token 比例（不可微，基于样本估计）。

- $$ P_i = \frac{1}{T} \sum_{t=1}^T g_i(x_t) $$ 表示 expert \( i \) 的平均被选中概率（可微，softmax 输出）。

- α是损失权重（常用值为 $$ 10^{-2} $$)）。

- N 是 expert 数量；T 是 batch 中的 token 总数。

我们来举几个直观的数据例子来讲解aux Loss是怎么发挥作用的
假设有 4 个 experts。
均衡情况
f = [0.25, 0.25, 0.25, 0.25]
P = [0.25, 0.25, 0.25, 0.25]

此时
Σ f_i P_i
= 0.25×0.25 + 0.25×0.25 + 0.25×0.25 + 0.25×0.25
= 0.25

乘以 N=4：
L_aux = 1

不均衡情况
f = [0.90, 0.05, 0.03, 0.02]
P = [0.80, 0.10, 0.05, 0.05]

此时
Σ f_i P_i
= 0.90×0.80 + 0.05×0.10 + 0.03×0.05 + 0.02×0.05
= 0.7275

乘以 N=4：
L_aux = 2.91
比均衡情况大，所以会被惩罚。

简单讲解下这个公式为什么能够起作用，控制复杂均衡吧
这个公式的大致设计逻辑是：用不可导的实际负载 f_i 告诉我们哪个 expert 忙；用可导的 router 概率 P_i 去惩罚 router 继续偏爱这些忙 expert。
f_i · P_i = 忙的 expert 还被继续偏爱的程度
如果某个 expert 已经很忙，而且 router 还给它很高概率，那么这一项就很大。惩罚就会很高，这就是其能控制负载均衡的原理

### MoE容量(capacity): BUG高发地(大概
其实这章本来应该在后面一些的位置，而且应该单独成一章的，但是发现如果不提早讲解容量机制的话，路由机制的一些内容不是很好讲解，容量和路由机制之间的关联也不好理解，只好作为路由机制的子章节，放在这个位置了
#### 定义
Capacity 指的是每个 expert 在一次 forward 中最多能处理多少 token。
MoE 里不是所有 token 都进同一个 FFN，而是经过 router 分配给不同 expert：
但是在 GPU 上训练/推理时，不能让 expert 接收无限多 token。为了方便并行和张量静态化，通常会给每个 expert 设置一个容量上限。
例如：
当前 batch 总 token 数 T = 1024
expert 数 N = 8
top-k = 1
理想情况下，每个 expert 平均处理：
1024 / 8 = 128 tokens
但实际 router 可能分配不均：
Expert 1: 300 tokens
Expert 2: 200 tokens
Expert 3: 150 tokens
Expert 4: 100 tokens
……
如果系统不给 capacity，那么 Expert 1 要处理 300 个 token，Expert 8 只处理 44 个 token，计算极不均衡，GPU 会等待最忙的 expert。
所以会设置：
capacity_i = 每个 expert 最多处理 C 个 token
常见公式是：
$$
C = \left[ \alpha \cdot \frac{T \cdot k}{N} \right]
$$
其中：
T = 当前 batch token 数
k = 每个 token 选择几个 expert
N = expert 数量
α = 容量系数(capacity_factor)
例如：
T = 1024
N = 8
k = 1
α
那么：
capacity = ceil(1.25 × 1024 × 1 / 8)
         = ceil(160)
         = 160
也就是说，每个 expert 最多接收 160 个 token。

那么，公式中出现的α:capacity_factor是什么呢？
capacity_factor 是一个安全余量。
如果token完全平均分配，每个 expert 应该处理：T × k / N 个token
但是由于路由本身的机制(这个我们后面讲解) token的分配不可能完全均匀，所以需要给一点额外空间，以保证那些被"偏爱"的专家不会"溢出"：
此时将capacity_factor设置为 > 1 的值即可。

#### Token dropping
Token Dropping 指的是：某个 expert 收到的 token 数超过 capacity 后，超出的 token 不再被该 expert 正常处理。其意味着token没有得到完整计算。会导致如下一系列问题
- 部分 token 的 expert 路径没有梯度
- 训练信号丢失
- 模型容量利用不足
- router 学习不稳定

尤其如果 dropping 集中发生在某些类型 token 上，可能会形成偏差。
例如代码 token 总是被路由到某几个 expert，而这些 expert 总是过载，那么代码 token 更容易被 drop，代码能力就可能受损。

#### Routing Collapse
如果 router 没有进行负载均衡，训练初期某些 expert 偶然被多选 → 它们参数被更新更多 → 下次更可能被选 → 强者愈强 → 少数 expert 通吃，多数饿死。这就是 routing collapse。
Routing Collapse是导致Token Dropping的最主要原因，也是容量计算公式需要容量系数的原因，更是我们需要实现负载均衡的根本原因
至此，MoE的路由机制，容量机制之间的关系就被打通了，我们后面讲解也会更加方便。
### 负载均衡的另一手段: Expert Choice Routing
Expert Choice Routing 与传统Topk选择机制想法，传统Topk让token选专家，而Expert Choice Routing让expert选择topc个token，这就使其天然具有负载均衡特性，具体原因如下所示：
每个 expert 看所有 tokens
↓
expert 选择自己最想处理的 top-c tokens

例如有 4 个 experts，每个 expert 的 capacity 是 2：
Expert 1 选择 Token 3, Token 8
Expert 2 选择 Token 1, Token 5
Expert 3 选择 Token 2, Token 7
Expert 4 选择 Token 4, Token 6
这样每个 expert 都恰好处理 2 个 token。
如果某个 token 被多个 experts 选中，就把多个 expert 输出加权合并。
所以 Expert Choice 的核心特点是：expert 负载天然均衡

其另一个优点是不会有 expert 过载，因为top-c的c值一定是在每个专家的容量以下的。
Expert Choice Routing的缺陷也很明显
- token 可能没有 expert
因为是 expert 选 token，不保证每个 token 都被选中。
这时token就可能直接跳过MoE层，导致模型理解能力下降
- token 可能被太多 experts 选中
某些 token 对很多 expert 都有高分，就可能被多个 expert 同时选中：
这会导致该 token 得到更多计算，也可能增加 combine 复杂度。
- 最大缺陷 破坏自回归模型的因果性
Expert Choice路由让每个专家从整个序列（包括未来token）中选择最优的token进行处理。这引入了非因果依赖，导致模型在训练时使用了“未来信息”。当模型在推理时逐token生成，这种“作弊”行为会造成训练与推理的不匹配，严重影响模型的准确性和泛化能力。

### aux Loss的问题与Auxiliary-Loss-Free Balance
aux Loss固然是解决负载不均衡的一个好方法，但是也有一定的缺陷。
我们知道aux Loss的函数定义为
$$
L_{\text{aux}} = \alpha \cdot N \sum_{i=1}^N f_i \cdot P_i
$$
它确实能让 expert 使用更均衡。但问题是，这个 loss 会**参与反向传播**。
也就是说，router 参数不仅会受到主任务 loss 的梯度影响：还会受到负载均衡 loss 的梯度影响。辅助损失产生的梯度会与主任务的梯度方向冲突，相当于在模型学习主要技能时“拖后腿”。使得MoE会陷入一种"左右脑互博的状态"，既想让专家分化，使不同专家具有不同特长；又想让专家之间负载均衡，这是矛盾的。
α 太小 → 负载不均衡，expert collapse
α 太大 → router 被强行均衡，损害语言建模能力

所以 Auxiliary-Loss-Free Balance 想解决的问题是：我既想让 expert 负载均衡，又不想让辅助 loss 的梯度干扰主任务训练，其核心思路可以概括为：给每个 expert 加一个偏置项 ，只用于 top-k 选择，不进梯度。

我们来更加详细的讲解下 Auxiliary-Loss-Free Balance 的思路
传统 top-k routing 是：
选择 TopK({s_{1,t}, s_{2,t}, ..., s_{N,t}})
Auxiliary-Loss-Free Balance 改成：
选择 TopK({s_{1,t}+b_1, s_{2,t}+b_2, ..., s_{N,t}+b_N})
其中：b_i = expert i 的动态 bias
所以路由选择不再只看原始分数 s_i,t，而是看：
biased score = s_{i,t} + b_i
如果某个 expert 最近太忙，就降低它的 b_i；如果某个 expert 最近太闲，则反之。这样 router 下一步就会自然少选忙 expert，多选闲 expert。
而这个b_i偏置项只在Top_k阶段对专家原始得分进行增减，不会参与进梯度计算。专家选择路由仍用原始的s_i进行训练，从而就使得负载均衡与专家特化两个目的不会互相冲突。
bias的具体更新公式如下
bias_i = bias_i - (γ × (实际负载_i - 平均负载))
bias_i 代表第 i 个专家的偏置值，γ 代表更新速率 (Update Rate)，是一个需要调整的超参数。

先写到这里吧，有点力竭了，下次继续更新，会讲一些MoE相比于FFN的复杂度，显存区别，以及现在常用的MoE变体之类的，还有一个老生常谈的问题:Temperature = 1的情况下，为什么每次输出还会不一样，这与MoE的路由机制有很大的关系，也牵扯到我们后续会谈的一个MoE变体:Soft MoE。大概就是这些内容
我们下次见

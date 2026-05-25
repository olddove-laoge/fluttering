---
title: (新坑) TileLang
date: '2026-05-25'
tags:
  - LLM
  - CUDA
excerpt: 准备揭榜挂帅，阅读tilelang项目
---
最近被拉去准备打挑战杯揭榜挂刷了，似乎赛题需要用到tilelang，故稍微看了下原项目，原项目下的文档其实已经相当详细了，我这里只是以我自己的理解与方法再输出一下(
我先看的是项目doc文件夹下的programming_guide部分，我们也从这里开始讲
## TileLang是什么
起码从我已经看的文档来看，以我的视角，tilelang就像是一个可以用python风格优雅简洁的进行gpu编程，并会智能自动优化的python库。不知道这个理解有没有问题，暂时先这样阐述。
## 基础语法
这部分比较直白，我就直接翻译过来吧
补:好吧，写一半发现还是要扒拉下源码，我对py也没有那么熟悉啊，悲/
### 1. 使用 @T.prim_func 定义 Kernel
TileLang 的 Kernel 是由 @T.prim_func 装饰器生成的 TIR（TVM IR）函数。其参数需要通过 T.Tensor 或 T.Buffer 来注解形状（Shape）和数据类型（Dtype）。

关于这个 @T.prim_func 的实际作用，我们后面来讲

- 关于数据类型的说明
可以传入字符串形式的数据类型（例如 'float32'）、TileLang 自身的数据类型（例如 T.float32），或者深度学习框架的数据类型（例如 torch.float32）。TileLang 会对这些类型进行统一的标准化。

```python
@T.prim_func
def add_kernel(
    A: T.Tensor((N,), dtype),    # dtype 可以是 'float32' | T.float32 | torch.float32
    B: T.Tensor((N,), dtype),
    C: T.Tensor((N,), dtype),
):
    ...  # kernel 主体
```
- 矩阵的形状（Shapes）可以是具体的整数，也可以是符号变量（Symbolic）。对于符号变量，你可以通过外部的 @jit 包装器传入 Python 的整数（如后文所示），或者在你需要一个命名的符号维度时，使用 T.dyn 进行注解。

- tips：什么是@jit，作用是？
还记得我们开头说的吗，tilelang就像是一个可以用python风格优雅简洁的进行gpu编程，并会智能自动优化的python库，它本质上还是利用python语言编写，要真正的把他转化为能在gpu上运行的kernel函数，需要@T.prim_func和@jit的帮助。为了方便讲解，我们直接把后文@jit相关的代码段上来吧
```python
@jit  # infers target from tensors at first call
def add(N: int, block: int = 256, dtype: str = 'float32'):

    @T.prim_func
    def add_kernel(
        A: T.Tensor((N,), dtype),
        B: T.Tensor((N,), dtype),
        C: T.Tensor((N,), dtype),
    ):
        with T.Kernel(T.ceildiv(N, block), threads=block) as bx:
            for i in T.Parallel(block):
                gi = bx * block + i
                # Optional — LegalizeSafeMemoryAccess inserts a guard when an access may be OOB
                C[gi] = A[gi] + B[gi]

    return add_kernel
kernel = add()
kernel(A, B, C)
```
- @T.prim_func和@jit的关系，在我看来有点像编辑器和编译器的关系(
- @T.prim_func在此处的作用是，把它所装饰的python代码翻译，或者说声明成一个 TileLang/TVM 的 kernel IR 函数，其返回类型是PrimFunc，方便后续@jit的编译
- 而@jit呢，则是把PrimFunc编译成可以在直接在gpu上运行的程序。首先，jit有两种模式，分别为lazy和eager，lazy：外层函数显式返回 PrimFunc，eager：直接用 builder 风格写 DSL，调用就立即编译并执行。很明显我们这里用的是lazy模式。
- 接下来，在kernel = add()这一步，将jit装饰的函数(也就是例子中的kernel)转换为JITImpl，注意此时JITImpl并不是最终结果。同时，add中接受的参数会被写进JITImpl中，这样真正的kernel就能接受到外部的传参，实现动态符号维度，这也是为什么动态符号维度需要使用@jit
- 最后，在kernel(A,B,C)这个阶段，会再生成一个JITKernelm，是已经编译好的kernel实例，其中包括
    - prim_func：原始 kernel IR
    - artifact：编译产物
    - adapter：后端执行适配器
    - torch_function：最终可调用执行函数
这样一来，我们成果将python转换(应该说是翻译)成了gpu kernel程序，也解释了两个装饰器的作用，可喜可贺啊
### 2. 使用 T.Kernel 启动任务
with T.Kernel(...) 用于声明一个启动上下文（Launch Context）并创建 Block/Thread 的绑定。对于 GPU 后端，你需要指定 Grid 以及每个 Block 的线程数（Threads per block）。

```python
with T.Kernel(grid_x, grid_y, threads=128) as (bx, by):
    ...  # bx 和 by 分别对应 GPU 的 blockIdx.x 和 blockIdx.y
在 TileLang 中，你很少需要直接去算原始的线程索引（Thread Indices）。大多数 Kernel 都会在 T.Kernel 内部使用结构化的循环（如 T.serial, T.unroll, T.Parallel, T.Pipelined）。
```
### 3. 循环与控制流
核心的循环结构直接映射到了常见的硬件优化模式上：

- T.serial(start, stop[, step])：普通的 for 循环。

- T.unroll(start, stop[, step])：展开（Unrolled）循环。

- T.Parallel(ext0, ext1, ...)：嵌套的并行循环（对元素级 Elementwise 操作非常友好）。

- T.Pipelined(iters, num_stages=N)：用于生产者/消费者模型的软件流水线（Software Pipelining）。

```python
for i in T.serial(N):
    ...

for i, j in T.Parallel(M, N):
    C[i, j] = A[i, j] + B[i, j]

for k in T.Pipelined(T.ceildiv(K, BK), num_stages=3):
    # 在 3 个阶段（Stages）之间重叠（Overlap）数据拷贝与计算过程
    ...
```
条件判断可以直接使用 Python 标准的 if/else。当分块大小（Tile sizes）无法整除问题规模时，可以使用断言（Predicates）来保护边界，防止越界访问。

### 4. 内存空间与分配
TileLang 暴露了几个关键的、由软件管理的硬件内存空间：

Global（全局内存）：显卡上的显存（T.Tensor 参数的默认空间）。

Shared（共享内存）：片上（On-chip）内存，对整个线程块（Block）可见（通过 T.alloc_shared(shape, dtype) 分配）。

Fragment 与 Scalars（寄存器分块与标量）：属于单个线程的分块和标量变量，但在编写时使用共享视图（Shared View）表示（通过 T.alloc_fragment, T.alloc_var 分配）。

```python
A_shared = T.alloc_shared((BM, BK), 'float16')
B_shared = T.alloc_shared((BK, BN), 'float16')
C_local  = T.alloc_fragment((BM, BN), 'float32')
T.clear(C_local)  # 将累加器清零
```
### 5. 数据移动：T.copy
使用 T.copy(src, dst) 可以在不同的内存空间之间移动分块数据。它接收 Buffer、Buffer 的局部区域（Region）或 Buffer 的加载指令，数据范围（Extents）可以自动推导或进行广播。

```python
# 全局内存 -> 共享内存 (分块拷贝)，拷贝大小从目标(dst)的形状中自动推导
T.copy(A[by * BM, ko * BK], A_shared)
T.copy(B[ko * BK, bx * BN], B_shared)

# 寄存器分块 -> 全局内存 (写回显存)
T.copy(C_local, C[by * BM, bx * BN])
```
在编译过程中，T.copy 会根据具体的内存空间自动执行访存合并（Coalescing）以及特定空间的底层代码映射。

如果你在做手动流水线时，需要显式的异步“全局内存->共享内存”预取（Prefetch），可以使用 T.async_copy(src, dst)。与 T.copy 不同，它不会自动插入任何等待指令，你必须在消费 dst 数据之前，显式地插入 T.ptx_wait_group(...)。尽管跨线程消费仍然需要共享内存屏障（Barrier），但在大多数 TileLang 程序中，你不需要手动编写它，因为 ThreadSync("shared") 会自动在第一次读取 dst 之前插入必要的 T.tvm_storage_sync("shared")。

### 6. 完整的端到端极简示例 (向量加法 Vector Add)
```python
import tilelang
import tilelang.language as T
from tilelang import jit

@jit  # 并在第一次调用时，根据传入的 Tensor 自动推导硬件目标平台 (Target)
def add(N: int, block: int = 256, dtype: str = 'float32'):

    @T.prim_func
    def add_kernel(
        A: T.Tensor((N,), dtype),
        B: T.Tensor((N,), dtype),
        C: T.Tensor((N,), dtype),
    ):
        with T.Kernel(T.ceildiv(N, block), threads=block) as bx:
            for i in T.Parallel(block):
                gi = bx * block + i
                # 可选 — 如果访问可能越界，LegalizeSafeMemoryAccess 会自动插入边界保护
                C[gi] = A[gi] + B[gi]

    return add_kernel

# 主机端 (Host side) 代码 (此处以 PyTorch 为例；同样支持 NumPy/DLPack)
import torch
N = 1 << 20
A = torch.randn(N, device='cuda', dtype=torch.float32)
B = torch.randn(N, device='cuda', dtype=torch.float32)
C = torch.empty(N, device='cuda', dtype=torch.float32)

kernel = add(N)
kernel(A, B, C)  # 在 GPU 上运行
torch.testing.assert_close(C, A + B)
```
💡 注意

@jit 包装器在第一次编译后会返回一个可调用的 Kernel 对象。

可以将编译期可调优的参数（如分块大小 Tile sizes、数据类型）通过外部的 Python 函数传入，并将它们直接固化到生成的 TIR 中。

### 7. 分块 GEMM (矩阵乘法) 骨架
```python
@T.prim_func
def gemm(
    A: T.Tensor((M, K), 'float16'),
    B: T.Tensor((K, N), 'float16'),
    C: T.Tensor((M, N), 'float16'),
):
    with T.Kernel(T.ceildiv(N, BN), T.ceildiv(M, BM), threads=128) as (bx, by):
        A_s = T.alloc_shared((BM, BK), 'float16')
        B_s = T.alloc_shared((BK, BN), 'float16')
        C_f = T.alloc_fragment((BM, BN), 'float32')
        T.clear(C_f)

        for ko in T.Pipelined(T.ceildiv(K, BK), num_stages=3):
            T.copy(A[by * BM, ko * BK], A_s)
            T.copy(B[ko * BK, bx * BN], B_s)
            T.gemm(A_s, B_s, C_f)  # 编译时会被下放到 Tensor Core 或特定的硬件指令集 (ISA)

        T.copy(C_f, C[by * BM, bx * BN])
```
### 8. 调试与打印
在 Kernel 内部可以使用 T.print 进行快速的内省（Introspection）调试。对于共享内存（Shared）或寄存器分块（Fragment）空间，TileLang 只会从单个线程发出打印指令，从而避免大量线程并发打印导致刷屏。

```python
T.print(C_f, msg='accumulator:')
T.print(A_s, msg='A tile:')
T.print(C[0], msg='C[0] = ')
```
### 9.呃
也就是说，Tilelang实现了自动化的将全局内存数据提取到共享内存计算并流水线化？

## Control FLow
这一段主要是在将tilelang中的分支循环等语句
就像我之前所说的
tilelang就像是一个可以用python风格优雅简洁的进行gpu编程，并会智能自动优化的python库。因此它会最大程度的保存python语言的风味，本篇中分支循环等功能大部分实现方法都能直接沿用python关键字，tilelang会自动帮我们翻译好的，真是可喜可贺呀
### 1.条件分支
在 @T.prim_func kernel 中支持标准 Python if / elif / else。

条件应当是 TIR 表达式（例如 i < N）。普通 Python 布尔值会被视为编译期常量，并被常量折叠。

```python
for i in T.serial(N):
    if i < N:            # TIR condition
        C[i] = A[i] + B[i]
    else:
        pass

# Ternary
x = (A[i] if i < N else 0)
```
- 对于多维边界
tilelang推荐使用 T.any_of / T.all_of 以提高可读性：
```python
if T.all_of(i < M, j < N):
    C[i, j] = A[i, j] + B[i, j]
```
- 对于边界处理说明：
LegalizeSafeMemoryAccess pass 会在访问可能越界时自动插入保护，并在能证明安全时省略这些保护。因此，对于简单边界处理，通常可以省略显式 if 检查；但如果需要自定义逻辑或更清晰的表达，仍然应保留

### 2.循环（Loops）
#### 串行（Serial）
T.serial 创建普通的 for 循环。常见形式：
```python
for i in T.serial(N):
    ...                     # 0..N-1

for i in T.serial(0, N, 2):
    ...                     # 0, 2, 4, ...
```
#### 展开（Unroll）
T.unroll 请求对小迭代次数循环进行展开。

```python
for k in T.unroll(K_TILE):
    acc += a[k] * b[k]
```
#### 并行（逐元素，Parallel）
T.Parallel(ext0, ext1, ...) 构造嵌套循环，适合逐元素操作。循环体会在一个 for 头中同时接收所有索引：

```python
for i, j in T.Parallel(M, N):
    C[i, j] = A[i, j] + B[i, j]
```
可选参数
coalesced_width=：控制内存合并访问宽度，大白话来说就是一次访问数据的数量
loop_layout=：接受一个 T.Fragment，用于注解整个嵌套并行循环的布局
该注解只会附加到最外层循环，并且要求 InputDim == 嵌套并行维度数

这样子说有点难理解，我这里展开讲解一下
这个东西，如果我没理解错的话，应该和gpu共享内存中的bank机制有关
共享内存有个特殊的形式是，分为32个同样大小的内存模型，称为存储体(也就是bank)，可以同时访问。32个存储体的目的是对应一个线程束中有32个线程，这些线程在访问共享内存的时候，如果都访问不同存储体（无冲突），那么一个事务就能够完成，否则（有冲突）需要多个内存事务了，这样带宽利用率降低。
![image](/images/posts/1779712469189-reuult.png)
当 Warp 的 32 个线程同时向下移动读取某一列时，所有线程都在读取该列的不同行。因为矩阵在内存里通常是行优先或列优先连续存储的，这 32 个不同的行坐标极易刚好映射到同一个 Bank 或者是极少数的几个 Banks 里面，直接触发最高级别的 32 路 Bank 冲突。
而并行循环中，各访存线程是同时访问共享内存数据的，如果按顺序查询，很容易就会触发银行冲突了
所以，loop_layout的作用就是提前给并行循环中的各线程访存地址写一张“座位表”，使得线程同时开工去拿各自所需的元素时，这些元素的物理地址在 32 个 Banks 之间被完美、均匀地错开了。每个线程的请求刚好落进不同的独立 Bank 内存条里，实现了 0 冲突、100% 满带宽 的极致并行吞吐。

#### 流水线（软件流水线，Pipelined）

T.Pipelined(iters, num_stages=...) 用于重叠生产者/消费者阶段（例如 Global→Shared 拷贝与计算）。这是 GEMM / attention 流水线的核心机制。

```python
for ko in T.Pipelined(T.ceildiv(K, BK), num_stages=3):
    T.copy(A[by * BM, ko * BK], A_s)  # stage: copy A tile
    T.copy(B[ko * BK, bx * BN], B_s)  # stage: copy B tile
    T.gemm(A_s, B_s, C_f)             # stage: compute
```
关于手动 stage / order 注解，以及为什么标量 Bind 语句不占用注解槽位，我会在下一篇讲解

### While 循环（While Loops）
当条件是 TIR 表达式时，支持 while。应避免无限循环；如果 TileLang 检测到恒为真的条件，会报错。

```python
i = 0
while i < N:
    ...
    if done:
        break
    i += 1
```
###  Break 与 Continue
在 T.serial / T.unroll / T.Parallel / while 循环中，可以使用 Python 的 break / continue 来提前退出或跳过本次迭代。为了可读性，建议在 break / continue 后保持循环体简洁；编译器会忽略死路径。

### 综合示例：残块（Residual Tile）处理
下面是 2D kernel 中典型的边界处理模式。若有 LegalizeSafeMemoryAccess，在不需要自定义边界路径时，可以省略显式保护。
```python
for i, j in T.Parallel(M, N):
    gi = by * BM + i
    gj = bx * BN + j
    if T.all_of(gi < M, gj < N):     # optional in many cases
        C[gi, gj] = A[gi, gj] + B[gi, gj]
```
 
## Software Pipeline Annotations
这篇主要是详细展开讲解了上面着重提到的并行循环部分
### 阶段与顺序（Stage and Order）
每个被调度的语句都有两个数字：

stage：逻辑流水线阶段。
order：发射（emit）调度语句时使用的顺序。
较小的 stage 在流水线中更早执行。典型 copy/compute 流水线会把 copy 放在 stage 0，compute 放在 stage 1：

```python
for ko in T.Pipelined(
    T.ceildiv(K, BK),
    stage=[0, 0, 1],
    order=[0, 1, 2],
):
    T.copy(A[ko * BK], A_shared)
    T.copy(B[ko * BK], B_shared)
    T.gemm(A_shared, B_shared, C_local)
```

这两个数组按源码中的被调度语句顺序对齐。上例中：

statement 0: copy A  -> stage 0, order 0
statement 1: copy B  -> stage 0, order 1
statement 2: gemm    -> stage 1, order 2

这样子有点不太直观，简单来说，就是
stage 决定 copy(i) 和 gemm(i) 的先后关系；order 决定 copy(i+1) 和 gemm(i) 在同一个稳态片段里谁先写出来。
怎么样，容易理解多了吧

编译器会在应用注解后检查 buffer 依赖关系。如果某条被调度语句为另一条产生数据，那么生产者不能放在消费者之后。实践上：

若生产者与消费者在同一 stage，生产者的 order 必须小于消费者。
若它们在不同 stage，生产者 stage 必须小于或等于消费者 stage。
当手动提供 stage 与 order 时，普通代码中不要再设置 num_stages。流水线深度会由 stage 列表推断为 max(stage) + 1。即：编译器推断流水线用 num_stages，手动调度流水线用 stage/order。

### 可重放标量绑定
在循环里，我们经常会写一些为了方便计算下标的临时变量（在 TIR 中叫 Bind 语句）：
base: T.int32 = ko * BK
如果 TileLang 强制要求每一行代码都要分一个 stage，就会产生无法调和的逻辑冲突。
比如，这个 base 既被 stage 0 的 T.copy 用到了（去算搬运地址），又被 stage 1 的存储语句用到了（去算写回地址）。

- 如果把 base 划给 stage 0，那到了 stage 1 运行时，由于流水线时间轴错位，base 的值可能早就被刷新成下一轮循环的值了，导致计算错误！
- 如果把它划给 stage 1，那 stage 0 一开始就找不到这个变量。

为了解决这个问题，TileLang提出了一个架构设计理念：“不具实质存储作用的临时标量，不参与流水线排队”
也就是说，临时变量的计算不会拥有任何stage或order属性，而是每次被调用时都会被“重放”，换句话说，哪里调用这个临时变量，临时变量就在哪里当场算一遍出来
- 当 stage 0 的 T.copy 想要用 base 时，编译器全自动在 T.copy 的头顶上现算一遍 base = ko_future * BK。
- 当 stage 1 的计算想要用 base 时，编译器又全自动在计算的头顶上现算一遍 base = ko_current * BK。

这可能会让 GPU 多算几次乘法（或者多去内存里读一次索引 Ids[ko]），但它换来了绝对安全的流水线时间错位正确性，并保持了 API 的极度纯粹。

一般来说，会导致数据依赖的变量才算是临时变量

如果临时变量之间也有依赖怎么办呢？
不需要担心，只要按顺序写好各逻辑即可

base: T.int32 = ko * BK
offset: T.int32 = base + tx
T.copy(A[offset], A_shared[tx])
编译器会在用户之前重放这些依赖：

base
offset
consumer statement

## 指令
这部分主要讲解了tilelang的核心指令与作用，因此不多解释，直接翻译过来了

### 快速分类（Quick Categories）
- 数据搬运：T.copy、T.async_copy、T.tma_copy、T.c2d_im2col，以及 Global ↔ Shared ↔ Fragment 间的分阶段搬运
- 计算原语：T.gemm / T.gemm_sp、逐元素数学运算（T.exp、T.max）、归约（T.reduce_sum、T.cumsum、warp reducer）
- 控制辅助：T.clear / T.fill、T.reshape / T.view
- 诊断：T.print、T.device_assert
- 高级：原子操作、内存屏障、warp-group 操作
- 数据搬运（Data Movement）

使用
```python
T.copy(src, dst, *, coalesced_width=None, disable_tma=False, eviction_policy=None, loop_layout=None)
```

在不同内存作用域之间搬运 tile。它接受 tir.Buffer、BufferLoad 或 BufferRegion；当可能时，extent 会被自动推断或广播。

```python
# Global → Shared tiles（extent 从 dst 推断）
T.copy(A[by * BM, ko * BK], A_s)
T.copy(B[ko * BK, bx * BN], B_s)

# Fragment/Register → Global（写回结果）
T.copy(C_f, C[by * BM, bx * BN])
```
语义：

- extent 会根据参数自动推断；如果一侧维度缺失，会按另一侧 rank 广播。
- lowering 阶段会对访问模式进行合法化和合并访问优化（coalescing）。在 HL 模式下不要求手动显式 vectorization。
安全性：LegalizeSafeMemoryAccess pass 会在访问可能越界时插入边界保护，并在能够证明安全时删除这些保护。
- T.copy 如何 lower 到不同的拷贝机制（Lowering T.copy to variants of copy mechanisms）

**TileLang 同时支持同步拷贝和显式异步拷贝。**

- T.copy(src, dst, ...)（同步语义）
    - 这是大多数 TileLang 程序的默认选择。
    - 编译器可以根据 target / hint，将其 lower 为不同机制（例如同步 SIMT copy ld.global、warp-level copy ldmatrix、通过 TMA 的异步拷贝 cp.async.bulk、旧式异步拷贝 cp.async 等），但可观察语义仍然是同步的：该语句执行之后，就可以安全使用 dst。
    - 即使 T.copy 被 lower 成 cp.async，TileLang 仍会通过生成所需的 commit / wait（以及必要同步）来保持同步语义，从而保证消费 dst 时是正确的。

- T.async_copy(src, dst, ...)（显式异步语义）
    - 用于手动流水线或 warp-specialized 代码，在这些场景下你希望让 global→shared 拷贝与计算重叠执行。
    - 它会通过 cp.async 进行 lowering，并生成：
        - ptx_cp_async(...)
        - ptx_commit_group()
        - 不会自动插入 ptx_wait_group(...)
    - 在消费 dst 之前，你必须显式插入 T.ptx_wait_group(...)。
    - 当 dst 是由多个线程协作生成、并被跨线程消费时，仍然需要 barrier。大多数 TileLang 程序中你不需要手写这一点：ThreadSync("shared") 会在第一次读取 dst 之前自动插入所需的 T.tvm_storage_sync("shared")。
    - 如果想完全显式控制（或在写非常底层的代码），也可以自己插入 T.tvm_storage_sync("shared")，或者在 warp 本地消费时插入 T.tvm_storage_sync("warp")。
    - 这个操作被有意设计得很严格：如果该拷贝无法 lower 成 cp.async（例如 scope 不对、vector width 不受支持），编译会直接失败，而不是悄悄退化为同步拷贝。

示例：手动异步预取（manual async prefetch）
```python
# 异步预取到 shared（会生成 cp.async + commit）
T.async_copy(A[by * BM, ko * BK], A_s)

# ... 这里可以做独立工作 ...

# 在消费 A_s 之前，确保异步拷贝已经完成
T.ptx_wait_group(0)
# 默认 lowering pipeline 中，ThreadSync("shared") 会在第一次读取 A_s 前
# 自动插入所需的 shared-memory barrier
T.gemm(A_s, B_s, C_f)
```
其他辅助函数：

- T.c2d_im2col(img, col, ...)：用于卷积风格变换的便捷接口
### 计算原语（Compute Primitives）
#### GEMM 与稀疏 GEMM
- T.gemm(A_shared, B_shared, C_fragment)：用 shared 输入和 fragment 累加器计算一个 tile GEMM；会 lower 到目标平台特定的 tensor core 实现。
- T.gemm_sp(...)：2:4 稀疏 tensor core 版本（见 examples 和 README）。
#### 归约与扫描（Reductions and scans）
- T.reduce_sum、T.reduce_max、T.reduce_min、T.cumsum，以及 warp 级 reducer（如 T.warp_reduce_sum 等）
- 累加器通常通过 T.alloc_fragment + T.clear 或 T.fill 来分配和初始化
#### 逐元素数学运算（Elementwise math）
- 大多数数学操作与 TVM TIR 对应：T.exp、T.log、T.max、T.min、T.rsqrt、T.sigmoid 等
- 可以在循环中自由组合使用
#### reshape / view（无拷贝）
- T.reshape(buf, new_shape) 和 T.view(buf, shape=None, dtype=None) 会创建共享底层存储的新视图，并执行 shape / dtype 检查
#### 同步（Synchronization，HL 用法）
- 在 HL 流水线中，通常不需要显式写 barrier。像 PipelinePlanning、InjectSoftwarePipeline、InjectTmaBarrier 这样的 pass 会在幕后组织生产者/消费者顺序以及线程同步。

若你需要调试或显式检查：

- T.device_assert(cond, msg='')：在 CUDA target 上生成 device-side assert
- T.print(obj, msg='...')：从单个线程安全打印标量或 buffer
组合示例：GEMM Tile（Putting It Together: GEMM Tile）
```python
@T.prim_func
def gemm(
    A: T.Tensor((M, K), 'float16'),
    B: T.Tensor((K, N), 'float16'),
    C: T.Tensor((M, N), 'float16'),
):
    with T.Kernel(T.ceildiv(N, BN), T.ceildiv(M, BM), threads=128) as (bx, by):
        A_s = T.alloc_shared((BM, BK), 'float16')
        B_s = T.alloc_shared((BK, BN), 'float16')
        C_f = T.alloc_fragment((BM, BN), 'float32')
        T.clear(C_f)

        for ko in T.Pipelined(T.ceildiv(K, BK), num_stages=3):
            T.copy(A[by * BM, ko * BK], A_s)  # Global → Shared
            T.copy(B[ko * BK, bx * BN], B_s)
            T.gemm(A_s, B_s, C_f)             # 在 fragment 中计算

        T.copy(C_f, C[by * BM, bx * BN])      # 写回
```
### 指令参考（简明版，Instruction Reference (Concise)）
下面按类别给出一份精简的 TileLang 指令列表。完整签名、行为、约束和示例请参见 API Reference（autoapi/tilelang/index）。

#### 数据搬运（Data movement）
- T.copy(src, dst, ...)：在 Global / Shared / Fragment 间搬运 tile
- T.async_copy(src, dst, ...)：通过 cp.async 显式执行 global→shared 异步拷贝
- T.tma_copy(src, dst, ...)：通过 cp.async.bulk 显式执行 global→shared 异步拷贝
- T.transpose(src, dst)：转置一个 2D shared buffer，即 dst[j, i] = src[i, j]
- T.c2d_im2col(img, col, ...)：卷积用的 2D im2col 变换
#### 内存分配与描述符（Memory allocation and descriptors）
- T.alloc_shared(shape, dtype, scope='shared.dyn')：分配 shared buffer
- T.alloc_fragment(shape, dtype, scope='local.fragment')：分配 fragment
- T.alloc_var(dtype, [init], scope='local.var')：标量变量 buffer（1 元素）
- T.alloc_barrier(arrive_count)：分配并初始化一个或多个 mbarrier
- T.alloc_tmem(shape, dtype)：Tensor Memory（TMEM）buffer（Blackwell+）
- T.deallocate_tmem(buffer)：在当前位置显式释放 TMEM buffer
- T.alloc_reducer(shape, dtype, op='sum', replication=None)：分配 reducer buffer
- T.alloc_descriptor(kind, dtype)：通用描述符分配器
    - T.alloc_wgmma_desc(dtype='uint64')
    - T.alloc_tcgen05_smem_desc(dtype='uint64')
    - T.alloc_tcgen05_instr_desc(dtype='uint32')
- T.empty(shape, dtype='float32')：声明函数输出 tensor

#### 计算原语（Compute primitives）
- T.gemm(A_s, B_s, C_f)：在 fragment 累加器中执行 tile GEMM
- T.gemm_sp(...)：稀疏（2:4）tensor core GEMM
- 归约：T.reduce_sum/max/min/abssum/absmax，以及按位 and/or/xor
- 扫描：T.cumsum，结束归约：T.finalize_reducer
- warp reducer：T.warp_reduce_sum/max/min/bitand/bitor
- 逐元素数学：TIR 运算（T.exp、T.log、T.max、T.min、T.rsqrt 等）
- 快速数学：T.__log/__log2/__log10/__exp/__exp2/__exp10/__sin/__cos/__tan
- IEEE 数学：T.ieee_add/sub/mul/fmaf（可配置舍入模式）
- 辅助：T.clear(buf)、T.fill(buf, value)
- 视图：T.reshape(buf, shape)、T.view(buf, shape=None, dtype=None)

#### 诊断（Diagnostics）
- T.print(obj, msg='')：从单个线程打印标量 / buffer
- T.device_assert(cond, msg='')：设备侧断言（CUDA）
#### 逻辑辅助（Logical helpers）
- T.any_of(a, b, ...)、T.all_of(a, b, ...)：多项谓词组合
#### 注解辅助（Annotation helpers）
- T.use_swizzle(panel_size=..., enable=True)：栅格化提示
- T.annotate_layout({...})：给 buffer 附加显式布局
- T.annotate_safe_value(var, ...)：安全性 / 常量提示
- T.annotate_l2_hit_ratio(buf, ratio)：缓存行为提示
#### 同步辅助（Synchronization helpers）
- T.sync_threads([barrier_id, arrive_count])：block 级 barrier（__syncthreads()）
- T.sync_warp([mask])：warp 级 barrier（__syncwarp([mask])）
- T.sync_grid()：cooperative grid barrier（要求 cooperative launch）
- T.pdl_trigger()：通知当前 kernel 的程序化 launch 已完成
- T.pdl_sync()：等待 kernel 依赖满足
#### Warp vote / warp ballot（CUDA ≥ 9 / HIP）
- T.any_sync(predicate[, mask]) -> int32：若 mask 中任一 lane 的 predicate 非零，则返回非零（__any_sync）。mask 默认 0xFFFFFFFF
- T.all_sync(predicate[, mask]) -> int32：若 mask 中所有 lane 的 predicate 都非零，则返回非零（__all_sync）。mask 默认 0xFFFFFFFF
- T.ballot_sync(predicate[, mask]) -> uint64：返回 mask 中 predicate 非零 lane 的 bitmask。CUDA 下是 __ballot_sync 后零扩展到 64 位；HIP 下 __ballot 原生返回 uint64，覆盖 64 个 wavefront lane。mask 默认 0xFFFFFFFF
- T.ballot(predicate) -> uint64：全 warp / wavefront ballot（mask = 0xFFFFFFFF）。HIP 下不截断
- T.activemask() -> uint64：当前活跃 lane 的 bitmask。CUDA 下是 __activemask 零扩展到 64 位；HIP 下是 __ballot(1) 的 uint64
Block-wide predicated sync
- T.syncthreads_count(predicate) -> int32：同步所有线程，并返回 predicate 非零的线程数（__syncthreads_count）
- T.syncthreads_and(predicate) -> int32：同步后，若所有线程 predicate 都非零，则返回非零（__syncthreads_and）
- T.syncthreads_or(predicate) -> int32：同步后，若任一线程 predicate 非零，则返回非零（__syncthreads_or）
#### Warp shuffle（warp 内数据交换）
所有 shuffle 指令都接受一个末尾 mask 关键字参数，默认值 0xFFFFFFFF。

- T.shfl_sync(value, src_lane[, width, mask])：从 src_lane 向所有 lane 广播值（__shfl_sync）
- T.shfl_xor(value, delta[, width, mask])：按 XOR 方式交换 lane 数据（__shfl_xor_sync）
- T.shfl_down(value, delta[, width, mask])：向下移动 delta 个 lane（__shfl_down_sync）
- T.shfl_up(value, delta[, width, mask])：向上移动 delta 个 lane（__shfl_up_sync）
#### Warp match（CUDA sm_70+，HIP 不支持）
mask 默认值 0xFFFFFFFF。

- T.match_any_sync(value[, mask]) -> uint32：返回 mask 中与当前 lane 的 value 相同的 lane bitmask（__match_any_sync）
- T.match_all_sync(value[, mask]) -> uint32：若 mask 中所有 lane 的 value 都一致，则返回 mask，否则返回 0（__match_all_sync）。C 层面的 int* predicate 输出被隐藏，可通过 result != 0 还原。
关于 HIP 的说明：

any_sync / all_sync 会忽略 mask，直接调用 __any / __all。
ballot_sync、ballot、activemask 调用 __ballot，在 64 线程 wavefront 上原生返回 uint64，不会发生截断。
shuffle intrinsics 会 lower 为 __shfl / __shfl_xor / __shfl_down / __shfl_up（mask 被忽略）。
syncthreads_count/and/or 在两个平台上签名一致。
match_any_sync 和 match_all_sync 没有 HIP 对应实现，在 HIP 上代码生成会失败。

#### 原子操作（Atomics）
- T.atomic_add(dst, value, memory_order=None, return_prev=False, use_tma=False)
- T.atomic_addx2(dst, value, return_prev=False)；T.atomic_addx4(...)
- T.atomic_max(dst, value, memory_order=None, return_prev=False)
- T.atomic_min(dst, value, memory_order=None, return_prev=False)
- T.atomic_load(dst)、T.atomic_store(dst, value)
#### 自定义 intrinsic（Custom intrinsics）
- T.dp4a(A, B, C)：4 元素点积累加
- T.clamp(x, lo, hi)：截断到 [lo, hi]
- T.loop_break()：通过 intrinsic 形式跳出当前循环
#### Barrier、TMA、warp-group
- Barrier：T.alloc_barrier(arrive_count)
- 奇偶（parity）操作：T.mbarrier_wait_parity(barrier, parity)、T.mbarrier_arrive(barrier)
- expect tx：T.mbarrier_expect_tx(...)；语法糖：T.barrier_wait(id, parity=None)
- TMA：T.create_tma_descriptor(...)、T.tma_load(...)、T.tma_store_arrive(...)、T.tma_store_wait(...)
- 代理 / fence：T.fence_proxy_async(...)、T.warpgroup_fence_operand(...)
warp-group：T.warpgroup_arrive()、T.warpgroup_commit_batch()、T.warpgroup_wait(num_mma)、T.wait_wgmma(id)
#### Lane / warp 索引（Lane/warp index）
- T.get_lane_idx(warp_size=None)：warp 内 lane id
- T.get_warp_idx_sync(warp_size=None)：规范化 warp id（带同步）
- T.get_warp_idx(warp_size=None)：规范化 warp id（无同步）
- T.get_warp_group_idx(warp_size=None, warps_per_group=None)：group id
#### 寄存器控制（Register control）
- T.set_max_nreg(reg_count, is_inc)、T.inc_max_nreg(n)、T.dec_max_nreg(n)
- T.annotate_producer_reg_dealloc(n=24)、T.annotate_consumer_reg_alloc(n=240)
- T.no_set_max_nreg()、T.disable_warp_group_reg_alloc()
### 关于数据类型（Notes on Dtypes）
dtype 支持三种等价写法：

- 字符串：'float32'
- TileLang dtype：T.float32
- 框架 dtype：torch.float32
它们在内部都会被规范化处理

## Autotuning
终于快搞完了，累似了喵
就像我之前所说，tilelang就像是一个可以用python风格优雅简洁的进行gpu编程，并会智能自动优化的python库，这一章着重讲的就是智能自动优化的部分

TileLang 内置了自动调优器（autotuner），用于在配置空间中搜索性能最优的 kernel。它会并行编译候选配置、验证正确性、做 benchmark，并缓存最优结果以便复用。
本章介绍两种工作流：
- 基于装饰器：@tilelang.autotune(configs=...) 叠加在 @tilelang.jit 之上
- 编程式：AutoTuner.from_kernel(...).set_*().run()
同时还会说明输入张量提供方式、正确性验证、缓存机制，以及影响并行度和缓存行为的环境变量。

### 基于装饰器的自动调优
基于装饰器的自动调优 = 先写一个“可参数化的 kernel 工厂函数”，再让 @tilelang.autotune 自动枚举这些参数、编译、测性能、挑最快的那个。

这个我们以文档中的代码示例为示例来看看具体实现

我们先来看自动调优的核心结构
```python
@tilelang.autotune(configs=matmul_configs, warmup=25, rep=100, timeout=60)
@tilelang.jit(out_idx=[-1])
def matmul(M, N, K,
           block_M=128, block_N=128, block_K=32,
           threads=128, num_stages=3,
           dtype='float16', accum_dtype='float32'):

    @T.prim_func
    def kernel(A, B, C):
        ...
    return kernel
```
这里比较关键的是
- M, N, K：问题规模参数
- block_M, block_N, block_K, threads, num_stages：可调参数
为什么说是可调的呢，看似这些参数被写死了，但实际上，通过@tilelang.autotune和matmul_configs，tilelang会自动试出最佳的参数组合，覆盖原参数。
- matmul_configs(...)：给出一堆候选配置
- @tilelang.autotune(...)：自动试这些配置并选最优

接下来，我们看看configs到底在干什么
```python
def matmul_configs(M, N, K):
    return [
        dict(block_M=64, block_N=64, block_K=32, num_stages=2, threads=128),
        dict(block_M=128, block_N=128, block_K=32, num_stages=3, threads=256),
        ...
    ]
```
意思是：
给同一个 M,N,K，准备很多种候选 kernel 形状。
比如候选可能有：

- 小 tile + 少 stage
- 大 tile + 多 stage
- 128 threads
- 256 threads
这些配置会覆盖函数默认值。
最后 调用kernel函数时，需要用 set_autotune_inputs(...) 包住调用

```python
from tilelang.autotuner import set_autotune_inputs
with set_autotune_inputs(A, B, C):
    tuned_kernel = matmul(M, N, K)
```

### 编程式方式
嗯，简单来说，Programmatic Autotune 就是：不用 @tilelang.autotune 这一层语法糖，而是直接操作 AutoTuner 对象，显式设置配置、输入、校验、编译和 benchmark 细节，再运行调优并拿到完整结果。
为了更好解释，下面我将写编程式优化流程
首先
```python
from tilelang.autotuner import AutoTuner

kernel_factory = matmul
tuner = AutoTuner.from_kernel(kernel_factory(M, N, K), configs=matmul_configs(M, N, K))
```
这里意思是：

kernel_factory(M, N, K) 先得到一个待调优的 kernel/JIT 对象
configs=... 给出候选配置
AutoTuner.from_kernel(...) 创建一个调优器
可以把这一步理解成：
“我要调这个 kernel，这些是候选参数版本。”

接着设置 profiling 参数
```python
tuner.set_profile_args(
    warmup=25, rep=100, timeout=60,
    supply_type=tilelang.TensorSupplyType.Auto,
    ref_prog=...,
)
```
这一步是在说：

“你怎么测性能，怎么准备输入，怎么检查结果对不对。”

包括：

warmup=25：先热身 25 次
rep=100：正式测 100 次
timeout=60：单个配置最多 60 秒
supply_type=...：输入张量怎么生成
ref_prog=...：正确性怎么验证

再设置编译参数
```python
tuner.set_compile_args(
    target='auto',
    execution_backend='auto',
    out_idx=[-1],
    pass_configs={...},
)
```
这一步是在说：

“你怎么编译这些候选 kernel。”

比如：

target='cuda' / 'hip' / 'metal'
execution_backend='nvrtc' / 'torch' / 'cython'
out_idx=[-1]：多输出时取哪些输出
pass_configs={...}：编译 pass 的特殊选项
最后执行调优

artifact = tuner.run()
这一步才是真正开始：

编译所有候选配置
跑 benchmark
做 correctness check
选最佳配置
返回结果对象

暂时写不动了，还差这些
并行测试，最佳策略缓存等等


写到一半中途还以为浏览器鼠标手势退出了，没保存，气死了

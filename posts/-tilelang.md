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
### 2.

# 本目录已归档（参考）

> **状态**：✅ 已归档，不再 active
> **归档日期**：2026-06-15
> **归档原因**：项目目标从「Qt6 + Vulkan 本地 SDK」转型为「纯 Web Component（Custom Element + Canvas 2D）」。本目录的代码与构建工作不再继续，但所有文档作为**算法、数据模型、视觉规范的参考**保留。

---

## 当前 active 版本

➡️ **[../v2.0.0/](../v2.0.0/)** —— Web Component 版本，从零开始

## 本目录的参考价值

进入 v2.0.0 开发的新 Session，可以参考本目录的以下内容（**仅作概念参考，不复用代码**）：

| 文档 | 仍可参考的部分 |
|------|---------------|
| [Stage1/设计文档.md](./Stage1/设计文档.md) | 基础类型定义（FilterType / SampleRate / EQBand / ShelfBand）；CoordinateMapper 对数频率 + 线性增益映射公式 |
| [Stage2/设计文档.md](./Stage2/设计文档.md) | EqualizerModel 数据模型；BandHandle 交互语义 |
| [Stage3/设计文档.md](./Stage3/设计文档.md) | **ButterworthIIR 的 5 个 RBJ biquad 系数公式**（最关键的算法参考）；CurveEngine 对数频点生成 |
| [Stage7/设计文档.md](./Stage7/设计文档.md) | 单元测试用例（理论频响值对照） |
| [Stage10/设计文档.md](./Stage10/设计文档.md) | **回字形边距布局**（v2.0.0 视觉沿用此设计） |
| [Stage11/设计文档.md](./Stage11/设计文档.md) | **坐标轴 / 网格 / 文字 / 0dB 高亮设计**（v2.0.0 视觉沿用此设计） |
| [目标样式.png](./目标样式.png) | **最终视觉目标**（v2.0.0 也以此为视觉目标） |
| [版本总结报告.md](./版本总结报告.md) | v1.0.0 完成时的状态快照 |

## 不再适用的部分

| 模块 | 不再使用的原因 |
|------|--------------|
| Vulkan 渲染栈（Context/Swapchain/Pipeline/BufferPool/FontAtlas/FrameSync）| Canvas 2D 替代 |
| Qt 信号槽 | DOM CustomEvent + EventTarget 替代 |
| Qt 后台线程 CurveEngine | 主线程同步计算（用户决策：v2.0.0 不引入 Web Worker） |
| Qt Widget 透明覆盖层 | Canvas 命中测试 + Pointer Events 替代 |
| CMake | 前端工具链替代（具体方案见 v2.0.0 问题清单 A 类） |
| volk / GLM / stb_truetype | 不再需要 |

---

**进入 v2.0.0 工作前，请阅读 [../v2.0.0/README.md](../v2.0.0/README.md)。**

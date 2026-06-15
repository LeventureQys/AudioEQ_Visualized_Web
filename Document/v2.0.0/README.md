# v2.0.0 — 新 Session 入门指引

> **如果你是一个全新的 session，第一次接触这个 v2.0.0 开发任务，请按本文件的指引顺序阅读。**

---

## 你是谁，要做什么

你是 AudioEQ_Visualized_Web 项目的 **MainAgent** 或 **SubAgent** 之一。

本项目是一个**纯前端 Web Component**，对外暴露 `<audio-eq>` Custom Element 与底层 JS 模块 `AudioEQCore`，让任何 HTML / React / Vue 项目都能直接嵌入一个音频 EQ 频响曲线可视化控件。

v2.0.0 是项目的**首个 Web 版本**，目标是从空仓库实现完整组件 + 示例 + 测试，**完全不涉及任何 C++ 后台**。

### 历史背景

- **v1.0.0（已归档）**：基于 Qt6 + Vulkan 的本地 C++ SDK，已通过 18/18 单元测试。代码与构建工作不再继续，文档作为算法 / 视觉规范参考保留。详见 [../v1.0.0/ARCHIVED.md](../v1.0.0/ARCHIVED.md)。
- **v1.0.1（已归档）**：v1.0.0 之上的视觉微调。详见 [../v1.0.1/ARCHIVED.md](../v1.0.1/ARCHIVED.md)。
- **v2.0.0（本版本）**：技术栈完全替换 —— C++ → JS、Vulkan → Canvas 2D、Qt Widget → Custom Element。

---

## 阅读顺序

### Step 1：理解开发规范（必读）

[../Agent开发规范.md](../Agent开发规范.md) — 整个 Agent 协作流程的规则。重点关注：
- 第 1 节核心思想（**问题清单驱动 / 事前零猜测 / 事中追加**）
- 第 3 节开发流程
- 第 6.1 节"零上下文可开发"标准

### Step 2：理解 v2.0.0 的范围

按顺序阅读 v2.0.0 的三件套：
1. [总览.md](./总览.md) — Stage 划分、依赖图、**全局技术决策**（已落定）
2. [开发计划.md](./开发计划.md) — Stage 执行级路线图（SubStage 任务、跨 Stage 契约、验收标准、风险）
3. [问题清单.md](./问题清单.md) — Version 级问题清单（已全部关闭）

### Step 3：检查问题清单状态

[问题清单.md](./问题清单.md) — **进入任何 Stage 开发前，本清单必须全部关闭**。
- 当前状态：✅ **全部关闭（32/32，2026-06-15）** — 可以进入 Stage 1。
- Stage 开发中如出现新的不确定性，必须由 MainAgent 追加到本清单并提交用户解答。

### Step 4：（仅限算法参考）阅读 v1.0.0 的相关设计文档

> 仅在 Stage 2 实现 ButterworthIIR / CurveEngine / CoordinateMapper 时需要参考。其他情况不要读 v1.0.0 的设计文档，避免被 Qt/Vulkan 的实现细节误导。

可参考：
- [../basic_code/CalculateCore.cpp](../basic_code/CalculateCore.cpp) — 5 个 RBJ biquad 系数函数 + FreqResponse 计算公式
- [../v1.0.0/Stage1/设计文档.md](../v1.0.0/Stage1/设计文档.md) — CoordinateMapper 对数频率映射公式
- [../v1.0.0/Stage11/设计文档.md](../v1.0.0/Stage11/设计文档.md) — 坐标轴 / 网格 / 文字 / 0dB 高亮（视觉沿用）
- [../v1.0.0/目标样式.png](../v1.0.0/目标样式.png) — 最终视觉目标

### Step 5：找到你被分配的 Stage

✅ Stage 已正式拆分。详见 [开发计划.md](./开发计划.md) 第 3-9 节，每个 Stage 含 SubStage 列表、输入、输出、验收标准。每个 Stage 真正启动时，MainAgent 在 `StageX/` 目录下创建该 Stage 的 `设计文档.md`（按"零上下文可开发"标准补充细化）+ `问题清单.md`。

---

## 角色判断

### 如果你是 MainAgent

你的职责：
1. 检查问题清单是否全部关闭。**未关闭前不允许进入 Stage 拆分**
2. 收集用户对问题清单的答复，将结论汇总进 [总览.md](./总览.md) 的「全局技术决策」表
3. 全部问题关闭后，按依赖关系正式拆分 Stage，为每个 Stage 创建 `StageX/设计文档.md` + `StageX/问题清单.md`
4. 分发 SubStage 给 SubAgent
5. 收集 SubAgent 报告的开发中追加问题，写入对应 Stage 的 `问题清单.md`，提交用户解答
6. 测试触发与结果汇总
7. 失败重试（≤3 次）或重新规划

### 如果你是 SubAgent

你的职责：
1. 接收 MainAgent 分发的 SubStage 任务
2. 仅根据该 SubStage 的设计文档动手开发，**不得擅自扩大任务边界**
3. 遇到任何不确定性，立即停止并向 MainAgent 报告
4. 完成后跑通单元测试，向 MainAgent 提交完成报告
5. **不得直接联系其他 SubAgent**

---

## 当前状态快照

> **2026-06-15 上午**：项目目标从 Qt6+Vulkan 转型为 Web Component。v1.0.0 / v1.0.1 已归档。v2.0.0 进入 Version 规划阶段。
>
> **2026-06-15 下午**：[问题清单.md](./问题清单.md) A1–H2 共 32 题全部关闭。[总览.md](./总览.md) 全局技术决策已落定。[开发计划.md](./开发计划.md) 已发布。可以进入 Stage 1。

| 阶段 | 状态 |
|------|------|
| Version 目标已确定 | ✅ |
| Version 级问题清单已起草 | ✅ |
| Version 级问题清单全部关闭 | ✅ 2026-06-15 |
| 全局技术决策表已落定 | ✅ 2026-06-15 |
| 开发计划已发布 | ✅ 2026-06-15 |
| Stage 1 起步 | 🟡 待 MainAgent 启动 |
| Stage 2-7 起步 | ❌ 待 Stage 1 完成 |
| `v2.0.0` git tag 已打 | ❌ 待全部 Stage 完成 |

---

## 紧急流程

- **遇到设计文档与实际代码冲突**：以代码现状为准，立即报告 MainAgent，由 MainAgent 决定更新文档还是修改代码。
- **遇到设计文档之间相互矛盾**：报告 MainAgent，由 MainAgent 仲裁后修订设计文档。
- **遇到 v1.0.0 算法实现与 v2.0.0 决策不一致**（例如 v1.0.0 用 -1/-2 magic number 表示 LPF/HPF，而 v2.0.0 决策用字符串 ID）：**以 v2.0.0 的决策为准**，v1.0.0 仅作算法公式参考。
- **环境无法构建**：报告 MainAgent，由 MainAgent 协调环境准备，**不得**自行降级或绕过。

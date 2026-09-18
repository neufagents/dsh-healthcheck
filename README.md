# NeufAgents · dsh 插件 #1(工作区)

> 这是 NeufAgents(neufagents.com)面向 DeepSeek Harness 生态的第一个插件工程。
> 状态:**选题调研中**(调研完成后此处更新为正式选题与说明)。

## 结构
- `src/` —— 插件源码(`apply(ctx)` 挂到扩展点)
- `tests/` —— 单元测试(纯函数优先,见开发纪律)

## 纪律(来自 dsh-handbook)
1. 先找扩展点(90% 行为有官方钩子)
2. 决策逻辑抽纯函数(零依赖、可单测)
3. 实机验证不能省(本地 dsh 跑通才算数)

## 待补
- [ ] 选题(来自调研子代理 A)
- [ ] 技术路线细节(来自调研子代理 B)
- [ ] 发布流程(GitHub `dsh-plugin` topic + npm)

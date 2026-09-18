# dsh-healthcheck(中文)

**DeepSeek Harness(dsh)运行时健康体检。只读、零配置。**

一个小插件,帮你发现两个会悄悄拖垮长任务的信号:**会话体积失控**(长任务 OOM 的前兆)和**崩溃遗留的会话日志**。

## 功能

一个工具:`health_check`

- **不带参数** —— 扫描整个会话库:
  - 会话总数 / 总体积 / 事件总数
  - 体积最大的会话
  - 异常告警:体积超限(≥10MB 关注、≥30MB 高危);事件数超限(≥3000 关注、≥8000 高危)——这些是长任务 OOM 的常见前兆
- **带 `session_id`** —— 深检单个会话日志:
  - 尾部闭合检查(未闭合轮次 = 崩溃遗留;dsh 会在 resume 时自动修复,本工具只是告诉你发生过)
  - 工具调用 / 结果配对
  - 事件类型分布

全程**只读**——不会修改任何数据。

## 安装

```sh
# 需要机器上有 pnpm(dsh plugin 会把命令转发给 pnpm)
dsh plugin --profile web add github:neufagents/dsh-healthcheck
```

重启 dsh,然后让你的 agent:

> 帮我检查一下 dsh 的健康状况

## 兼容性

- 在 dsh `0.1.5-rc.2`(开发者预览版)上测试通过。rc 版本迭代很快,欢迎反馈问题。
- 请使用 **v0.1.1 及以后版本**。v0.1.0 直接分发 TypeScript 源码,而 Node 拒绝从 `node_modules` 加载需类型剥离的文件(`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`);v0.1.1 改为分发编译后的 JS(`dist/`)。

## 许可

MIT · 由 [NeufAgents](https://neufagents.com) 制作

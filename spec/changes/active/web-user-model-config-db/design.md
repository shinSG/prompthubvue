# Design

## Overview

采用“独立模型表 + AI 路由按 modelId 服务端解析”的方式实现 Web 用户域模型配置。

- 数据层：新增 `user_ai_models` 与 `user_ai_scenario_defaults`。
- 迁移层：从 `user_settings` 一次性回填历史模型配置。
- API 层：新增 `/api/model-configs`，并改造 `/api/ai/*` 支持 `modelId`。
- 前端桥接层：Web 运行时在 AI 请求头附带 `X-PromptHub-Model-Id`。

## Affected Areas

- Data model:
- `packages/db/src/schema.ts`
- `packages/db/src/init.ts`

- IPC / API:
- `apps/web/src/routes/model-configs.ts`（新增）
- `apps/web/src/routes/ai.ts`
- `apps/web/src/app.ts`

- Filesystem / sync:
- 暂不改变同步格式，仅保持兼容；后续迭代可将导入导出中的模型配置切换到新结构。

- UI / UX:
- 首阶段不做 UI 重构；通过 bridge header 先保证 Prompt 调试读库。

## Tradeoffs

- 为降低回归风险，AI 路由保留“无 modelId 的旧透传分支”作为兼容路径；这会短期保留双逻辑。
- 明文密钥存储按需求执行，但需补偿控制：日志脱敏、错误裁剪、仅 HTTPS。
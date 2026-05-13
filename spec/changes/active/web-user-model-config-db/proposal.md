# Proposal

## Why

Web 端当前将模型配置混在 `user_settings` 与前端本地状态中，Prompt 调试链路会把 API Key/API URL 从客户端直接透传到 `/api/ai/*`。这导致两类问题：

- 模型配置缺少独立数据模型与可迁移能力，无法稳定支持用户域管理。
- 服务端未强制按当前登录用户读取模型配置，存在越权和伪造输入风险。

本次变更在仅 Web 范围内将模型配置入库、与用户绑定，并把 Prompt 调试改为服务端按 `userId + modelId` 读取。

## Scope

- In scope:
- 新增用户模型配置表与场景默认映射表。
- 一次性全量迁移 `user_settings` 中历史模型配置到新表。
- 新增 Web 模型配置服务与路由。
- 改造 `/api/ai/request` 与 `/api/ai/stream`，支持并优先使用 `modelId` 服务端解析配置。
- Web bridge/前端请求带 `modelId`，Prompt 调试优先走数据库模型。
- 补充单元与路由测试。

- Out of scope:
- 桌面端存储重构。
- OAuth/SSO。
- PostgreSQL 实现（保持现有 SQLite 驱动路径）。

## Risks

- 历史 `user_settings` 中模型数据格式不一致，迁移需容错。
- 新旧请求形态共存期间，AI 路由兼容逻辑可能引入行为分叉。
- 明文密钥入库需要严格日志脱敏与错误控制。

## Rollback Thinking

- 迁移脚本按幂等设计，失败时不写迁移完成标记。
- `/api/ai/*` 保留旧透传作为兼容分支，仅在缺少 `modelId` 时使用。
- 如出现回归，可回退到未启用 `modelId` 的调用路径并保留迁移数据不破坏原键。
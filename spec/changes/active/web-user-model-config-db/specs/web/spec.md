# Web Domain Delta Spec

## Added

### Requirement: User-scoped model configuration persistence

Web 端必须提供独立的用户模型配置数据结构，支持按用户存储、查询、更新、删除模型配置。

#### Scenario: list current user model configs

- Given 用户 A 已登录
- When 调用模型配置列表接口
- Then 仅返回用户 A 的模型配置

### Requirement: Prompt debug must resolve model config server-side

当客户端在 Prompt 调试场景提交 `modelId` 时，服务端必须使用当前认证用户上下文在数据库中加载模型配置并发起上游 AI 请求。

#### Scenario: request with modelId

- Given 用户 A 提交 `modelId=m1`
- And `m1` 属于用户 A
- When 调用 `/api/ai/request` 或 `/api/ai/stream`
- Then 服务端使用 `m1` 对应的 `apiUrl/apiKey/model/protocol` 发起请求

#### Scenario: cross-user modelId denied

- Given 用户 B 提交 `modelId=m1`
- And `m1` 属于用户 A
- When 调用 AI 路由
- Then 返回 404/403，且不向上游发请求

## Modified

### Requirement: Settings endpoint scope

`/api/settings` 不再作为模型配置权威写入入口；模型配置通过独立模型配置接口管理。

### Requirement: Migration

系统启动后执行一次性全量迁移，将 `user_settings` 中模型相关键回填到新表，并保证幂等。
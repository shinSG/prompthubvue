# Design

## Overview

这次修复不改 JWT 生成和存储模型，只修正“真实会话来源”的判定顺序。后端鉴权先读取 header 与 cookie，如果 header 失效但 cookie 仍有效，则继续验证 cookie。前端启动阶段不再把内存 access token 视作唯一事实来源，而是直接通过带 cookie 的请求恢复会话。

## Affected Areas

- Data model:
  - 无变化。
- IPC / API:
  - 无新增 API；复用现有 `/api/auth/me`、`/api/auth/refresh`、`/api/auth/logout`。
- Filesystem / sync:
  - 无变化。
- UI / UX:
  - 登录后刷新页面、重新打开标签页、cookie 仍有效时，会话恢复不再依赖内存中的 bearer token。

## Tradeoffs

- 保留 header 校验优先级有利于兼容显式 bearer 调用方，但必须补上 cookie 回退，否则旧 header 会错误覆盖真实 cookie 会话。
- `AuthContext` 仍然保留内存 token，用于现有需要显式 bearer 的业务 API；这次只把登录相关恢复链路切到 cookie-first，避免一次性扩大改动面。
# Design

## Overview

保留现有单镜像架构：builder 阶段构建 web client 与 server，runner 阶段运行 Node 服务，由 server 进程同时提供 API 与构建后的前端静态资源。修复重点是让运行时路径约定与 web 配置代码一致，并确保 Docker 构建上下文来自 monorepo 根时仍然可控。

## Affected Areas

- Data model:
  - 无变化。
- IPC / API:
  - 无变化。
- Filesystem / sync:
  - Docker 运行时默认使用 `DATA_ROOT=/app`，并声明 `data`、`config`、`logs`、`backups` 持久化目录。
- UI / UX:
  - 无直接变化；容器启动后可通过单一端口提供完整 web 应用。

## Tradeoffs

- 继续使用单 Node 进程提供前后端，部署更简单，但前端静态资源仍依赖 Node 服务而非专门静态服务器。
- 根级 `.dockerignore` 能显著缩小上下文，但需要避免把 workspace 依赖元数据排除掉。
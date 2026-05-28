# Proposal

## Why

`apps/web` 已经有生产 Dockerfile，但当前实现和文档存在两个问题：一是运行时环境变量仍写成 `DATA_DIR`，而 web 运行时实际使用的是 `DATA_ROOT`；二是仓库根目录缺少生效的 `.dockerignore`，从 monorepo 根上下文构建时会把大量本地数据和无关产物带进构建上下文，影响构建稳定性与速度。

## Scope

- In scope:
  - 修正 web 生产 Dockerfile，使单镜像明确提供前端静态资源和后端 API。
  - 添加根级 `.dockerignore`，减少无关构建上下文。
  - 同步 web 自托管与架构文档中的 Docker 说明。
- Out of scope:
  - 改造 docker compose 拓扑。
  - 引入 nginx、caddy 等额外前端静态文件服务器。

## Risks

- 根级 `.dockerignore` 如果写得过宽，可能误排除构建所需文件。
- 运行时路径从 `DATA_DIR` 改为 `DATA_ROOT` 后，文档和 compose 需要保持一致。

## Rollback Thinking

- 若新 `.dockerignore` 误伤构建文件，可缩小忽略范围或恢复旧行为。
- 若部署环境依赖旧变量命名，可临时回退 Dockerfile 中的默认环境变量。
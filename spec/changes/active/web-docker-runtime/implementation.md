# Implementation

## Shipped

- 修正 `apps/web/Dockerfile` 的运行时默认路径变量，从 `DATA_DIR` 对齐为 `DATA_ROOT`。
- 为 web 运行时声明 `data`、`config`、`logs`、`backups` 容器卷路径。
- 新增 `apps/web/Dockerfile.aarch64`，用于固定 `linux/arm64` / `aarch64` 基础镜像的单镜像部署。
- 新增仓库根级 `.dockerignore`，避免 monorepo 根上下文把本地数据、构建产物和 node_modules 打进镜像上下文。
- 同步 `docs/web-self-hosted.md` 与 `docs/web-architecture-summary.md` 的 Docker 说明。

## Verification

- 待运行 `docker build -f apps/web/Dockerfile -t prompthub-web:test .`。

## Synced Docs

- `spec/changes/active/web-docker-runtime/*`
- `docs/web-self-hosted.md`
- `docs/web-architecture-summary.md`

## Follow-ups

- 若后续需要更小镜像体积，可单独做一轮 web runner 阶段依赖裁剪。
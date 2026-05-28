# Web Delta Spec

## Modified Requirements

### Requirement: Production container serves the complete self-hosted web app

`apps/web` 提供的生产容器镜像必须能单独承载完整 self-hosted web 应用，在一个容器内同时提供后端 API 与构建后的前端静态资源。

#### Scenario: running the production image

When an operator builds and runs `apps/web/Dockerfile`
Then the container exposes the web service on port `3000`
And the same process serves both REST API endpoints and the built web client.

#### Scenario: persisting runtime workspace data

When the production container starts without explicit path overrides
Then it uses `DATA_ROOT` as the runtime workspace root
And PromptHub-managed `data`、`config`、`logs`、`backups` paths remain persistable outside the container.
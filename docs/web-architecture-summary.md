# PromptHub Web 服务架构与技术组件概览

## 1. 总体定位

PromptHub Web 位于 `apps/web`，是 PromptHub 的轻量自托管浏览器版，面向个人、本地实验室或小型单实例部署。它不是官方商业云端 SaaS，而是一个用户自行部署、以 SQLite 和本地文件为核心的数据服务。

核心能力包括：

- Prompt 管理
- Folder 管理
- Skill 管理
- Settings
- Media 上传与读取
- Import / Export
- Sync / WebDAV / Self-hosted 同步
- AI 请求代理
- 浏览器端复用桌面端主工作区 UI

## 2. 顶层架构

整体可以理解为一个“单 Node 服务 + React SPA + SQLite + 文件工作区”的架构：

```text
Browser
  ↓
React SPA / Desktop UI adapter
  ↓
window.api-compatible bridge
  ↓
REST API /api/*
  ↓
Hono server
  ↓
Service layer
  ↓
@prompthub/db + SQLite + DATA_ROOT file workspace
```

生产环境下，Hono 服务同时负责：

1. 提供 `/api/*` 后端接口
2. 提供 `/health`
3. 托管构建后的前端静态资源 `dist/client`

相关入口：

- 服务启动入口：`apps/web/src/index.ts`
- Hono 应用组装：`apps/web/src/app.ts`
- 前端构建配置：`apps/web/vite.config.ts`
- 服务端构建配置：`apps/web/vite.server.config.ts`

## 3. 服务端架构

### 3.1 运行时与框架

Web 后端使用：

- Node.js 22
- Hono
- `@hono/node-server`
- TypeScript
- Vite SSR 构建服务端 bundle

开发模式下：

- 后端：`tsx watch src/index.ts`
- 前端：`vite`
- Vite 前端端口默认 `5174`
- API 代理到后端 `3000`

核心脚本定义在 `apps/web/package.json`。

### 3.2 应用初始化流程

`createApp()` 会执行以下步骤：

1. 初始化 SQLite 数据库
2. 启动 Prompt 文件工作区 bootstrap
3. 启动 Skill 工作区 bootstrap
4. 启动 Rule 工作区 bootstrap
5. 注册全局中间件
6. 注册认证路由
7. 注册受保护 API 路由
8. 暴露 `/health`

### 3.3 中间件

主要中间件包括：

| 中间件 | 作用 |
| --- | --- |
| `logger()` | 请求日志 |
| `securityHeaders()` | CSP、COOP、CORP、HSTS、X-Frame-Options 等安全头 |
| `auth()` | Bearer Token / Cookie 认证 |
| `errorHandler` | 统一异常响应 |

相关文件：

- `apps/web/src/middleware/logger.ts`
- `apps/web/src/middleware/security-headers.ts`
- `apps/web/src/middleware/auth.ts`
- `apps/web/src/middleware/error-handler.ts`

## 4. API 路由分层

后端 API 采用路由层 + 服务层结构：

```text
routes/*        负责 HTTP 输入、Zod 校验、响应封装
services/*      负责业务逻辑、权限、数据库和文件同步
@prompthub/db   负责 SQLite schema、adapter、CRUD 类
```

主要 API 分组：

| 路由前缀 | 文件 | 功能 |
| --- | --- | --- |
| `/api/auth` | `apps/web/src/routes/auth.ts` | 初始化、注册、登录、刷新、登出、当前用户、改密 |
| `/api/prompts` | `apps/web/src/routes/prompts.ts` | Prompt CRUD、搜索、复制、版本、回滚、Diff |
| `/api/folders` | `apps/web/src/routes/folders.ts` | Folder CRUD、重排 |
| `/api/skills` | `apps/web/src/routes/skills.ts` | Skill CRUD、搜索、导入导出、安全扫描、版本 |
| `/api/settings` | `apps/web/src/routes/settings.ts` | 用户设置 |
| `/api/ai` | `apps/web/src/routes/ai.ts` | AI 请求代理、流式代理 |
| `/api/media` | `apps/web/src/routes/media.ts` | 图片、视频上传、读取、删除 |
| `/api/sync` | `apps/web/src/routes/sync.ts` | 同步 manifest、data、config、push、pull、status |
| `/api/devices` | `apps/web/src/routes/devices.ts` | 浏览器设备 heartbeat |
| `/api/export` / `/api/import` | `apps/web/src/routes/import-export.ts` | 数据导入导出 |

统一响应封装在 `apps/web/src/utils/response.ts`。

## 5. 数据层架构

### 5.1 SQLite 与共享数据库包

Web 版使用共享包 `@prompthub/db` 作为数据库层，位置在 `packages/db`。

数据库特点：

- SQLite
- `node-sqlite3-wasm` 适配器
- 类 `better-sqlite3` 风格 API
- schema + migrations
- FTS5 Prompt 全文搜索
- 外键开启
- Prompt、Folder、Skill、Rule、User、Refresh Token、User Settings 等表

核心文件：

- SQLite 适配器：`packages/db/src/adapter.ts`
- 初始化与迁移：`packages/db/src/init.ts`
- Schema：`packages/db/src/schema.ts`
- DB 导出入口：`packages/db/src/index.ts`

Web 服务通过 `apps/web/src/database.ts` 初始化数据库，数据库路径来自运行时路径解析器。

### 5.2 数据目录

所有 Web 运行时数据派生自 `DATA_ROOT`，默认是当前目录。路径规则在 `apps/web/src/runtime-paths.ts`。

典型结构：

```text
DATA_ROOT/
  data/
    prompthub.db
    prompts/
    skills/
    rules/
    assets/<userId>/images/
    assets/<userId>/videos/
  config/
    settings/
    devices/
  logs/
  backups/
```

这意味着 Web 版不是纯数据库应用，它同时维护 SQLite 索引和文件工作区。

## 6. 认证与权限

认证系统由以下模块组成：

- 路由：`apps/web/src/routes/auth.ts`
- 服务：`apps/web/src/services/auth.service.ts`
- 中间件：`apps/web/src/middleware/auth.ts`

主要机制：

- 首次启动通过 `/setup` 创建第一个管理员
- `ALLOW_REGISTRATION=false` 时，只允许首个管理员初始化注册
- 密码使用 `bcryptjs`
- Token 使用 `jose` 签发 JWT
- Access Token + Refresh Token
- Refresh Token hash 存入数据库
- 支持 Authorization Bearer 与 Cookie
- Prompt / Folder / Skill 通过 `owner_user_id` 和 `visibility` 做用户隔离与共享权限

配置项定义在 `apps/web/src/config.ts`，包括：

- `JWT_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- 登录 / 注册 / 刷新限流窗口
- `ALLOW_REGISTRATION`
- `DATA_ROOT`
- `LOG_LEVEL`

## 7. 前端架构

### 7.1 React SPA

前端位于 `apps/web/src/client`，技术栈：

- React 18
- React Router
- TypeScript
- Vite
- Tailwind CSS
- i18next / react-i18next

入口与路由：

- `apps/web/src/client/main.tsx`
- `apps/web/src/client/App.tsx`

页面结构：

- `/setup`：首次管理员初始化
- `/login`：登录
- `/`：受保护的工作区页面
- `*`：回退到工作区页面

认证上下文在 `apps/web/src/client/contexts/AuthContext.tsx`。

### 7.2 复用桌面端 UI

Web 前端不是重新实现一套完整 Prompt 工作区，而是通过 Vite alias 复用桌面端 React 应用：

- `@desktop-renderer-app`
- `@desktop-toast-provider`
- `@desktop-renderer-globals-css`

配置见 `apps/web/vite.config.ts`。

Web 页面 `apps/web/src/client/pages/DesktopWorkspace.tsx` 会加载桌面主应用，并安装一个浏览器环境下的兼容桥接层。

### 7.3 桌面 API 兼容桥

桌面端原本通过 Electron `window.api` 调 IPC。Web 版通过 `apps/web/src/client/desktop/install-bridge.ts` 安装一个兼容的 `window.api`，把桌面端调用转换成 REST API 请求。

例如：

- `window.api.prompt.create()` → `POST /api/prompts`
- `window.api.folder.getAll()` → `GET /api/folders`
- `window.api.skill.update()` → `PUT /api/skills/:id`
- `window.api.settings.get()` → `GET /api/settings`
- `window.api.ai.request()` → `POST /api/ai/request`

这使 Web 版能最大化复用桌面端 UI 和业务交互组件。

## 8. AI 与远程请求代理

AI 代理路由在 `apps/web/src/routes/ai.ts`。

能力：

- 普通请求：`POST /api/ai/request`
- 流式请求：`POST /api/ai/stream`
- 支持 GET / POST
- 支持转发 headers 和 body
- 对上游流式响应保留 stream

远程 HTTP 工具在 `apps/web/src/utils/remote-http.ts`，包含重要安全控制：

- 协议白名单
- DNS 解析
- 阻止 localhost / localdomain
- 阻止私有 IPv4 / IPv6 / 保留网段
- 请求超时
- 最大跳转数
- 最大响应体大小

WebDAV 同步也复用这个远程请求安全层，相关实现见 `apps/web/src/services/webdav.server.ts`。

## 9. 同步、备份与导入导出

Web 版支持多类同步相关能力：

- 本地导入导出
- WebDAV push / pull
- Self-hosted 同步目标
- Manifest / data / config 分离
- Desktop 可把 Web 作为备份和恢复目标

同步路由在 `apps/web/src/routes/sync.ts`，WebDAV 编排在 `apps/web/src/services/sync-orchestrator.ts`。

导入导出路由在 `apps/web/src/routes/import-export.ts`，压缩相关依赖使用 `fflate`。

## 10. 部署架构

### 10.1 Docker

Web 服务提供生产 Dockerfile：`apps/web/Dockerfile`。

特点：

- 多阶段构建
- Builder 阶段安装依赖并构建 client + server
- Runner 阶段只安装生产依赖
- 单个 Node 进程同时提供后端 API 与构建后的前端静态资源
- 默认 `PORT=3000`
- 默认 `DATA_ROOT=/app`
- 暴露 `3000`
- 挂载 `/app/data`、`/app/config`、`/app/logs`、`/app/backups`
- 内置 `/health` 健康检查

### 10.2 Docker Compose

本地构建部署：`apps/web/docker-compose.yml`。

默认映射：

- 宿主机 `${PROMPTHUB_WEB_PORT:-3871}`
- 容器 `3000`

挂载：

- `./data:/app/data`
- `./config:/app/config`
- `./logs:/app/logs`

GHCR 镜像覆盖文件：`apps/web/docker-compose.ghcr.yml`。

## 11. 关键技术组件汇总

| 层级 | 技术 / 包 | 用途 |
| --- | --- | --- |
| Runtime | Node.js 22 | Web 服务运行时 |
| Server Framework | `Hono`, `@hono/node-server` | HTTP API 服务 |
| Frontend | React 18 | SPA UI |
| Routing | React Router | 前端路由 |
| Build | Vite 6 | 前端与服务端构建 |
| Language | TypeScript | 类型系统 |
| Styling | Tailwind CSS | UI 样式 |
| I18n | i18next, react-i18next | 多语言 |
| DB | SQLite | 本地数据存储 |
| DB Adapter | `node-sqlite3-wasm` | 跨平台 SQLite WASM 适配 |
| Shared DB Package | `@prompthub/db` | schema、adapter、CRUD |
| Shared Types | `@prompthub/shared` | Prompt / Skill / Folder 等共享类型 |
| Validation | `zod` | API 输入校验 |
| Auth | `jose`, `bcryptjs` | JWT 与密码 hash |
| Env | `dotenv` | 环境变量 |
| Remote Security | `ipaddr.js` | SSRF / 私有网段拦截 |
| Compression | `fflate` | 导入导出压缩 |
| Deployment | Docker, Docker Compose | 自托管部署 |

## 12. 总结

当前 Web 服务是一个自托管、单实例、Node/Hono 驱动的 PromptHub 浏览器版：前端复用桌面端 React UI，通过兼容 `window.api` 的桥接层调用 REST API；后端以 Hono 路由和服务层组织业务，使用共享 `@prompthub/db` SQLite 数据层，并在 `DATA_ROOT` 下维护数据库、Prompt/Skill/Rule 文件工作区、媒体、设置与备份数据。

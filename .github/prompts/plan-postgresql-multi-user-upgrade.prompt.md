---
description: 为 PromptHub 从单用户 SQLite 升级到 PostgreSQL 多用户架构生成实施计划
mode: agent
---

# 生成 PromptHub PostgreSQL 多用户升级计划

你是一个 LLM 应用开发专家、Electron/React/TypeScript 架构师和数据库迁移专家。请只输出升级修改计划，不要直接改代码，除非我明确要求你执行实现。

## 背景

当前项目是 PromptHub：本地优先的 AI Prompt 管理应用，包含桌面端 Electron、Web 端、共享类型和数据库包。现状假设为单用户，本地数据主要存储在 SQLite 中。现在需要设计升级方案：

1. 支持 PostgreSQL。
2. PostgreSQL 多用户能力主要面向 Web 端。
3. 所有业务数据都需要与用户关联。
4. 用户进入系统后只能查看、使用、创建、修改、删除自己的数据。
5. 需要兼顾现有 SQLite 本地模式，避免破坏桌面端单用户体验。
6. 用户体系使用项目现有的本地账号能力，不引入 OAuth 或第三方身份提供方，除非后续明确要求。

## 你的任务

请先阅读并理解仓库中的业务逻辑和代码结构，然后输出一份可执行的升级计划。重点关注：

- 数据库层：`packages/db`、桌面端数据库初始化和 schema、迁移机制、CRUD 类。
- 业务实体：prompts、prompt versions、folders、skills、skill versions、rules、settings、sync、resources，以及其他会持久化的数据。
- 应用入口和鉴权边界：桌面端 Electron、Web 端、IPC、preload、renderer stores/services、API/server 代码。
- 用户体系：优先复用 Web 端现有本地账号、登录、会话、用户表和认证中间件；如果现有能力不足，请指出缺口和最小补齐方案。
- 数据访问隔离：所有查询和写入都必须带用户上下文，避免越权访问。
- 迁移策略：从现有 SQLite 单用户数据升级到带 `user_id` 的模型，以及 PostgreSQL 初始化和迁移。
- 测试策略：必须覆盖租户隔离、越权访问、迁移兼容、SQLite/PostgreSQL 双后端行为。

## 分析步骤

请按下面顺序工作：

1. 扫描项目结构，识别数据层、IPC/API 边界、业务 CRUD、状态管理和测试目录。
2. 总结当前单用户 SQLite 数据模型和关键业务流。
3. 找出所有需要增加用户归属字段或用户作用域过滤的表、类型、函数、IPC/API、store/service。
4. 判断是否需要抽象数据库方言层或仓储层，以同时支持 SQLite 和 PostgreSQL。
5. 设计认证与用户上下文传递方式，重点说明 Web 端如何基于现有本地账号建立可信 `user_id`；同时说明桌面端继续使用默认本地用户的兼容方式。
6. 设计数据迁移路径，包括默认本地用户、现有数据回填、外键、索引、唯一约束和回滚方案。
7. 设计访问控制策略，明确哪些入口必须校验 `user_id`。
8. 输出分阶段实施计划，每一阶段都包含目标、涉及文件、主要改动、风险和验证方式。

## 输出格式

请使用中文输出，并严格按以下结构组织：

1. **当前架构理解**
   - 用要点概括 PromptHub 的代码结构、数据流、主要存储实体和现有 SQLite 假设。

2. **目标架构**
   - 描述桌面端 SQLite 单用户兼容模式、Web 端 PostgreSQL 多用户模式、用户上下文、数据隔离边界和后端差异抽象。

3. **数据库改造计划**
   - 列出需要新增或修改的表。
   - 说明每类表如何添加 `user_id`、外键、索引、唯一约束。
   - 说明 SQLite 和 PostgreSQL 的 schema/migration 差异处理。

4. **代码改造计划**
   - 按模块列出需要改的文件或目录，例如 `packages/db`、`apps/desktop/src/main`、`apps/desktop/src/preload`、`apps/desktop/src/renderer`、`apps/web/src`、`packages/shared`。
   - 对每个模块说明具体职责变化。

5. **鉴权与数据隔离计划**
   - 说明如何复用现有本地账号建立用户身份、如何传入 DB/API/IPC 层、如何防止 renderer 或客户端伪造 `user_id`。
   - 说明查询、写入、删除、搜索、同步、导入导出、技能仓库同步等场景的隔离要求。

6. **迁移与兼容计划**
   - 说明现有单用户 SQLite 数据如何迁移到默认本地用户。
   - 说明 PostgreSQL 新部署如何初始化。
   - 说明备份、回滚、兼容旧版本数据的处理。

7. **测试计划**
   - 列出单元测试、集成测试、E2E 测试和安全/越权测试。
   - 明确哪些测试要同时覆盖 SQLite 和 PostgreSQL。

8. **实施阶段清单**
   - 用阶段化 checklist 输出，例如：
     - Phase 0：调研和规格文档
     - Phase 1：数据库抽象与 schema
     - Phase 2：用户模型与鉴权上下文
     - Phase 3：CRUD/IPC/API 加 user scope
     - Phase 4：迁移与兼容
     - Phase 5：测试、文档和发布

9. **风险与开放问题**
   - 列出需要产品或架构决策确认的问题。
   - 标注高风险区域和建议优先验证的 proof-of-concept。

## 约束

- 不要直接开始编码。
- 不要只给泛泛建议，必须引用仓库中的真实目录、模块和关键文件。
- 不要假设所有端都必须立刻切换到 PostgreSQL；需要保留 SQLite 本地模式的兼容策略。
- PostgreSQL 多用户优先面向 Web 端；桌面端默认继续使用 SQLite 和本地默认用户，除非计划中明确作为可选未来扩展。
- 认证优先复用现有本地账号体系，不要把 OAuth、SSO、第三方登录作为默认方案。
- 不要让前端传入并决定最终 `user_id`；用户上下文必须由可信后端/主进程建立。
- 所有 SQL 方案必须使用参数化查询。
- 计划应符合项目的 DOS/spec 流程：非平凡改动需要在 `spec/changes/active/<change-key>/` 下建立 proposal、delta spec、design、tasks、implementation。

# Proposal

## Why

PromptHub currently stores application data through a SQLite-first database layer. The web application already has local account authentication and partial owner metadata, but the persistence layer is still optimized for a single local database and can be bypassed through unscoped CRUD methods. To support self-hosted multi-user web deployments, PromptHub needs PostgreSQL support and enforced user-scoped data access while preserving the existing desktop SQLite local workflow.

## Scope

- In scope:
  - Add a database configuration and driver abstraction path for SQLite and PostgreSQL.
  - Design PostgreSQL schema and migration separation from SQLite schema.
  - Reuse the existing web local account system for user identity.
  - Enforce trusted user context for prompts, folders, skills, settings, sync/import/export, rules, and related persisted data.
  - Preserve desktop SQLite single-user behavior by using a default local user context.
  - Add tests for multi-user isolation, migration compatibility, and backend-specific search behavior.
- Out of scope:
  - OAuth, SSO, or third-party identity providers.
  - Requiring desktop users to run PostgreSQL.
  - Replacing the full desktop IPC surface in the first implementation step.
  - A full sharing/collaboration product surface beyond the existing `private` / `shared` visibility model.

## Risks

- The current database adapter is synchronous while PostgreSQL drivers are asynchronous.
- SQLite FTS5 and PostgreSQL full-text search have different syntax and ranking semantics.
- Some web services still persist user data to filesystem paths, which can leak across users if path derivation is not centralized.
- Existing unscoped database classes can accidentally bypass service-layer user checks.
- Skill and rule workspace sync behavior differs between desktop filesystem workflows and web multi-user deployments.

## Rollback Thinking

- Keep SQLite as the default driver until PostgreSQL support is complete and verified.
- Gate PostgreSQL behind explicit configuration.
- Preserve existing desktop database initialization and backups.
- Make migrations transactional and record migration completion only after successful verification.
- Keep legacy SQLite CRUD exports during the transition so desktop regressions can be isolated from the web PostgreSQL work.

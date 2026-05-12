# Design

## Overview

The upgrade will be implemented as an incremental web-first database modernization. SQLite remains the default and continues to serve desktop local mode. PostgreSQL support is introduced behind explicit web configuration, with a new database configuration model and scoped repository layer. The web route layer continues to use existing local account authentication and passes a trusted actor from middleware to services; services and repositories enforce owner scope.

The first implementation step establishes the configuration and type scaffolding without changing runtime defaults. Later steps will add PostgreSQL connection pooling, PostgreSQL migrations, scoped repositories, and migration tooling.

## Affected Areas

- Data model:
  - Keep existing `users`, `refresh_tokens`, and `user_settings` as the local account foundation.
  - Make web PostgreSQL owner-bearing records use non-null owner ids.
  - Add or derive ownership for rules, versions, workspace records, and filesystem-backed data.
  - Split SQLite FTS5 search from PostgreSQL full-text search.
- IPC / API:
  - Web APIs continue deriving `actor` from authentication middleware.
  - Desktop IPC must not accept renderer-provided user ids; it uses a default local actor if new scoped repositories are adopted.
- Filesystem / sync:
  - Web filesystem data must use centralized user-scoped path helpers.
  - Desktop skill repo and prompt workspace sync remain local filesystem workflows.
- UI / UX:
  - No initial desktop UI changes.
  - Web setup/login flow continues to use local accounts.
  - PostgreSQL configuration is deployment-level, not user-facing in the first phase.

## Tradeoffs

- Keeping legacy SQLite classes during the transition avoids destabilizing desktop but temporarily duplicates data access paths.
- An async repository interface is better aligned with PostgreSQL, but requires staged migration from synchronous SQLite APIs.
- PostgreSQL row-level security can add defense in depth, but application-layer authorization remains mandatory for testability and SQLite compatibility.
- Search parity will be approximate because SQLite FTS5 and PostgreSQL full-text search do not share the same query language.

## Initial Implementation Slice

1. Add database configuration types and normalization helpers in `packages/db`.
2. Add trusted actor / visibility / local-user types in `packages/db` for use by future repositories.
3. Extend web configuration with `DB_DRIVER`, `DATABASE_URL`, and pool options while defaulting to SQLite.
4. Update web database startup to fail clearly if PostgreSQL is selected before the PostgreSQL adapter lands.
5. Record follow-up tasks for PostgreSQL adapter, migrations, and scoped repositories.

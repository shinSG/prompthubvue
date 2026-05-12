// Database adapter
export { default as DatabaseAdapter } from "./adapter";
export type { default as Database } from "./adapter";

// Database configuration and trusted actor scope
export {
  createPostgresConfig,
  createSqliteConfig,
  normalizeDatabaseConfig,
} from "./config";
export type {
  DatabaseConfig,
  DatabaseDriver,
  PostgresDatabaseConfig,
  PostgresPoolConfig,
  SqliteDatabaseConfig,
} from "./config";
export {
  LOCAL_ACTOR,
  LOCAL_USER_ID,
  canReadOwnerScoped,
  canWriteOwnerScoped,
  createLocalActor,
  resolveCreateOwner,
} from "./scope";
export type {
  OwnerScopedRow,
  OwnerVisibility,
  TrustedActor,
  UserRole,
} from "./scope";

// Schema
export { SCHEMA_TABLES, SCHEMA_INDEXES, SCHEMA } from "./schema";

// Initialization
export {
  initDatabase,
  getDatabase,
  closeDatabase,
  isDatabaseEmpty,
  db,
} from "./init";
export type { InitDatabaseHooks } from "./init";

// DB classes
export { PromptDB } from "./prompt";
export { FolderDB } from "./folder";
export { SkillDB } from "./skill";
export { RuleDB } from "./rule";

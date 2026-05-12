export type DatabaseDriver = "sqlite" | "postgres";

export interface SqliteDatabaseConfig {
  driver: "sqlite";
  path: string;
  readOnly?: boolean;
}

export interface PostgresPoolConfig {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface PostgresDatabaseConfig {
  driver: "postgres";
  connectionString: string;
  ssl?: boolean | "require";
  pool?: PostgresPoolConfig;
}

export type DatabaseConfig = SqliteDatabaseConfig | PostgresDatabaseConfig;

export function createSqliteConfig(
  path: string,
  options?: { readOnly?: boolean },
): SqliteDatabaseConfig {
  return {
    driver: "sqlite",
    path,
    readOnly: options?.readOnly,
  };
}

export function createPostgresConfig(input: {
  connectionString: string;
  ssl?: boolean | "require";
  pool?: PostgresPoolConfig;
}): PostgresDatabaseConfig {
  const connectionString = input.connectionString.trim();
  if (!connectionString) {
    throw new Error("PostgreSQL connection string is required");
  }

  return {
    driver: "postgres",
    connectionString,
    ssl: input.ssl,
    pool: input.pool,
  };
}

export function normalizeDatabaseConfig(
  input: string | DatabaseConfig,
): DatabaseConfig {
  if (typeof input === "string") {
    return createSqliteConfig(input);
  }

  if (input.driver === "postgres") {
    return createPostgresConfig(input);
  }

  return createSqliteConfig(input.path, { readOnly: input.readOnly });
}

import { getDatabase, initDatabase } from '@prompthub/db';
import { config } from './config.js';

let initialized = false;

export function getServerDatabase() {
  if (!initialized) {
    if (config.database.driver === 'postgres') {
      throw new Error(
        'PostgreSQL database driver is configured but not implemented yet. Use DB_DRIVER=sqlite until the PostgreSQL adapter lands.',
      );
    }

    initDatabase(config.database.sqlitePath);
    initialized = true;
  }

  return getDatabase();
}

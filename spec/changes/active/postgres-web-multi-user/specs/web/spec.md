# Delta Spec

## Added

- Web deployments SHALL support a database driver configuration that can select SQLite or PostgreSQL.
- PostgreSQL multi-user mode SHALL use the existing local account system as the source of authenticated users.
- Every private persisted business record in web mode SHALL be associated with exactly one trusted user id.
- Web services SHALL derive the effective user id from server-side authentication context, not from client request bodies, query strings, or renderer state.
- Desktop SQLite mode SHALL continue to work without PostgreSQL by using a default local user context internally.
- Search implementations SHALL be backend-specific while preserving user isolation before search results are returned.

## Modified

- Prompt, folder, and skill creation SHALL write ownership during the insert operation rather than relying on a post-create owner update.
- Prompt, folder, skill, rule, version, settings, backup, sync, import/export, media, and workspace operations SHALL be audited for user scope.
- Shared data SHALL be readable by authenticated users but writable only through explicitly authorized flows.
- Database migrations SHALL be separated by database dialect where syntax or behavior differs.

## Removed

- Web multi-user flows SHALL NOT rely on unscoped `getById`, `getAll`, `update`, or `delete` database methods for authorization decisions.
- Web multi-user flows SHALL NOT require OAuth, SSO, or third-party identity providers for the initial implementation.

## Scenarios

- Given user A and user B have private prompts, when user A lists, searches, reads, updates, exports, or deletes prompts, then user B's private prompts are not visible or mutable.
- Given an admin creates shared data, when a normal authenticated user reads shared data, then it is visible; when the normal user attempts to modify shared data, then the request is rejected.
- Given a client sends `ownerUserId` in a create or import payload, when the server persists private data, then the stored owner is the authenticated user's id.
- Given a desktop user starts the app after upgrade, when existing SQLite rows have no owner, then they are treated as belonging to the default local user and the visible desktop behavior is unchanged.
- Given PostgreSQL mode is configured without a connection string, when the web server starts, then startup fails with a clear configuration error.

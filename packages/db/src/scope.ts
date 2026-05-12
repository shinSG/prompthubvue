export type UserRole = "admin" | "user";

export type OwnerVisibility = "private" | "shared";

export interface TrustedActor {
  userId: string;
  role: UserRole;
}

export interface OwnerScopedRow {
  owner_user_id: string | null;
  visibility: OwnerVisibility;
}

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000000";

export const LOCAL_ACTOR: TrustedActor = {
  userId: LOCAL_USER_ID,
  role: "admin",
};

export function createLocalActor(userId = LOCAL_USER_ID): TrustedActor {
  return {
    userId,
    role: "admin",
  };
}

export function canReadOwnerScoped(
  actor: TrustedActor,
  row: OwnerScopedRow,
): boolean {
  if (row.visibility === "shared") {
    return true;
  }

  return row.owner_user_id === actor.userId;
}

export function canWriteOwnerScoped(
  actor: TrustedActor,
  row: OwnerScopedRow,
): boolean {
  if (row.visibility === "shared") {
    return actor.role === "admin";
  }

  return row.owner_user_id === actor.userId;
}

export function resolveCreateOwner(actor: TrustedActor): string {
  if (!actor.userId.trim()) {
    throw new Error("Trusted actor userId is required");
  }

  return actor.userId;
}

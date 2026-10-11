import type { Executor } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/** Writes an audit record. Never throws: auditing must not break the action. */
export async function audit(db: Executor, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {
    logger.error("audit.write_failed", { error, action: entry.action });
  }
}

import { pool } from "@/lib/db";

/** Запись в журнал действий админки: кто, что и над чем сделал. */
export async function audit(
  actorId: number,
  action: string,
  targetType: string,
  targetId: string | number | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    "insert into audit_log (actor_id, action, target_type, target_id, details) values ($1, $2, $3, $4, $5)",
    [actorId, action, targetType, targetId === null ? null : String(targetId), details],
  );
}

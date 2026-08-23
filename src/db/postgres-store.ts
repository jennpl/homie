import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { AppendNoteInput, AppendNoteResult, Note, OrganizationNote } from "../contracts/notes.js";
import type {
  OrganizationResult,
  OrganizationSnapshot,
  OrganizeInput,
} from "../contracts/organization.js";
import type { NoteStore } from "../core/notes/append-note.js";

type SaveSnapshotInput = OrganizeInput & {
  result: OrganizationResult;
  sourceNoteIds: string[];
  model: string;
  promptVersion: string;
  usage: unknown;
};

export class PostgresStore implements NoteStore {
  constructor(private readonly pool: Pool) {}

  async householdTimezone(householdId: string): Promise<string> {
    const result = await this.pool.query<{ timezone: string }>(
      "SELECT timezone FROM households WHERE id = $1",
      [householdId],
    );
    if (!result.rows[0]) throw new Error(`Unknown household: ${householdId}`);
    return result.rows[0].timezone;
  }

  async append(input: AppendNoteInput & { localDate: string }): Promise<AppendNoteResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const id = randomUUID();
      const inserted = await client.query<NoteRow>(
        `INSERT INTO notes
          (id, household_id, author_id, text, received_at, local_date,
           source_provider, source_external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (source_provider, source_external_id) DO NOTHING
         RETURNING *,
           (SELECT display_name FROM memberships
            WHERE household_id = $2 AND author_id = $3) AS author_name`,
        [id, input.householdId, input.authorId, input.text, input.receivedAt,
          input.localDate, input.sourceProvider, input.sourceExternalId],
      );

      if (inserted.rows[0]) {
        const event = { type: "note.created" as const, version: 1 as const, noteId: id };
        await client.query(
          `INSERT INTO outbox_events
            (id, event_type, schema_version, aggregate_id, payload)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [randomUUID(), event.type, event.version, id, JSON.stringify({ noteId: id })],
        );
        await client.query("COMMIT");
        return { note: toNote(inserted.rows[0]), created: true, event };
      }

      const existing = await client.query<NoteRow>(
        `SELECT n.*, m.display_name AS author_name
         FROM notes n
         JOIN memberships m
           ON m.household_id = n.household_id AND m.author_id = n.author_id
         WHERE n.source_provider = $1 AND n.source_external_id = $2`,
        [input.sourceProvider, input.sourceExternalId],
      );
      await client.query("COMMIT");
      if (!existing.rows[0]) throw new Error("Duplicate note could not be reloaded");
      return { note: toNote(existing.rows[0]), created: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listNotes(householdId: string, startDate: string, endDateExclusive: string): Promise<OrganizationNote[]> {
    const result = await this.pool.query<NoteRow>(
      `SELECT n.*, m.display_name AS author_name
       FROM notes n
       JOIN memberships m
         ON m.household_id = n.household_id AND m.author_id = n.author_id
       WHERE n.household_id = $1
         AND n.local_date >= $2::date
         AND n.local_date < $3::date
       ORDER BY n.received_at, n.id`,
      [householdId, startDate, endDateExclusive],
    );
    return result.rows.map((row) => ({ ...toNote(row), authorName: row.author_name }));
  }

  async saveSnapshot(input: SaveSnapshotInput): Promise<OrganizationSnapshot> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const lockKey = `${input.householdId}:${input.window.kind}:${input.window.startDate}`;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lockKey]);
      const versionResult = await client.query<{ version: number }>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS version
         FROM organization_snapshots
         WHERE household_id = $1 AND window_kind = $2 AND start_date = $3::date`,
        [input.householdId, input.window.kind, input.window.startDate],
      );
      const version = Number(versionResult.rows[0]?.version ?? 1);
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await client.query(
        `INSERT INTO organization_snapshots
          (id, household_id, window_kind, start_date, end_date_exclusive,
           version, summary, plan_json, digest_text, source_note_ids, reason,
           model, prompt_version, usage_json, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::uuid[],
                 $11, $12, $13, $14::jsonb, $15)`,
        [id, input.householdId, input.window.kind, input.window.startDate,
          input.window.endDateExclusive, version, input.result.summary.text,
          JSON.stringify(input.result.planItems), input.result.digestText,
          input.sourceNoteIds, input.reason, input.model, input.promptVersion,
          JSON.stringify(input.usage ?? null), createdAt],
      );
      await client.query("COMMIT");
      return {
        ...input.result,
        id,
        householdId: input.householdId,
        window: input.window,
        version,
        sourceNoteIds: input.sourceNoteIds,
        reason: input.reason,
        model: input.model,
        createdAt,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

type NoteRow = {
  id: string;
  household_id: string;
  author_id: string;
  author_name: string;
  text: string;
  received_at: Date | string;
  local_date: Date | string;
};

function toNote(row: NoteRow): Note {
  const localDate = row.local_date instanceof Date
    ? row.local_date.toISOString().slice(0, 10)
    : String(row.local_date).slice(0, 10);
  return {
    id: row.id,
    householdId: row.household_id,
    authorId: row.author_id,
    text: row.text,
    receivedAt: new Date(row.received_at).toISOString(),
    localDate,
  };
}

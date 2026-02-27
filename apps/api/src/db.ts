import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type ApplicationEmailStatus = 'pending' | 'sent' | 'failed';

export type ApplicationRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  locale: string;
  payload_json: string;
  email_status: ApplicationEmailStatus;
  ip_hash: string;
  view_token_hash: string;
  edit_token_hash: string;
};

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  sqlDefinition: string
): void {
  const existingColumns = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  const hasColumn = existingColumns.some((column) => column.name === columnName);
  if (hasColumn) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlDefinition}`);
}

export function createDatabase(databasePath: string): Database.Database {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locale TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      email_status TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      view_token_hash TEXT NOT NULL,
      edit_token_hash TEXT NOT NULL
    );
  `);

  ensureColumn(db, 'applications', 'updated_at', "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, 'applications', 'view_token_hash', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'applications', 'edit_token_hash', "TEXT NOT NULL DEFAULT ''");

  return db;
}

export function insertApplication(
  db: Database.Database,
  payload: Omit<ApplicationRecord, 'created_at' | 'updated_at'>
): void {
  const query = db.prepare(
    `
    INSERT INTO applications (
      id,
      locale,
      payload_json,
      email_status,
      ip_hash,
      view_token_hash,
      edit_token_hash
    )
    VALUES (
      @id,
      @locale,
      @payload_json,
      @email_status,
      @ip_hash,
      @view_token_hash,
      @edit_token_hash
    )
  `
  );

  query.run(payload);
}

export function updateApplicationEmailStatus(
  db: Database.Database,
  id: string,
  status: ApplicationEmailStatus
): void {
  const query = db.prepare(
    `
    UPDATE applications
    SET email_status = @status, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  );

  query.run({ id, status });
}

export function updateApplicationPayload(
  db: Database.Database,
  input: {
    id: string;
    locale: string;
    payload_json: string;
  }
): void {
  const query = db.prepare(
    `
    UPDATE applications
    SET locale = @locale, payload_json = @payload_json, updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  );

  query.run(input);
}

export function getApplicationById(db: Database.Database, id: string): ApplicationRecord | undefined {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as ApplicationRecord | undefined;
}

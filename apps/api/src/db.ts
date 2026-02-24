import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type ApplicationEmailStatus = 'pending' | 'sent' | 'failed';

export type ApplicationRecord = {
  id: string;
  created_at: string;
  locale: string;
  payload_json: string;
  email_status: ApplicationEmailStatus;
  ip_hash: string;
};

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
      locale TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      email_status TEXT NOT NULL,
      ip_hash TEXT NOT NULL
    );
  `);

  return db;
}

export function insertApplication(
  db: Database.Database,
  payload: Omit<ApplicationRecord, 'created_at'>
): void {
  const query = db.prepare(
    `
    INSERT INTO applications (id, locale, payload_json, email_status, ip_hash)
    VALUES (@id, @locale, @payload_json, @email_status, @ip_hash)
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
    SET email_status = @status
    WHERE id = @id
  `
  );

  query.run({ id, status });
}

export function getApplicationById(db: Database.Database, id: string): ApplicationRecord | undefined {
  return db.prepare('SELECT * FROM applications WHERE id = ?').get(id) as ApplicationRecord | undefined;
}

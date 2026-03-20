import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { AuthRole, ContactMessageChannel, ContactMessageStatus, Locale } from '@nyvoro/shared-types';

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

export type ApplicationSummaryRecord = {
  id: string;
  created_at: string;
  locale: Locale;
  email_status: ApplicationEmailStatus;
  payload_json: string;
};

export type AuthUserRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  role: AuthRole;
  email: string;
  first_name: string | null;
  last_name: string | null;
  password_hash: string;
  totp_secret: string | null;
  totp_enabled: number;
  is_temporary: number;
};

export type ContactMessageRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  locale: Locale;
  channel: ContactMessageChannel;
  full_name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  ip_hash: string;
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      role TEXT NOT NULL,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      password_hash TEXT NOT NULL,
      totp_secret TEXT,
      totp_enabled INTEGER NOT NULL DEFAULT 0,
      is_temporary INTEGER NOT NULL DEFAULT 0,
      UNIQUE(role, email)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      locale TEXT NOT NULL,
      channel TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolved_at TEXT,
      resolved_by TEXT,
      ip_hash TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created_at
    ON contact_messages(status, created_at DESC);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
    ON contact_messages(created_at DESC);
  `);

  // SQLite does not allow adding a column with a non-constant default (e.g. CURRENT_TIMESTAMP)
  // through ALTER TABLE, so we add it as plain TEXT for migrated databases.
  ensureColumn(db, 'applications', 'updated_at', 'TEXT');
  ensureColumn(db, 'applications', 'view_token_hash', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'applications', 'edit_token_hash', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'auth_users', 'first_name', 'TEXT');
  ensureColumn(db, 'auth_users', 'last_name', 'TEXT');

  // Backfill legacy rows so updated_at is always populated.
  db.exec(`
    UPDATE applications
    SET updated_at = COALESCE(NULLIF(updated_at, ''), created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR updated_at = '';
  `);

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

export function countApplications(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) AS total FROM applications').get() as { total: number };
  return row.total;
}

export function countApplicationsSince(db: Database.Database, sinceIso: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM applications WHERE datetime(created_at) >= datetime(?)')
    .get(sinceIso) as { total: number };
  return row.total;
}

export function countApplicationsByEmailStatuses(
  db: Database.Database,
  statuses: ApplicationEmailStatus[]
): number {
  if (statuses.length === 0) {
    return 0;
  }

  const placeholders = statuses.map(() => '?').join(', ');
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM applications WHERE email_status IN (${placeholders})`)
    .get(...statuses) as { total: number };

  return row.total;
}

export function listRecentApplications(db: Database.Database, limit: number): ApplicationSummaryRecord[] {
  return db
    .prepare(
      `
      SELECT id, created_at, locale, email_status, payload_json
      FROM applications
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `
    )
    .all(limit) as ApplicationSummaryRecord[];
}

export function upsertAuthUser(
  db: Database.Database,
  input: {
    id: string;
    role: AuthRole;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    password_hash: string;
    is_temporary: boolean;
    totp_secret?: string | null;
    totp_enabled?: boolean;
  }
): void {
  const query = db.prepare(
    `
    INSERT INTO auth_users (
      id,
      role,
      email,
      first_name,
      last_name,
      password_hash,
      totp_secret,
      totp_enabled,
      is_temporary
    )
    VALUES (
      @id,
      @role,
      @email,
      @first_name,
      @last_name,
      @password_hash,
      @totp_secret,
      @totp_enabled,
      @is_temporary
    )
    ON CONFLICT(role, email) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      password_hash = excluded.password_hash,
      totp_secret = excluded.totp_secret,
      totp_enabled = excluded.totp_enabled,
      is_temporary = excluded.is_temporary,
      updated_at = CURRENT_TIMESTAMP
  `
  );

  query.run({
    ...input,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    totp_secret: input.totp_secret ?? null,
    totp_enabled: input.totp_enabled ? 1 : 0,
    is_temporary: input.is_temporary ? 1 : 0
  });
}

export function insertAuthUser(
  db: Database.Database,
  input: {
    id: string;
    role: AuthRole;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    password_hash: string;
    is_temporary: boolean;
    totp_secret?: string | null;
    totp_enabled?: boolean;
  }
): void {
  const query = db.prepare(
    `
    INSERT INTO auth_users (
      id,
      role,
      email,
      first_name,
      last_name,
      password_hash,
      totp_secret,
      totp_enabled,
      is_temporary
    )
    VALUES (
      @id,
      @role,
      @email,
      @first_name,
      @last_name,
      @password_hash,
      @totp_secret,
      @totp_enabled,
      @is_temporary
    )
  `
  );

  query.run({
    ...input,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
    totp_secret: input.totp_secret ?? null,
    totp_enabled: input.totp_enabled ? 1 : 0,
    is_temporary: input.is_temporary ? 1 : 0
  });
}

export function getAuthUserByRoleAndEmail(
  db: Database.Database,
  input: {
    role: AuthRole;
    email: string;
  }
): AuthUserRecord | undefined {
  return db
    .prepare('SELECT * FROM auth_users WHERE role = @role AND email = @email')
    .get(input) as AuthUserRecord | undefined;
}

export function listAuthUsersByEmail(db: Database.Database, email: string): AuthUserRecord[] {
  return db
    .prepare(
      `
      SELECT *
      FROM auth_users
      WHERE email = ?
      ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, created_at ASC
    `
    )
    .all(email) as AuthUserRecord[];
}

export function getAuthUserById(db: Database.Database, id: string): AuthUserRecord | undefined {
  return db
    .prepare('SELECT * FROM auth_users WHERE id = ?')
    .get(id) as AuthUserRecord | undefined;
}

export function updateAuthUserProfile(
  db: Database.Database,
  input: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }
): void {
  db.prepare(
    `
    UPDATE auth_users
    SET
      email = @email,
      first_name = @first_name,
      last_name = @last_name,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run(input);
}

export function updateAuthUserPasswordHash(
  db: Database.Database,
  input: {
    id: string;
    password_hash: string;
  }
): void {
  db.prepare(
    `
    UPDATE auth_users
    SET
      password_hash = @password_hash,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run(input);
}

export function setAuthUserTotpSecret(
  db: Database.Database,
  input: { id: string; secret: string }
): void {
  db.prepare(
    `
    UPDATE auth_users
    SET
      totp_secret = @secret,
      totp_enabled = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run(input);
}

export function enableAuthUserTotp(db: Database.Database, id: string): void {
  db.prepare(
    `
    UPDATE auth_users
    SET
      totp_enabled = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(id);
}

export function disableAuthUserTotp(db: Database.Database, id: string): void {
  db.prepare(
    `
    UPDATE auth_users
    SET
      totp_secret = NULL,
      totp_enabled = 0,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(id);
}

export function insertContactMessage(
  db: Database.Database,
  input: {
    id: string;
    locale: Locale;
    channel: ContactMessageChannel;
    full_name: string;
    email: string;
    subject: string;
    message: string;
    status: ContactMessageStatus;
    ip_hash: string;
  }
): void {
  db.prepare(
    `
    INSERT INTO contact_messages (
      id,
      locale,
      channel,
      full_name,
      email,
      subject,
      message,
      status,
      ip_hash
    )
    VALUES (
      @id,
      @locale,
      @channel,
      @full_name,
      @email,
      @subject,
      @message,
      @status,
      @ip_hash
    )
  `
  ).run(input);
}

export function getContactMessageById(db: Database.Database, id: string): ContactMessageRecord | undefined {
  return db
    .prepare('SELECT * FROM contact_messages WHERE id = ?')
    .get(id) as ContactMessageRecord | undefined;
}

export function countOpenContactMessages(db: Database.Database): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'open'`)
    .get() as { total: number };

  return row.total;
}

export function listRecentContactMessages(db: Database.Database, limit: number): ContactMessageRecord[] {
  return db
    .prepare(
      `
      SELECT *
      FROM contact_messages
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, datetime(created_at) DESC
      LIMIT ?
    `
    )
    .all(limit) as ContactMessageRecord[];
}

export function markContactMessageResolved(
  db: Database.Database,
  input: { id: string; resolved_by: string }
): ContactMessageRecord | undefined {
  db.prepare(
    `
    UPDATE contact_messages
    SET
      status = 'resolved',
      resolved_at = COALESCE(resolved_at, CURRENT_TIMESTAMP),
      resolved_by = COALESCE(resolved_by, @resolved_by),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `
  ).run(input);

  return getContactMessageById(db, input.id);
}

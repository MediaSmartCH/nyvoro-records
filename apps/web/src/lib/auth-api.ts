import type { Locale } from '@nyvoro/shared-types';

export type AuthRole = 'admin' | 'artist';
export type ContactMessageChannel = 'general' | 'press' | 'demos';
export type ContactMessageStatus = 'open' | 'resolved';
export type AuthSessionSnapshot = {
  authenticated: boolean;
  role?: AuthRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  expiresAt?: string;
  shouldSetupTwoFactor?: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
  honeypot: string;
  turnstileToken: string;
};

export type RegisterInput = {
  role: 'artist';
  email: string;
  password: string;
  honeypot: string;
  turnstileToken: string;
};

export type LoginMfaVerifyInput = {
  mfaToken: string;
  code: string;
};

export type ContactMessageCreateInput = {
  locale: Locale;
  channel: ContactMessageChannel;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  honeypot: string;
  turnstileToken: string;
};

export type AdminDashboardSummary = {
  totalApplications: number;
  applicationsLast7Days: number;
  applicationsEmailPendingOrFailed: number;
  openContactMessages: number;
};

export type AdminRecentApplication = {
  id: string;
  createdAt: string;
  locale: Locale;
  artistName: string;
  email: string;
  emailStatus: 'pending' | 'sent' | 'failed';
};

export type AdminRecentContactMessage = {
  id: string;
  createdAt: string;
  locale: Locale;
  channel: ContactMessageChannel;
  fullName: string;
  email: string;
  subject: string;
  status: ContactMessageStatus;
};

export type AccountProfileUpdateInput = {
  firstName: string;
  lastName: string;
  email: string;
};

export type AccountPasswordUpdateInput = {
  currentPassword: string;
  newPassword: string;
};

type ApiBody = {
  status?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type ApiResponse<TBody extends ApiBody> = {
  ok: boolean;
  status: number;
  body: TBody;
};

type LoginBody = ApiBody & {
  status?: 'ok' | 'error' | 'mfa_required';
  role?: AuthRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  expiresAt?: string;
  shouldSetupTwoFactor?: boolean;
  mfaToken?: string;
};

type RegisterBody = ApiBody & {
  role?: AuthRole;
  email?: string;
};

type SessionBody = ApiBody & {
  authenticated?: boolean;
  role?: AuthRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  expiresAt?: string;
  shouldSetupTwoFactor?: boolean;
};

type AccountProfileBody = ApiBody & {
  role?: AuthRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  expiresAt?: string;
  shouldSetupTwoFactor?: boolean;
};

type AccountMfaSetupBody = ApiBody & {
  secret?: string;
  issuer?: string;
  accountLabel?: string;
  otpauthUri?: string;
};

type AccountMfaToggleBody = ApiBody & {
  mfaEnabled?: boolean;
};

type AccountPasswordBody = ApiBody;

type ContactMessageCreateBody = ApiBody & {
  messageId?: string;
};

type AdminDashboardBody = ApiBody & {
  summary?: AdminDashboardSummary;
  recentApplications?: AdminRecentApplication[];
  recentContactMessages?: AdminRecentContactMessage[];
};

type ResolveContactMessageBody = ApiBody & {
  messageId?: string;
  newStatus?: ContactMessageStatus;
};

const AUTH_SESSION_STORAGE_KEY = 'nyvoro_auth_session_snapshot_v1';
const authSessionListeners = new Set<(snapshot: AuthSessionSnapshot) => void>();

function parseCachedSnapshot(value: string | null): AuthSessionSnapshot {
  if (!value) {
    return { authenticated: false };
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthSessionSnapshot>;
    if (!parsed || typeof parsed !== 'object') {
      return { authenticated: false };
    }

    const snapshot: AuthSessionSnapshot = {
      authenticated: parsed.authenticated === true,
      shouldSetupTwoFactor: parsed.shouldSetupTwoFactor === true
    };

    if (parsed.role === 'admin' || parsed.role === 'artist') {
      snapshot.role = parsed.role;
    }
    if (typeof parsed.email === 'string') {
      snapshot.email = parsed.email;
    }
    if (typeof parsed.firstName === 'string') {
      snapshot.firstName = parsed.firstName;
    }
    if (typeof parsed.lastName === 'string') {
      snapshot.lastName = parsed.lastName;
    }
    if (typeof parsed.displayName === 'string') {
      snapshot.displayName = parsed.displayName;
    }
    if (typeof parsed.expiresAt === 'string') {
      snapshot.expiresAt = parsed.expiresAt;
    }

    return snapshot;
  } catch {
    return { authenticated: false };
  }
}

function readCachedSnapshot(): AuthSessionSnapshot {
  if (typeof window === 'undefined') {
    return { authenticated: false };
  }

  return parseCachedSnapshot(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY));
}

let cachedAuthSessionSnapshot: AuthSessionSnapshot = readCachedSnapshot();

function emitAuthSessionSnapshot(snapshot: AuthSessionSnapshot): void {
  for (const listener of authSessionListeners) {
    listener(snapshot);
  }
}

function persistAuthSessionSnapshot(snapshot: AuthSessionSnapshot): void {
  cachedAuthSessionSnapshot = snapshot;

  if (typeof window !== 'undefined') {
    if (snapshot.authenticated) {
      window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    }
  }

  emitAuthSessionSnapshot(snapshot);
}

function normalizeAuthSnapshotFromBody(
  body: {
    role?: AuthRole;
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    expiresAt?: string;
    shouldSetupTwoFactor?: boolean;
  },
  authenticated: boolean
): AuthSessionSnapshot {
  const snapshot: AuthSessionSnapshot = {
    authenticated,
    shouldSetupTwoFactor: body.shouldSetupTwoFactor === true
  };

  if (body.role) {
    snapshot.role = body.role;
  }
  if (typeof body.email === 'string') {
    snapshot.email = body.email;
  }
  if (typeof body.firstName === 'string') {
    snapshot.firstName = body.firstName;
  }
  if (typeof body.lastName === 'string') {
    snapshot.lastName = body.lastName;
  }
  if (typeof body.displayName === 'string') {
    snapshot.displayName = body.displayName;
  }
  if (typeof body.expiresAt === 'string') {
    snapshot.expiresAt = body.expiresAt;
  }

  return snapshot;
}

export function getCachedAuthSessionSnapshot(): AuthSessionSnapshot {
  return cachedAuthSessionSnapshot;
}

export function subscribeAuthSessionSnapshot(
  listener: (snapshot: AuthSessionSnapshot) => void
): () => void {
  authSessionListeners.add(listener);
  return () => {
    authSessionListeners.delete(listener);
  };
}

export function clearCachedAuthSessionSnapshot(): void {
  persistAuthSessionSnapshot({ authenticated: false });
}

function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveConfiguredApiBaseUrl(): string | undefined {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredApiBaseUrl) {
    return undefined;
  }

  const normalizedConfiguredApiBaseUrl = normalizeApiBaseUrl(configuredApiBaseUrl);

  if (typeof window === 'undefined') {
    return normalizedConfiguredApiBaseUrl;
  }

  const currentHostname = window.location.hostname;

  try {
    const configuredHostname = new URL(normalizedConfiguredApiBaseUrl).hostname;

    // Prevent accidental production usage against a localhost API endpoint.
    if (!isLocalHostname(currentHostname) && isLocalHostname(configuredHostname)) {
      console.warn('[auth-api] Ignoring VITE_API_BASE_URL pointing to localhost in non-local runtime.');
      return undefined;
    }
  } catch {
    if (!isLocalHostname(currentHostname)) {
      console.warn('[auth-api] Invalid VITE_API_BASE_URL. Falling back to runtime defaults.');
      return undefined;
    }
  }

  return normalizedConfiguredApiBaseUrl;
}

function resolveApiBaseUrl(): string {
  const configuredApiBaseUrl = resolveConfiguredApiBaseUrl();
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (isLocalHostname(hostname)) {
      return 'http://localhost:4000';
    }

    if (hostname === 'nyvoro-records.com' || hostname === 'www.nyvoro-records.com') {
      return 'https://api.nyvoro-records.com';
    }

    return origin;
  }

  return '';
}

export function buildApiUrl(path: string): string {
  const apiBaseUrl = resolveApiBaseUrl();
  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}

async function parseResponseBody(response: Response): Promise<ApiBody> {
  return response.json().catch(() => ({}));
}

function buildNetworkErrorResponse<TBody extends ApiBody>(body: TBody): ApiResponse<TBody> {
  return {
    ok: false,
    status: 0,
    body
  };
}

export async function submitLogin(values: LoginInput): Promise<ApiResponse<LoginBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as LoginBody;

  if (response.ok && body.status === 'ok') {
    persistAuthSessionSnapshot(normalizeAuthSnapshotFromBody(body, true));
  } else if (response.ok && body.status === 'mfa_required') {
    persistAuthSessionSnapshot({ authenticated: false });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function submitRegister(values: RegisterInput): Promise<ApiResponse<RegisterBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/auth/register'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as RegisterBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function verifyLoginMfa(values: LoginMfaVerifyInput): Promise<ApiResponse<LoginBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/auth/login/verify-mfa'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as LoginBody;
  if (response.ok && body.status === 'ok') {
    persistAuthSessionSnapshot(normalizeAuthSnapshotFromBody(body, true));
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function fetchSession(): Promise<ApiResponse<SessionBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/auth/session'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as SessionBody;

  if (response.ok && body.authenticated === true) {
    persistAuthSessionSnapshot(normalizeAuthSnapshotFromBody(body, true));
  } else if (response.ok) {
    persistAuthSessionSnapshot({ authenticated: false });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function logoutSession(): Promise<ApiResponse<ApiBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = await parseResponseBody(response);

  persistAuthSessionSnapshot({ authenticated: false });

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function submitContactMessage(
  values: ContactMessageCreateInput
): Promise<ApiResponse<ContactMessageCreateBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/contact-messages'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as ContactMessageCreateBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function fetchAdminDashboard(): Promise<ApiResponse<AdminDashboardBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/admin/dashboard'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AdminDashboardBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function resolveContactMessage(
  messageId: string
): Promise<ApiResponse<ResolveContactMessageBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(`/api/v1/admin/contact-messages/${encodeURIComponent(messageId)}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as ResolveContactMessageBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function fetchAccountProfile(): Promise<ApiResponse<AccountProfileBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/profile'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountProfileBody;
  if (response.ok) {
    persistAuthSessionSnapshot(normalizeAuthSnapshotFromBody(body, true));
  } else if (response.status === 401) {
    persistAuthSessionSnapshot({ authenticated: false });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function updateAccountProfile(
  values: AccountProfileUpdateInput
): Promise<ApiResponse<AccountProfileBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/profile'), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountProfileBody;
  if (response.ok) {
    persistAuthSessionSnapshot(normalizeAuthSnapshotFromBody(body, true));
  } else if (response.status === 401) {
    persistAuthSessionSnapshot({ authenticated: false });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function changeAccountPassword(
  values: AccountPasswordUpdateInput
): Promise<ApiResponse<AccountPasswordBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/password'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountPasswordBody;
  if (response.status === 401) {
    persistAuthSessionSnapshot({ authenticated: false });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function setupAccountMfa(): Promise<ApiResponse<AccountMfaSetupBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/mfa/setup'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountMfaSetupBody;

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function verifyAccountMfa(code: string): Promise<ApiResponse<AccountMfaToggleBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/mfa/verify'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountMfaToggleBody;
  if (response.ok && cachedAuthSessionSnapshot.authenticated) {
    persistAuthSessionSnapshot({
      ...cachedAuthSessionSnapshot,
      shouldSetupTwoFactor: false
    });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

export async function disableAccountMfa(): Promise<ApiResponse<AccountMfaToggleBody>> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/v1/account/mfa/disable'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch {
    return buildNetworkErrorResponse({
      status: 'error',
      code: 'network_error',
      message: 'Network request failed.'
    });
  }

  const body = (await parseResponseBody(response)) as AccountMfaToggleBody;
  if (response.ok && cachedAuthSessionSnapshot.authenticated) {
    persistAuthSessionSnapshot({
      ...cachedAuthSessionSnapshot,
      shouldSetupTwoFactor: true
    });
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

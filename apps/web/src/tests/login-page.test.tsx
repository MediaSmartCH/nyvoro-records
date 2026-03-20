import { fireEvent, render, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNyvoroMemoryRouter } from '../router';

function buildJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function extractRequestUrl(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('login page', () => {
  it('requires an MFA challenge for admin logins before persisting the session', async () => {
    let isAuthenticated = false;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const requestUrl = extractRequestUrl(input);
      const method = init?.method ?? 'GET';

      if (requestUrl.includes('/api/v1/auth/session') && method === 'GET') {
        if (!isAuthenticated) {
          return Promise.resolve(
            buildJsonResponse({
              status: 'ok',
              authenticated: false
            })
          );
        }

        return Promise.resolve(
          buildJsonResponse({
            status: 'ok',
            authenticated: true,
            role: 'admin',
            email: 'admin@nyvoro-records.com',
            shouldSetupTwoFactor: false,
            expiresAt: '2026-03-01T10:15:00.000Z'
          })
        );
      }

      if (requestUrl.includes('/api/v1/auth/login/verify-mfa') && method === 'POST') {
        isAuthenticated = true;
        return Promise.resolve(
          buildJsonResponse({
            status: 'ok',
            role: 'admin',
            email: 'admin@nyvoro-records.com',
            shouldSetupTwoFactor: false,
            expiresAt: '2026-03-01T10:15:00.000Z'
          })
        );
      }

      if (requestUrl.includes('/api/v1/auth/login') && method === 'POST') {
        return Promise.resolve(
          buildJsonResponse({
            status: 'mfa_required',
            role: 'admin',
            email: 'admin@nyvoro-records.com',
            mfaToken: 'signed_mfa_token_1234567890'
          })
        );
      }

      if (requestUrl.includes('/api/v1/admin/dashboard') && method === 'GET') {
        return Promise.resolve(
          buildJsonResponse({
            status: 'ok',
            summary: {
              totalApplications: 0,
              applicationsLast7Days: 0,
              applicationsEmailPendingOrFailed: 0,
              openContactMessages: 0
            },
            recentApplications: [],
            recentContactMessages: []
          })
        );
      }

      return Promise.resolve(
        buildJsonResponse(
          {
            status: 'error',
            code: 'not_found'
          },
          404
        )
      );
    });

    const router = createNyvoroMemoryRouter(['/en/login?next=%2Fen%2Fadmin%2Fdashboard']);
    const { findByRole, findByLabelText, findByText, queryByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(queryByRole('radiogroup', { name: 'Sign in as' })).not.toBeInTheDocument();
    fireEvent.change(await findByLabelText('Email'), {
      target: { value: 'admin@nyvoro-records.com' }
    });
    fireEvent.change(await findByLabelText('Password'), {
      target: { value: 'AdminStrongPassword!2026' }
    });

    fireEvent.click(await findByRole('button', { name: 'Sign in' }));

    expect(await findByText('Admin MFA verification')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('nyvoro_auth_session_snapshot_v1')).toBeNull();

    fireEvent.change(await findByLabelText('6-digit code'), {
      target: { value: '123456' }
    });
    fireEvent.click(await findByRole('button', { name: 'Verify code' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/en/admin/dashboard');
    });

    expect(window.sessionStorage.getItem('nyvoro_auth_session_snapshot_v1')).not.toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/login/verify-mfa'),
      expect.objectContaining({ method: 'POST' })
    );

    const loginRequest = fetchSpy.mock.calls.find(([input, init]) => {
      const requestUrl = extractRequestUrl(input);
      const method = init?.method ?? 'GET';
      return requestUrl.includes('/api/v1/auth/login') && method === 'POST';
    });

    expect(loginRequest).toBeDefined();
    expect(JSON.parse(String(loginRequest?.[1]?.body ?? '{}'))).toEqual(
      expect.objectContaining({
        email: 'admin@nyvoro-records.com',
        password: 'AdminStrongPassword!2026'
      })
    );
    expect(JSON.parse(String(loginRequest?.[1]?.body ?? '{}'))).not.toHaveProperty('role');
  });

  it('logs artists in directly without an MFA challenge', async () => {
    let isAuthenticated = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const requestUrl = extractRequestUrl(input);
      const method = init?.method ?? 'GET';

      if (requestUrl.includes('/api/v1/auth/session') && method === 'GET') {
        if (!isAuthenticated) {
          return Promise.resolve(
            buildJsonResponse({
              status: 'ok',
              authenticated: false
            })
          );
        }

        return Promise.resolve(
          buildJsonResponse({
            status: 'ok',
            authenticated: true,
            role: 'artist',
            email: 'artist@nyvoro-records.com',
            shouldSetupTwoFactor: true,
            expiresAt: '2026-03-01T10:15:00.000Z'
          })
        );
      }

      if (requestUrl.includes('/api/v1/auth/login') && method === 'POST') {
        isAuthenticated = true;
        return Promise.resolve(
          buildJsonResponse({
            status: 'ok',
            role: 'artist',
            email: 'artist@nyvoro-records.com',
            shouldSetupTwoFactor: true,
            expiresAt: '2026-03-01T10:15:00.000Z'
          })
        );
      }

      return Promise.resolve(
        buildJsonResponse(
          {
            status: 'error',
            code: 'not_found'
          },
          404
        )
      );
    });

    const router = createNyvoroMemoryRouter(['/en/login']);
    const { findByRole, findByLabelText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    fireEvent.change(await findByLabelText('Email'), {
      target: { value: 'artist@nyvoro-records.com' }
    });
    fireEvent.change(await findByLabelText('Password'), {
      target: { value: 'ArtistStrongPassword!2026' }
    });

    fireEvent.click(await findByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/en/artist/dashboard');
    });

    expect(window.sessionStorage.getItem('nyvoro_auth_session_snapshot_v1')).not.toBeNull();
  });
});

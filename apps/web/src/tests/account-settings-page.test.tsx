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

function mockAccountSettingsFlow() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? 'GET';

    if (requestUrl.includes('/api/v1/auth/session') && method === 'GET') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          authenticated: true,
          role: 'admin',
          email: 'admin@nyvoro-records.com',
          firstName: 'Raphael',
          lastName: 'Rouiller',
          displayName: 'Raphael Rouiller',
          shouldSetupTwoFactor: true,
          expiresAt: '2026-03-01T10:15:00.000Z'
        })
      );
    }

    if (requestUrl.includes('/api/v1/account/profile') && method === 'GET') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          role: 'admin',
          email: 'admin@nyvoro-records.com',
          firstName: 'Raphael',
          lastName: 'Rouiller',
          displayName: 'Raphael Rouiller',
          shouldSetupTwoFactor: true,
          expiresAt: '2026-03-01T10:15:00.000Z'
        })
      );
    }

    if (requestUrl.includes('/api/v1/account/profile') && method === 'PATCH') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          role: 'admin',
          email: 'admin.updated@nyvoro-records.com',
          firstName: 'Raphael',
          lastName: 'Rouiller',
          displayName: 'Raphael Rouiller',
          shouldSetupTwoFactor: true,
          expiresAt: '2026-03-01T12:15:00.000Z'
        })
      );
    }

    if (requestUrl.includes('/api/v1/account/mfa/setup') && method === 'POST') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          secret: 'JBSWY3DPEHPK3PXP',
          issuer: 'Nyvoro Records',
          accountLabel: 'admin@nyvoro-records.com',
          otpauthUri: 'otpauth://totp/Nyvoro'
        })
      );
    }

    if (requestUrl.includes('/api/v1/account/mfa/verify') && method === 'POST') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          mfaEnabled: true
        })
      );
    }

    if (requestUrl.includes('/api/v1/account/password') && method === 'POST') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok'
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
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('account settings page', () => {
  it('renders profile settings and saves changes', async () => {
    const fetchSpy = mockAccountSettingsFlow();

    const router = createNyvoroMemoryRouter(['/en/account/settings']);
    const { findByRole, findByDisplayValue, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'My account' })).toBeInTheDocument();
    expect(await findByDisplayValue('Raphael')).toBeInTheDocument();
    expect(await findByDisplayValue('Rouiller')).toBeInTheDocument();

    const emailInput = await findByDisplayValue('admin@nyvoro-records.com');
    fireEvent.change(emailInput, { target: { value: 'admin.updated@nyvoro-records.com' } });

    fireEvent.click(await findByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/account/profile'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
    expect(await findByText('Profile updated.')).toBeInTheDocument();
  });

  it('configures MFA from the account settings page', async () => {
    const fetchSpy = mockAccountSettingsFlow();

    const router = createNyvoroMemoryRouter(['/en/account/settings']);
    const { findByRole, findByText, findByLabelText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    fireEvent.click(await findByRole('button', { name: 'Set up MFA' }));
    expect(await findByText(/Secret key/i)).toBeInTheDocument();

    const mfaCodeInput = await findByLabelText('6-digit code');
    fireEvent.change(mfaCodeInput, { target: { value: '123456' } });
    fireEvent.click(await findByRole('button', { name: 'Verify and enable' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/account/mfa/verify'),
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(await findByText('MFA enabled.')).toBeInTheDocument();
  });

  it('updates password from the account settings page', async () => {
    const fetchSpy = mockAccountSettingsFlow();

    const router = createNyvoroMemoryRouter(['/en/account/settings']);
    const { findByRole, findByLabelText, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    fireEvent.change(await findByLabelText('Current password'), {
      target: { value: 'AdminStrongPassword!2026' }
    });
    fireEvent.change(await findByLabelText('New password'), {
      target: { value: 'AdminEvenStrongerPassword!2027' }
    });
    fireEvent.change(await findByLabelText('Confirm new password'), {
      target: { value: 'AdminEvenStrongerPassword!2027' }
    });

    fireEvent.click(await findByRole('button', { name: 'Update password' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/account/password'),
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(await findByText('Password updated.')).toBeInTheDocument();
  });
});

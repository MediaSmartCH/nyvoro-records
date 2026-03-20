import { fireEvent, render, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectBrowserLocale } from '../lib/locale';
import { createNyvoroMemoryRouter } from '../router';

function buildJsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function mockSessionFetch(body: Record<string, unknown>) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(buildJsonResponse(body));
}

function mockFetchSequence(bodies: Array<Record<string, unknown>>) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  for (const body of bodies) {
    fetchSpy.mockResolvedValueOnce(buildJsonResponse(body));
  }

  return fetchSpy.mockResolvedValue(
    buildJsonResponse(bodies[bodies.length - 1] ?? { status: 'ok', authenticated: false })
  );
}

function buildAuthenticatedSession(role: 'admin' | 'artist') {
  return {
    status: 'ok',
    authenticated: true,
    role,
    email: `${role}@nyvoro-records.com`,
    firstName: 'Raphael',
    lastName: 'Rouiller',
    displayName: 'Raphael Rouiller',
    shouldSetupTwoFactor: true,
    expiresAt: '2026-03-01T10:15:00.000Z'
  };
}

function mockHeaderAccountMenuFlow(role: 'admin' | 'artist') {
  const sessionBody = buildAuthenticatedSession(role);

  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? 'GET';

    if (requestUrl.includes('/api/v1/auth/session') && method === 'GET') {
      return Promise.resolve(buildJsonResponse(sessionBody));
    }

    if (requestUrl.includes('/api/v1/account/profile') && method === 'GET') {
      return Promise.resolve(buildJsonResponse(sessionBody));
    }

    if (requestUrl.includes('/api/v1/auth/logout') && method === 'POST') {
      return Promise.resolve(buildJsonResponse({ status: 'ok' }));
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

    if (requestUrl.includes('/api/v1/admin/catalog') && method === 'GET') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          artists: [],
          releases: []
        })
      );
    }

    return Promise.resolve(buildJsonResponse({ status: 'ok' }));
  });
}

function expectAdminGuardRedirect(router: ReturnType<typeof createNyvoroMemoryRouter>) {
  return waitFor(() => {
    expect(router.state.location.pathname).toBe('/en/login');
    expect(router.state.location.search).toContain('next=%2Fen%2Fadmin%2Fdashboard');
  });
}

function expectArtistGuardRedirect(router: ReturnType<typeof createNyvoroMemoryRouter>) {
  return waitFor(() => {
    expect(router.state.location.pathname).toBe('/en/login');
    expect(router.state.location.search).toContain('next=%2Fen%2Fadmin%2Fdashboard');
  });
}

function expectExpiredSessionRedirect(router: ReturnType<typeof createNyvoroMemoryRouter>) {
  return waitFor(() => {
    expect(router.state.location.pathname).toBe('/en/login');
    expect(router.state.location.search).toContain('next=%2Fen%2Fadmin%2Fdashboard');
    expect(router.state.location.search).toContain('reason=inactive');
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('localized routing', () => {
  it('detects french browser locale', () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'fr-FR'
    });

    expect(detectBrowserLocale()).toBe('fr');
  });

  it('renders artist page in english locale', async () => {
    const router = createNyvoroMemoryRouter(['/en/artists']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Artists' })).toBeInTheDocument();
    expect(await findByRole('link', { name: /Noche Que Se Repite/i })).toHaveAttribute(
      'href',
      '/en/releases?release=noche-que-se-repite'
    );
  });

  it('renders legal page in french locale', async () => {
    const router = createNyvoroMemoryRouter(['/fr/legal/privacy']);
    const { findByRole, findByText, getByRole, container } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Politique de confidentialité' })).toBeInTheDocument();
    expect(await findByText('Dernière mise à jour')).toBeInTheDocument();
    expect(getByRole('navigation', { name: 'Sommaire' })).toBeInTheDocument();
    expect(getByRole('link', { name: /Données collectées/ })).toHaveAttribute(
      'href',
      '#data-collected'
    );
    expect(getByRole('link', { name: 'privacy@nyvoro-records.com' })).toHaveAttribute(
      'href',
      'mailto:privacy@nyvoro-records.com'
    );
    expect(container.querySelector('time[datetime="2026-02-26"]')).toBeInTheDocument();
  });

  it('renders artist detail page', async () => {
    const router = createNyvoroMemoryRouter(['/fr/artists/lumeno']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { level: 1, name: /Lúmeno/i })).toBeInTheDocument();
  });

  it('renders login page for admins and artists', async () => {
    const router = createNyvoroMemoryRouter(['/en/login']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders register page', async () => {
    const router = createNyvoroMemoryRouter(['/en/register']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(await findByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('renders login page on legacy secure access route', async () => {
    const router = createNyvoroMemoryRouter(['/en/secure-access']);
    const { findAllByRole, findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    const headings = await findAllByRole('heading', { name: 'Login' });
    expect(headings.length).toBeGreaterThan(0);
    expect(await findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows login-required state for unauthenticated admin dashboard access', async () => {
    mockFetchSequence([
      {
        status: 'ok',
        authenticated: false
      },
      {
        status: 'ok',
        authenticated: false
      }
    ]);

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    await expectAdminGuardRedirect(router);
  });

  it('shows inactivity notice when admin session is expired', async () => {
    mockFetchSequence([
      {
        status: 'ok',
        authenticated: false,
        code: 'session_expired'
      },
      {
        status: 'ok',
        authenticated: false
      }
    ]);

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(
      await findByText('Session expired due to inactivity. Please sign in again.')
    ).toBeInTheDocument();
    await expectExpiredSessionRedirect(router);
  });

  it('renders admin dashboard for authenticated admin session', async () => {
    mockSessionFetch({
      status: 'ok',
      authenticated: true,
      role: 'admin',
      email: 'admin@nyvoro-records.com',
      firstName: 'Raphael',
      lastName: 'Rouiller',
      displayName: 'Raphael Rouiller',
      shouldSetupTwoFactor: true,
      expiresAt: '2026-03-01T10:15:00.000Z'
    });

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    expect(await findByText(/2FA is strongly recommended/i)).toBeInTheDocument();
    expect(await findByRole('button', { name: 'My account' })).toBeInTheDocument();
  });

  it('shows login-required state when artist session opens admin dashboard', async () => {
    mockFetchSequence([
      {
        status: 'ok',
        authenticated: true,
        role: 'artist',
        email: 'artist@nyvoro-records.com',
        shouldSetupTwoFactor: true,
        expiresAt: '2026-03-01T10:15:00.000Z'
      },
      {
        status: 'ok',
        authenticated: false
      }
    ]);

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    await expectArtistGuardRedirect(router);
  });

  it('renders artist dashboard for authenticated artist session', async () => {
    mockSessionFetch({
      status: 'ok',
      authenticated: true,
      role: 'artist',
      email: 'artist@nyvoro-records.com',
      shouldSetupTwoFactor: true,
      expiresAt: '2026-03-01T10:15:00.000Z'
    });

    const router = createNyvoroMemoryRouter(['/en/artist/dashboard']);
    const { findByRole, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Artist dashboard' })).toBeInTheDocument();
    expect(await findByText(/2FA is strongly recommended/i)).toBeInTheDocument();
  });

  it('shows default account label when profile name is not configured', async () => {
    mockSessionFetch({
      status: 'ok',
      authenticated: true,
      role: 'artist',
      email: 'artist@nyvoro-records.com',
      shouldSetupTwoFactor: true,
      expiresAt: '2026-03-01T10:15:00.000Z'
    });

    const router = createNyvoroMemoryRouter(['/en/artist/dashboard']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('button', { name: 'My account' })).toBeInTheDocument();
  });

  it('opens the account menu and routes admin users to dashboard and account pages', async () => {
    mockHeaderAccountMenuFlow('admin');

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    const accountTrigger = await findByRole('button', { name: 'My account' });
    fireEvent.click(accountTrigger);
    fireEvent.mouseLeave(accountTrigger.parentElement as HTMLElement);

    const dashboardItem = await findByRole('menuitem', { name: 'Dashboard' });
    const accountItem = await findByRole('menuitem', { name: 'My account' });

    expect(dashboardItem).toHaveAttribute('href', '/en/admin/dashboard');
    expect(accountItem).toHaveAttribute('href', '/en/account/settings');

    fireEvent.click(accountItem);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/en/account/settings');
    });
  });

  it('logs out from the account menu', async () => {
    const fetchSpy = mockHeaderAccountMenuFlow('artist');

    const router = createNyvoroMemoryRouter(['/en/artist/dashboard']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    const accountTrigger = await findByRole('button', { name: 'My account' });
    fireEvent.click(accountTrigger);
    fireEvent.click(await findByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('renders localized 404 page for unknown routes', async () => {
    const router = createNyvoroMemoryRouter(['/fr/unknown-path']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument();
  });

  it('renders 500 error page when status route is requested', async () => {
    const router = createNyvoroMemoryRouter(['/en/error/500']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Server error' })).toBeInTheDocument();
  });

  it('redirects unsupported locale routes to english 404', async () => {
    const router = createNyvoroMemoryRouter(['/es/unknown-path']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('opens targeted release from query parameter', async () => {
    const router = createNyvoroMemoryRouter(['/fr/releases?release=media-noche-con-lumeno']);
    const { findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByText('MEDIA-NOCHE-CON-LUMENO')).toBeInTheDocument();
  });
});

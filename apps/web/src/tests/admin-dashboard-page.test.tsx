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

function mockAdminDashboardFlow() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const requestUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? 'GET';

    if (requestUrl.includes('/api/v1/auth/session')) {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          authenticated: true,
          role: 'admin',
          email: 'admin@nyvoro-records.com',
          shouldSetupTwoFactor: true,
          expiresAt: '2026-03-01T10:15:00.000Z'
        })
      );
    }

    if (requestUrl.includes('/api/v1/admin/dashboard') && method === 'GET') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          summary: {
            totalApplications: 8,
            applicationsLast7Days: 3,
            applicationsEmailPendingOrFailed: 2,
            openContactMessages: 1
          },
          recentApplications: [
            {
              id: 'app_1',
              createdAt: '2026-03-01T09:00:00.000Z',
              locale: 'en',
              artistName: 'Luna Vortex',
              email: 'luna@example.com',
              emailStatus: 'pending'
            }
          ],
          recentContactMessages: [
            {
              id: 'contact_msg_1',
              createdAt: '2026-03-01T08:30:00.000Z',
              locale: 'en',
              channel: 'press',
              fullName: 'Maya Bloom',
              email: 'maya@media.example',
              subject: 'Need assets for upcoming premiere',
              status: 'open'
            }
          ]
        })
      );
    }

    if (requestUrl.includes('/api/v1/admin/catalog') && method === 'GET') {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          artists: [
            {
              id: 'lumeno',
              name: 'Lúmeno',
              genres: ['Latin Pop', 'Reggaeton Suave'],
              basedIn: 'Latino market / international Spanish-speaking',
              portrait: '/images/lumeno-profile.png',
              profile: {
                mainLanguage: {
                  en: 'Spanish',
                  fr: 'Espagnol'
                },
                targetTerritory: {
                  en: 'Latino market / international Spanish-speaking',
                  fr: 'Marche latino / international hispanophone'
                },
                positioning: {
                  en: 'Nocturnal, sensual, emotional, cinematic.',
                  fr: 'Nocturne, sensuel, emotionnel, cinematographique.'
                },
                conceptSummary: {
                  en: 'A cohesive night-city Latin pop project.',
                  fr: 'Un projet latin coherent de nuit urbaine.'
                },
                conceptAxes: {
                  en: ['Desire vs restraint'],
                  fr: ['Desir et retenue']
                },
                soundDna: {
                  en: ['Modern mid-tempo reggaeton'],
                  fr: ['Mid-tempo reggaeton moderne']
                },
                visualUniverse: {
                  en: ['Night blue and neon red palette'],
                  fr: ['Palette bleu nuit et rouge neon']
                },
                keyThemes: {
                  en: ['Ambiguous relationships'],
                  fr: ['Relations ambigues']
                }
              },
              bio: {
                en: 'Late-night emotional storytelling.',
                fr: 'Narration emotionnelle nocturne.'
              },
              links: {
                spotify: 'https://open.spotify.com/artist/lumeno',
                youtube: 'https://www.youtube.com/@lumeno_music'
              }
            }
          ],
          releases: [
            {
              id: 'noche-que-se-repite',
              artistId: 'lumeno',
              title: {
                en: 'Noche Que Se Repite',
                fr: 'Noche Que Se Repite'
              },
              releaseDate: '2026-02-20',
              artwork: 'https://example.com/noche.jpg',
              links: {
                spotify: 'https://open.spotify.com/track/noche'
              },
              description: {
                en: 'Opening single of the 2026 cycle.',
                fr: 'Single d ouverture du cycle 2026.'
              },
              format: 'single',
              status: 'published',
              tracks: [
                {
                  id: 'noche-track-1',
                  title: 'Noche Que Se Repite',
                  isFocusTrack: true
                },
                {
                  id: 'noche-track-2',
                  title: 'Bajo Neon',
                  version: 'Extended Mix',
                  isFocusTrack: false
                },
                {
                  id: 'noche-track-3',
                  title: 'Luna Azul',
                  duration: '03:24',
                  isFocusTrack: false
                }
              ]
            }
          ]
        })
      );
    }

    if (
      requestUrl.includes('/api/v1/admin/contact-messages/contact_msg_1') &&
      method === 'PATCH'
    ) {
      return Promise.resolve(
        buildJsonResponse({
          status: 'ok',
          messageId: 'contact_msg_1',
          newStatus: 'resolved'
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

describe('admin dashboard page', () => {
  it('renders summary cards and recent lists with API data', async () => {
    mockAdminDashboardFlow();

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole, findByText, findAllByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    expect(await findByText('Luna Vortex')).toBeInTheDocument();
    expect(await findByText('Need assets for upcoming premiere')).toBeInTheDocument();
    expect(await findByText('Lúmeno')).toBeInTheDocument();
    expect((await findAllByText('Noche Que Se Repite')).length).toBeGreaterThan(0);
    expect(await findByText('Open')).toBeInTheDocument();
    expect(await findByText(/2FA is strongly recommended/i)).toBeInTheDocument();
  });

  it('marks a contact message as resolved from the queue', async () => {
    const fetchSpy = mockAdminDashboardFlow();

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole, findByText } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    await findByText('Need assets for upcoming premiere');
    const resolveButton = await findByRole('button', { name: 'Mark as resolved' });
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/contact-messages/contact_msg_1'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    expect(await findByRole('button', { name: 'Resolved' })).toBeDisabled();
  });

  it('lets admins pick a track from the compact release browser', async () => {
    mockAdminDashboardFlow();

    const router = createNyvoroMemoryRouter(['/en/admin/dashboard']);
    const { findByRole, findByDisplayValue, getByPlaceholderText, queryByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('button', { name: /Bajo Neon/i })).toBeInTheDocument();

    fireEvent.change(getByPlaceholderText('Search a track...'), {
      target: { value: 'Luna' }
    });

    expect(await findByRole('button', { name: /Luna Azul/i })).toBeInTheDocument();
    expect(queryByRole('button', { name: /Bajo Neon/i })).not.toBeInTheDocument();

    fireEvent.click(await findByRole('button', { name: /Luna Azul/i }));

    expect(await findByDisplayValue('Luna Azul')).toBeInTheDocument();
    expect(await findByDisplayValue('03:24')).toBeInTheDocument();
  });
});

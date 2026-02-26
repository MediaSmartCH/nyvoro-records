import { render } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { detectBrowserLocale } from '../lib/locale';
import { createNyvoroMemoryRouter } from '../router';

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
    expect(container.querySelector('time[datetime=\"2026-02-26\"]')).toBeInTheDocument();
  });

  it('renders artist detail page', async () => {
    const router = createNyvoroMemoryRouter(['/fr/artists/lumeno']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { level: 1, name: /Lúmeno/i })).toBeInTheDocument();
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

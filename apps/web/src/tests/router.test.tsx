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
  });

  it('renders legal page in french locale', async () => {
    const router = createNyvoroMemoryRouter(['/fr/legal/privacy']);
    const { findByRole } = render(
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    );

    expect(await findByRole('heading', { name: 'Politique de confidentialité' })).toBeInTheDocument();
  });
});

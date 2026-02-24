import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
  Navigate
} from 'react-router-dom';
import { LocaleLayout } from './components/locale-layout';
import { ArtistsPage } from './pages/artists-page';
import { ContactPage } from './pages/contact-page';
import { HomePage } from './pages/home-page';
import { JoinPage } from './pages/join-page';
import { LegalPage } from './pages/legal-page';
import { LocaleRedirectPage } from './pages/locale-redirect';
import { ReleasesPage } from './pages/releases-page';

export const routeTree: RouteObject[] = [
  {
    path: '/',
    element: <LocaleRedirectPage />
  },
  {
    path: '/:locale',
    element: <LocaleLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'artists',
        element: <ArtistsPage />
      },
      {
        path: 'releases',
        element: <ReleasesPage />
      },
      {
        path: 'join',
        element: <JoinPage />
      },
      {
        path: 'contact',
        element: <ContactPage />
      },
      {
        path: 'legal/imprint',
        element: <LegalPage documentKey="imprint" />
      },
      {
        path: 'legal/privacy',
        element: <LegalPage documentKey="privacy" />
      },
      {
        path: 'legal/terms',
        element: <LegalPage documentKey="terms" />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
];

export function createNyvoroRouter() {
  return createBrowserRouter(routeTree);
}

export function createNyvoroMemoryRouter(initialEntries: string[]) {
  return createMemoryRouter(routeTree, { initialEntries });
}

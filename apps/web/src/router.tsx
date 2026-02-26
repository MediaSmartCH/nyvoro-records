import {
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject
} from 'react-router-dom';
import { LocaleErrorBoundary } from './components/locale-error-boundary';
import { LocaleLayout } from './components/locale-layout';
import { ArtistDetailPage } from './pages/artist-detail-page';
import { ArtistsPage } from './pages/artists-page';
import { ContactPage } from './pages/contact-page';
import { ErrorStatusPage } from './pages/error-status-page';
import { GlobalNotFoundRedirectPage } from './pages/global-not-found-redirect';
import { HomePage } from './pages/home-page';
import { JoinPage } from './pages/join-page';
import { LegalPage } from './pages/legal-page';
import { LocaleRedirectPage } from './pages/locale-redirect';
import { NotFoundPage } from './pages/not-found-page';
import { ReleasesPage } from './pages/releases-page';

export const routeTree: RouteObject[] = [
  {
    path: '/',
    element: <LocaleRedirectPage />
  },
  {
    path: '/:locale',
    element: <LocaleLayout />,
    errorElement: <LocaleErrorBoundary />,
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
        path: 'artists/:artistId',
        element: <ArtistDetailPage />
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
      },
      {
        path: 'error/:statusCode',
        element: <ErrorStatusPage />
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  },
  {
    path: '*',
    element: <GlobalNotFoundRedirectPage />
  }
];

export function createNyvoroRouter() {
  return createBrowserRouter(routeTree);
}

export function createNyvoroMemoryRouter(initialEntries: string[]) {
  return createMemoryRouter(routeTree, { initialEntries });
}

import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { releases, artists } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';
import { compareReleaseDatesAsc, compareReleaseDatesDesc, formatReleaseDate, getLocalDateKey } from '../lib/date';

const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));

const platformLabels: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  appleMusic: 'Apple Music',
  tidal: 'Tidal',
  deezer: 'Deezer',
  qobuz: 'Qobuz',
  amazonMusic: 'Amazon Music',
  soundCloud: 'SoundCloud',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
  x: 'X'
};

const platformOrder = [
  'appleMusic',
  'spotify',
  'deezer',
  'qobuz',
  'tidal',
  'amazonMusic',
  'youtube',
  'soundCloud',
  'beatport',
  'instagram',
  'tiktok',
  'x',
  'website'
];

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'spotify') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M6.4 9.7c3.9-1.2 7.6-0.9 11 1" />
        <path d="M7.2 12.6c3.1-0.9 6-0.6 8.8 0.9" />
        <path d="M8 15.3c2.2-0.6 4.1-0.4 6.1 0.7" />
      </svg>
    );
  }

  if (platform === 'appleMusic') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.8 5.5v9.2a2.7 2.7 0 1 1-1.4-2.4V7.8l6-1.2v7.1a2.7 2.7 0 1 1-1.4-2.4V5.1z" />
      </svg>
    );
  }

  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.2" y="6.5" width="17.6" height="11" rx="3" />
        <path d="m10.2 9.3 5.2 2.7-5.2 2.7z" />
      </svg>
    );
  }

  if (platform === 'tidal') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 7 3 3-3 3-3-3zm6 0 3 3-3 3-3-3zm-3 6 3 3-3 3-3-3z" />
      </svg>
    );
  }

  if (platform === 'deezer') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16h2.4v3H4zm3.4-2.5h2.4v5.5H7.4zM10.8 11h2.4V19h-2.4zm3.4 1.3h2.4V19h-2.4zM17.6 9h2.4v10h-2.4z" />
      </svg>
    );
  }

  if (platform === 'qobuz') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11.2" cy="11.2" r="5.8" />
        <path d="m15.6 15.6 3 3" />
      </svg>
    );
  }

  if (platform === 'amazonMusic') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.4 15.8c4.2 1.7 8.6 1.7 13.1 0" />
        <path d="m15.8 14.8 2.7 1-1.1 2.6" />
        <path d="M7.8 12.4V8.8h2.8v3.6m4.8 0V8.8h2.8v3.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 16.5h9V8.8m0 0h-4.2m4.2 0v4.2" />
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.8" />
    </svg>
  );
}

function formatPlatformLabel(platform: string): string {
  if (platformLabels[platform]) {
    return platformLabels[platform];
  }

  return platform.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

function sortPlatformEntries(entries: [string, string][]) {
  return [...entries].sort((left, right) => {
    const leftIndex = platformOrder.indexOf(left[0]);
    const rightIndex = platformOrder.indexOf(right[0]);

    if (leftIndex === -1 && rightIndex === -1) {
      return left[0].localeCompare(right[0]);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

export function ReleasesPage() {
  const { locale, messages } = useLocaleContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const localDateKey = getLocalDateKey();

  const releaseTimeline = useMemo(() => {
    return [...releases].sort((left, right) => compareReleaseDatesDesc(left.releaseDate, right.releaseDate));
  }, []);
  const discoverReleases = useMemo(() => {
    const released = releaseTimeline.filter(
      (release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) <= 0
    );
    const upcoming = [...releaseTimeline]
      .filter((release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) > 0)
      .sort((left, right) => compareReleaseDatesAsc(left.releaseDate, right.releaseDate))
      .slice(0, 4);

    return [...released, ...upcoming];
  }, [localDateKey, releaseTimeline]);

  const defaultFeaturedReleaseId =
    releaseTimeline.find((release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) <= 0)?.id ??
    releaseTimeline[0]?.id ??
    '';
  const requestedReleaseId = searchParams.get('release');
  const isRequestedReleaseIdValid = releaseTimeline.some((release) => release.id === requestedReleaseId);
  const activeReleaseId =
    requestedReleaseId && isRequestedReleaseIdValid ? requestedReleaseId : defaultFeaturedReleaseId;
  const activeRelease = releaseTimeline.find((release) => release.id === activeReleaseId) ?? releaseTimeline[0];

  if (!activeRelease) {
    return null;
  }

  const activeArtist = artists.find((artist) => artist.id === activeRelease.artistId);
  const isUpcoming = compareReleaseDatesAsc(activeRelease.releaseDate, localDateKey) > 0;
  const platformEntries = sortPlatformEntries(Object.entries(activeRelease.links).filter((entry) => Boolean(entry[1])));
  const availablePlatforms = isUpcoming ? [] : platformEntries;
  const primaryPlatform = availablePlatforms[0];

  const labels =
    locale === 'fr'
      ? {
          focusKicker: 'Sortie focus',
          artist: 'Artiste',
          releaseCode: 'Code release',
          status: 'Statut',
          statusLive: 'Disponible',
          statusUpcoming: 'À venir',
          releasedOn: 'Parution le',
          platformsTitle: 'Écoute',
          upcomingNote: 'Liens disponibles le jour de la sortie.',
          listenOn: 'Écouter sur',
          openArtist: "Voir l'artiste",
          discoverTitle: 'Découvrir plus',
          discoverSubtitle: 'Catalogue complet et prochaines sorties du label.'
        }
      : {
          focusKicker: 'Featured release',
          artist: 'Artist',
          releaseCode: 'Release code',
          status: 'Status',
          statusLive: 'Available',
          statusUpcoming: 'Upcoming',
          releasedOn: 'Releases on',
          platformsTitle: 'Listen',
          upcomingNote: 'Streaming links become available on release day.',
          listenOn: 'Listen on',
          openArtist: 'Open artist profile',
          discoverTitle: 'Discover more',
          discoverSubtitle: 'Full label catalogue and upcoming records.'
        };

  return (
    <section className="stacked-section releases-page-shell">
      <header className="section-header">
        <h1>{messages.releases.title}</h1>
        <p>{messages.releases.subtitle}</p>
      </header>

      <section className="release-focus card">
        <div className="release-focus-media-wrap">
          <p className="release-focus-side-title">{activeRelease.title[locale]}</p>
          <figure className="release-focus-media">
            <img src={activeRelease.artwork} alt={activeRelease.title[locale]} loading="eager" />
          </figure>
          <p className="release-focus-side-artist">{activeArtist?.name ?? ''}</p>
        </div>

        <article className="release-focus-copy">
          <p className="release-focus-kicker">{labels.focusKicker}</p>
          <h2>{activeRelease.title[locale]}</h2>

          <div className="release-focus-meta">
            <p>
              <span>{labels.artist}</span>
              {activeArtist?.name ?? ''}
            </p>
            <p>
              <span>{labels.releaseCode}</span>
              {activeRelease.id.toUpperCase()}
            </p>
            <p>
              <span>{labels.status}</span>
              {isUpcoming ? labels.statusUpcoming : labels.statusLive}
            </p>
          </div>

          <p className="release-focus-date">
            {labels.releasedOn} {formatReleaseDate(activeRelease.releaseDate, locale)}
          </p>

          <p className="release-focus-description">{activeRelease.description[locale]}</p>

          <div className="release-platform-strip">
            <p>{labels.platformsTitle}</p>
            {availablePlatforms.length > 0 ? (
              <div className="release-platform-row">
                {availablePlatforms.map(([platform, url]) => (
                  <a key={platform} className="release-platform-link" href={url} target="_blank" rel="noreferrer">
                    <span className="release-platform-icon" aria-hidden="true">
                      <PlatformIcon platform={platform} />
                    </span>
                    <span>{formatPlatformLabel(platform)}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="release-upcoming-note">{labels.upcomingNote}</p>
            )}
          </div>

          <div className="release-focus-actions">
            {primaryPlatform && (
              <a className="btn primary" href={primaryPlatform[1]} target="_blank" rel="noreferrer">
                <span className="release-platform-icon" aria-hidden="true">
                  <PlatformIcon platform={primaryPlatform[0]} />
                </span>
                {labels.listenOn} {formatPlatformLabel(primaryPlatform[0])}
              </a>
            )}
            <Link className="text-link" to={`/${locale}/artists/${activeRelease.artistId}`}>
              {labels.openArtist}
            </Link>
          </div>
        </article>
      </section>

      <section className="release-discover card">
        <header className="release-discover-header">
          <h2>{labels.discoverTitle}</h2>
          <p>{labels.discoverSubtitle}</p>
        </header>

        <div className="release-discover-grid">
          {discoverReleases.map((release) => {
            const upcoming = compareReleaseDatesAsc(release.releaseDate, localDateKey) > 0;

            return (
              <button
                key={release.id}
                type="button"
                className={`release-discover-item ${release.id === activeRelease.id ? 'active' : ''} ${
                  upcoming ? 'upcoming' : 'live'
                }`}
                onClick={() => {
                  if (release.id === activeRelease.id) {
                    return;
                  }

                  const nextSearchParams = new URLSearchParams(searchParams);
                  nextSearchParams.set('release', release.id);
                  setSearchParams(nextSearchParams);
                }}
              >
                <div
                  className="release-discover-artwork"
                  role="img"
                  aria-label={release.title[locale]}
                  style={{ backgroundImage: `url(${release.artwork})` }}
                />
                <div className="release-discover-body">
                  <p className="release-discover-date">{formatReleaseDate(release.releaseDate, locale)}</p>
                  <h3>{release.title[locale]}</h3>
                  <p className="release-discover-artist">{artistMap.get(release.artistId)}</p>
                  <p className={`release-discover-status ${upcoming ? 'upcoming' : 'live'}`}>
                    {upcoming ? labels.statusUpcoming : labels.statusLive}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

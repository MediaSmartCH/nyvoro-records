import { Link, Navigate, useParams } from 'react-router-dom';
import { artists, releases } from '@nyvoro/content';
import {
  compareReleaseDatesAsc,
  compareReleaseDatesDesc,
  formatReleaseDate,
  getLocalDateKey
} from '../lib/date';
import { useLocaleContext } from '../context/locale-context';

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

const artistNameById = new Map(artists.map((artist) => [artist.id, artist.name]));

function formatPlatformLabel(platform: string): string {
  if (platformLabels[platform]) {
    return platformLabels[platform];
  }

  return platform.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase());
}

export function ArtistDetailPage() {
  const { locale } = useLocaleContext();
  const params = useParams();
  const artistId = params.artistId;
  const localDateKey = getLocalDateKey();

  const artist = artists.find((entry) => entry.id === artistId);

  if (!artist) {
    return <Navigate to={`/${locale}/artists`} replace />;
  }

  const labels =
    locale === 'fr'
      ? {
          artistFile: 'Fiche Artiste',
          mainLanguage: 'Langue principale',
          territory: 'Territoire cible',
          positioning: 'Positionnement',
          conceptAxes: 'Tensions narratives',
          soundDna: 'ADN sonore',
          visualUniverse: 'Univers visuel',
          keyThemes: 'Thématiques principales',
          linkedRelease: 'Dernière sortie liée',
          artist: 'Artiste',
          releaseCode: 'Code release',
          status: 'Statut',
          statusLive: 'Disponible',
          statusUpcoming: 'À venir',
          releaseDateLabel: 'Parution le',
          latestSection: 'Les dernières sorties',
          upcomingSection: 'Prochaines sorties',
          viewMore: 'Voir plus'
        }
      : {
          artistFile: 'Artist File',
          mainLanguage: 'Main language',
          territory: 'Target territory',
          positioning: 'Positioning',
          conceptAxes: 'Narrative tensions',
          soundDna: 'Sound DNA',
          visualUniverse: 'Visual universe',
          keyThemes: 'Main themes',
          linkedRelease: 'Linked latest release',
          artist: 'Artist',
          releaseCode: 'Release code',
          status: 'Status',
          statusLive: 'Available',
          statusUpcoming: 'Upcoming',
          releaseDateLabel: 'Releases on',
          latestSection: 'Latest releases',
          upcomingSection: 'Upcoming releases',
          viewMore: 'View more'
        };

  const artistReleases = [...releases]
    .filter((release) => release.artistId === artist.id)
    .sort((left, right) => compareReleaseDatesDesc(left.releaseDate, right.releaseDate));

  const releasedArtistReleases = artistReleases.filter(
    (release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) <= 0
  );
  const upcomingArtistReleases = [...artistReleases]
    .filter((release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) > 0)
    .sort((left, right) => compareReleaseDatesAsc(left.releaseDate, right.releaseDate));

  const featuredRelease = releasedArtistReleases[0] ?? upcomingArtistReleases[0] ?? null;
  const featuredReleaseLinks = featuredRelease
    ? Object.entries(
        compareReleaseDatesAsc(featuredRelease.releaseDate, localDateKey) > 0
          ? artist.links
          : featuredRelease.links
      ).filter((entry) => Boolean(entry[1]))
    : [];

  const latestSectionReleases =
    releasedArtistReleases.length > 0
      ? releasedArtistReleases.slice(0, 4)
      : upcomingArtistReleases.slice(0, 4);
  const upcomingSectionReleases =
    releasedArtistReleases.length > 0 ? upcomingArtistReleases.slice(0, 4) : [];

  const artistImage = artist.portrait ?? artistReleases[0]?.artwork ?? '';

  return (
    <section className="stacked-section artists-page-shell">
      <header className="section-header">
        <h1>{artist.name}</h1>
        <p>
          {artist.profile.targetTerritory[locale]} · {artist.genres.join(' · ')}
        </p>
      </header>

      <section className="artist-spotlight card">
        <div
          className="artist-spotlight-media"
          role="img"
          aria-label={artist.name}
          style={{ backgroundImage: `url(${artistImage})` }}
        >
          <div className="artist-spotlight-overlay">
            <p>{labels.artistFile}</p>
            <h2>{artist.name}</h2>
          </div>
        </div>

        <article className="artist-spotlight-copy">
          <h2>{artist.name}</h2>
          <p className="artist-spotlight-meta">
            {artist.profile.targetTerritory[locale]} · {artist.genres.join(' · ')}
          </p>

          <div className="artist-meta-strip">
            <p>
              <span>{labels.mainLanguage}</span>
              {artist.profile.mainLanguage[locale]}
            </p>
            <p>
              <span>{labels.territory}</span>
              {artist.profile.targetTerritory[locale]}
            </p>
            <p>
              <span>{labels.positioning}</span>
              {artist.profile.positioning[locale]}
            </p>
          </div>

          <div className="artist-spotlight-columns">
            <p>{artist.bio[locale]}</p>
            <p>{artist.profile.conceptSummary[locale]}</p>
          </div>

          <div className="artist-signature-grid">
            <section className="artist-signature-panel">
              <h3>{labels.conceptAxes}</h3>
              <ul className="artist-plain-list">
                {artist.profile.conceptAxes[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="artist-signature-panel">
              <h3>{labels.soundDna}</h3>
              <ul className="artist-plain-list">
                {artist.profile.soundDna[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="artist-signature-panel">
              <h3>{labels.visualUniverse}</h3>
              <ul className="artist-plain-list">
                {artist.profile.visualUniverse[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="artist-signature-panel">
              <h3>{labels.keyThemes}</h3>
              <ul className="artist-plain-list">
                {artist.profile.keyThemes[locale].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="artist-external">
            {Object.entries(artist.links).map(([platform, url]) => (
              <a key={platform} href={url} target="_blank" rel="noreferrer">
                {formatPlatformLabel(platform)}
              </a>
            ))}
          </div>
        </article>
      </section>

      {featuredRelease && (
        <section className="artist-upcoming-split card">
          <div className="artist-upcoming-media-wrap">
            <p className="artist-upcoming-side-title">{featuredRelease.title[locale]}</p>
            <figure className="artist-release-artwork-frame">
              <img src={featuredRelease.artwork} alt={featuredRelease.title[locale]} loading="lazy" />
            </figure>
            <p className="artist-upcoming-side-artist">{artist.name}</p>
          </div>

          <article className="artist-upcoming-copy">
            <p className="artist-upcoming-kicker">{labels.linkedRelease}</p>
            <h3>{featuredRelease.title[locale]}</h3>

            <div className="artist-meta-strip artist-release-meta">
              <p>
                <span>{labels.artist}</span>
                {artist.name}
              </p>
              <p>
                <span>{labels.releaseCode}</span>
                {featuredRelease.id.toUpperCase()}
              </p>
              <p>
                <span>{labels.status}</span>
                {compareReleaseDatesAsc(featuredRelease.releaseDate, localDateKey) > 0
                  ? labels.statusUpcoming
                  : labels.statusLive}
              </p>
            </div>

            <p className="artist-upcoming-date">
              {labels.releaseDateLabel} {formatReleaseDate(featuredRelease.releaseDate, locale)}
            </p>
            <p>{featuredRelease.description[locale]}</p>

            {featuredReleaseLinks.length > 0 && (
              <div className="platform-links">
                {featuredReleaseLinks.map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noreferrer">
                    {formatPlatformLabel(platform)}
                  </a>
                ))}
              </div>
            )}

            <div className="artist-release-actions">
              <Link className="btn primary" to={`/${locale}/releases`}>
                {labels.viewMore}
              </Link>
            </div>
          </article>
        </section>
      )}

      <section className="artist-latest-stream card">
        <header className="artist-latest-header">
          <h2>{labels.latestSection}</h2>
          <Link className="text-link" to={`/${locale}/releases`}>
            {labels.viewMore}
          </Link>
        </header>

        <div className="artist-latest-stream-list">
          {latestSectionReleases.map((release) => (
            <article key={release.id} className="artist-latest-stream-item">
              <figure className="artist-latest-stream-thumb">
                <img src={release.artwork} alt={release.title[locale]} loading="lazy" />
              </figure>

              <div className="artist-latest-stream-body">
                <p className="artist-latest-stream-artist">{artistNameById.get(release.artistId) ?? ''}</p>
                <h3>{release.title[locale]}</h3>
                <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
                <p className="artist-latest-stream-status is-live">{labels.statusLive}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {upcomingSectionReleases.length > 0 && (
        <section className="artist-latest-stream artist-upcoming-stream card">
          <header className="artist-latest-header">
            <h2>{labels.upcomingSection}</h2>
            <Link className="text-link" to={`/${locale}/releases`}>
              {labels.viewMore}
            </Link>
          </header>

          <div className="artist-latest-stream-list">
            {upcomingSectionReleases.map((release) => (
              <article key={release.id} className="artist-latest-stream-item upcoming">
                <figure className="artist-latest-stream-thumb">
                  <img src={release.artwork} alt={release.title[locale]} loading="lazy" />
                </figure>

                <div className="artist-latest-stream-body">
                  <p className="artist-latest-stream-artist">{artistNameById.get(release.artistId) ?? ''}</p>
                  <h3>{release.title[locale]}</h3>
                  <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
                  <p className="artist-latest-stream-status is-upcoming">{labels.statusUpcoming}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

import { Link } from 'react-router-dom';
import { artists, releases } from '@nyvoro/content';
import { compareReleaseDatesAsc, compareReleaseDatesDesc, formatReleaseDate, getLocalDateKey } from '../lib/date';
import { useLocaleContext } from '../context/locale-context';

const artistNameById = new Map(artists.map((artist) => [artist.id, artist.name]));

export function ArtistsPage() {
  const { locale, messages } = useLocaleContext();
  const localDateKey = getLocalDateKey();

  const releasedReleases = [...releases]
    .filter((release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) <= 0)
    .sort((left, right) => compareReleaseDatesDesc(left.releaseDate, right.releaseDate));

  const upcomingReleases = [...releases]
    .filter((release) => compareReleaseDatesAsc(release.releaseDate, localDateKey) > 0)
    .sort((left, right) => compareReleaseDatesAsc(left.releaseDate, right.releaseDate));

  const latestSectionReleases =
    releasedReleases.length > 0
      ? releasedReleases.slice(0, 4)
      : [...releases].sort((left, right) => compareReleaseDatesDesc(left.releaseDate, right.releaseDate)).slice(0, 4);

  const labels =
    locale === 'fr'
      ? {
          openProfile: 'Voir la fiche artiste',
          latestSection: 'Les dernières sorties',
          upcomingSection: 'Prochaines sorties',
          openReleases: 'Voir plus',
          statusLive: 'Disponible',
          statusUpcoming: 'À venir',
          openReleaseDetails: 'Voir les détails de la sortie',
          noUpcoming: "Aucune sortie à venir pour l'instant."
        }
      : {
          openProfile: 'Open artist profile',
          latestSection: 'Latest releases',
          upcomingSection: 'Upcoming releases',
          openReleases: 'View more',
          statusLive: 'Available',
          statusUpcoming: 'Upcoming',
          openReleaseDetails: 'Open release details',
          noUpcoming: 'No upcoming releases yet.'
        };

  return (
    <section className="stacked-section artists-page-shell">
      <header className="section-header">
        <h1>{messages.artists.title}</h1>
        <p>{messages.artists.subtitle}</p>
      </header>

      <section className="artists-roster-grid">
        {artists.map((artist) => {
          const preview = artist.portrait ?? releases.find((release) => release.artistId === artist.id)?.artwork ?? '';

          return (
            <Link key={artist.id} to={`/${locale}/artists/${artist.id}`} className="artist-roster-card card">
              <span
                className="artist-roster-image"
                role="img"
                aria-label={artist.name}
                style={preview ? { backgroundImage: `url(${preview})` } : undefined}
              />
              <span className="artist-roster-body">
                <span className="artist-roster-name">{artist.name}</span>
                <span className="artist-roster-meta">{artist.profile.targetTerritory[locale]}</span>
                <span className="artist-roster-genres">{artist.genres.join(' · ')}</span>
                <span className="artist-roster-cta">{labels.openProfile}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="artist-latest-stream card">
        <header className="artist-latest-header">
          <h2>{labels.latestSection}</h2>
          <Link className="text-link" to={`/${locale}/releases`}>
            {labels.openReleases}
          </Link>
        </header>

        <div className="artist-latest-stream-list">
          {latestSectionReleases.map((release) => (
            <Link
              key={release.id}
              to={`/${locale}/releases?release=${encodeURIComponent(release.id)}`}
              className="artist-latest-stream-item artist-latest-stream-item-link"
              aria-label={`${release.title[locale]} · ${
                artistNameById.get(release.artistId) ?? ''
              } · ${labels.openReleaseDetails}`}
            >
              <figure className="artist-latest-stream-thumb">
                <img src={release.artwork} alt={release.title[locale]} loading="lazy" />
              </figure>

              <div className="artist-latest-stream-body">
                <p className="artist-latest-stream-artist">{artistNameById.get(release.artistId) ?? ''}</p>
                <h3>{release.title[locale]}</h3>
                <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
                <p className="artist-latest-stream-status is-live">{labels.statusLive}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="artist-latest-stream artist-upcoming-stream card">
        <header className="artist-latest-header">
          <h2>{labels.upcomingSection}</h2>
          <Link className="text-link" to={`/${locale}/releases`}>
            {labels.openReleases}
          </Link>
        </header>

        <div className="artist-latest-stream-list">
          {upcomingReleases.length > 0 ? (
            upcomingReleases.slice(0, 4).map((release) => (
              <Link
                key={release.id}
                to={`/${locale}/releases?release=${encodeURIComponent(release.id)}`}
                className="artist-latest-stream-item artist-latest-stream-item-link upcoming"
                aria-label={`${release.title[locale]} · ${
                  artistNameById.get(release.artistId) ?? ''
                } · ${labels.openReleaseDetails}`}
              >
                <figure className="artist-latest-stream-thumb">
                  <img src={release.artwork} alt={release.title[locale]} loading="lazy" />
                </figure>

                <div className="artist-latest-stream-body">
                  <p className="artist-latest-stream-artist">{artistNameById.get(release.artistId) ?? ''}</p>
                  <h3>{release.title[locale]}</h3>
                  <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
                  <p className="artist-latest-stream-status is-upcoming">{labels.statusUpcoming}</p>
                </div>
              </Link>
            ))
          ) : (
            <p className="artist-calendar-empty">{labels.noUpcoming}</p>
          )}
        </div>
      </section>
    </section>
  );
}

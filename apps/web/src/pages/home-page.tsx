import { Link } from 'react-router-dom';
import { artists, labelMetadata, releases } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';
import {
  compareReleaseDatesAsc,
  compareReleaseDatesDesc,
  formatReleaseDate,
  getLocalDateKey,
  isReleaseOnOrAfter
} from '../lib/date';

export function HomePage() {
  const { locale, messages } = useLocaleContext();
  const timeline = [...releases].sort((a, b) => {
    return compareReleaseDatesAsc(a.releaseDate, b.releaseDate);
  });

  const localDateKey = getLocalDateKey();

  const upcomingReleases = timeline.filter((release) => isReleaseOnOrAfter(release.releaseDate, localDateKey));
  const pastReleases = timeline
    .filter((release) => !isReleaseOnOrAfter(release.releaseDate, localDateKey))
    .sort((a, b) => compareReleaseDatesDesc(a.releaseDate, b.releaseDate));

  const featuredRelease = upcomingReleases[0] ?? pastReleases[0] ?? timeline[0];
  const stripReleases = [...upcomingReleases.slice(0, 3), ...pastReleases].slice(0, 3);

  const latestArtistName = featuredRelease
    ? artists.find((artist) => artist.id === featuredRelease.artistId)?.name
    : '';
  const latestReleaseDate = featuredRelease ? formatReleaseDate(featuredRelease.releaseDate, locale) : '';
  const sectionLatestTitle =
    locale === 'fr'
      ? upcomingReleases.length > 0
        ? 'Calendrier des sorties'
        : 'Dernières sorties'
      : upcomingReleases.length > 0
        ? 'Release Schedule'
        : 'Latest Releases';
  const snapshotTitle = locale === 'fr' ? 'Aperçu du label' : 'Label Snapshot';
  const nextReleaseLabel =
    locale === 'fr'
      ? upcomingReleases.length > 0
        ? 'Prochaine sortie'
        : 'Dernière sortie'
      : upcomingReleases.length > 0
        ? 'Next release'
        : 'Latest release';
  const openReleasesLabel = locale === 'fr' ? 'Voir toutes les sorties' : 'View all releases';

  return (
    <section className="home-layout">
      <article className="home-hero card">
        <div
          className="hero-media"
          style={{ backgroundImage: `url(${featuredRelease?.artwork ?? ''})` }}
          role="img"
          aria-label={featuredRelease?.title[locale] ?? 'Nyvoro'}
        >
          <div className="hero-layer">
            <p className="eyebrow">{messages.home.eyebrow}</p>
            <h1>{messages.home.headline}</h1>
            <p>{messages.home.intro}</p>
            <div className="hero-actions">
              <Link className="btn secondary" to={`/${locale}/artists`}>
                {messages.home.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <aside className="home-panel card">
        <h2>{snapshotTitle}</h2>
        <ul className="snapshot-list">
          <li>{messages.home.stats.founded}</li>
          <li>{messages.home.stats.distributor}</li>
          <li>{messages.home.stats.languages}</li>
        </ul>
        <p>
          <strong>Mission:</strong> {labelMetadata.mission[locale]}
        </p>

        {featuredRelease && (
          <div className="release-preview">
            <p className="preview-kicker">{nextReleaseLabel}</p>
            <h3>{featuredRelease.title[locale]}</h3>
            <p className="muted">
              {latestArtistName} · {latestReleaseDate}
            </p>
            <Link className="text-link" to={`/${locale}/releases`}>
              {openReleasesLabel}
            </Link>
          </div>
        )}
      </aside>

      <section className="home-strip">
        <header className="section-header">
          <h2>{sectionLatestTitle}</h2>
        </header>
        <div className="strip-grid">
          {stripReleases.map((release) => (
            <article key={release.id} className="strip-card">
              <div
                className="strip-image"
                role="img"
                aria-label={release.title[locale]}
                style={{ backgroundImage: `url(${release.artwork})` }}
              />
              <div className="strip-body">
                <p className="muted">{artists.find((artist) => artist.id === release.artistId)?.name}</p>
                <h3>{release.title[locale]}</h3>
                <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

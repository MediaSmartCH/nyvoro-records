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
  const stripReleases = [...upcomingReleases, ...pastReleases].slice(0, 4);

  const featuredArtist = featuredRelease ? artists.find((artist) => artist.id === featuredRelease.artistId) : undefined;
  const latestArtistName = featuredArtist?.name ?? '';
  const latestReleaseDate = featuredRelease ? formatReleaseDate(featuredRelease.releaseDate, locale) : '';
  const latestReleasePath = featuredRelease ? `/${locale}/releases?release=${featuredRelease.id}` : `/${locale}/releases`;
  const snapshotTitle = locale === 'fr' ? 'Aperçu du label' : 'Label Snapshot';
  const nextReleaseLabel =
    locale === 'fr'
      ? upcomingReleases.length > 0
        ? 'Prochaine sortie'
        : 'Dernière sortie'
      : upcomingReleases.length > 0
        ? 'Next release'
        : 'Latest release';

  const homeLabels =
    locale === 'fr'
      ? {
          labelDesk: 'Label Desk',
          methodKicker: 'Méthode label',
          methodTitle: 'Un pipeline clair, de la direction artistique à la sortie.',
          methodIntro:
            "Nyvoro opère comme une structure éditoriale: vision artistique, cadence de sortie et exécution plateforme alignées.",
          releaseFlow: 'Flow des sorties',
          releaseFlowIntro: 'Sélection active du calendrier pour piloter les prochaines étapes.',
          openRelease: 'Ouvrir la fiche',
          openFocusRelease: 'Voir la sortie focus',
          contactTeam: "Contacter l'équipe",
          statusLive: 'Disponible',
          statusUpcoming: 'À venir',
          pulseActiveRoster: 'Roster actif',
          pulseReleased: 'Sorties publiées',
          pulseUpcoming: 'Sorties planifiées'
        }
      : {
          labelDesk: 'Label Desk',
          methodKicker: 'Label method',
          methodTitle: 'A clear pipeline from creative direction to release day.',
          methodIntro:
            'Nyvoro operates as an editorial structure: artistic vision, release cadence, and platform execution in sync.',
          releaseFlow: 'Release flow',
          releaseFlowIntro: 'Active schedule selection used to drive next priorities.',
          openRelease: 'Open release profile',
          openFocusRelease: 'Open focus release',
          contactTeam: 'Contact the team',
          statusLive: 'Available',
          statusUpcoming: 'Upcoming',
          pulseActiveRoster: 'Active roster',
          pulseReleased: 'Released records',
          pulseUpcoming: 'Planned drops'
        };

  const pulseItems = [
    {
      label: homeLabels.pulseActiveRoster,
      value:
        locale === 'fr'
          ? `${artists.length} artiste${artists.length > 1 ? 's' : ''}`
          : `${artists.length} artist${artists.length > 1 ? 's' : ''}`
    },
    {
      label: homeLabels.pulseReleased,
      value: `${pastReleases.length}`
    },
    {
      label: homeLabels.pulseUpcoming,
      value: `${upcomingReleases.length}`
    }
  ];

  const methodBlocks =
    locale === 'fr'
      ? [
          {
            title: 'A&R Direction',
            body: "Positionnement, territoire et identité sonore cadrés avant l'exécution."
          },
          {
            title: 'Release Ops',
            body: 'Planning éditorial, séquencement des titres et suivi de la cadence mensuelle.'
          },
          {
            title: 'Platform Sync',
            body: 'Distribution, métadonnées et activation des liens alignées sur chaque sortie.'
          }
        ]
      : [
          {
            title: 'A&R Direction',
            body: 'Positioning, territory, and sonic identity are scoped before execution.'
          },
          {
            title: 'Release Ops',
            body: 'Editorial planning, track sequencing, and monthly cadence tracking.'
          },
          {
            title: 'Platform Sync',
            body: 'Distribution, metadata, and link activation are aligned per release.'
          }
        ];
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
            {featuredArtist && (
              <p className="hero-tagline">
                {featuredArtist.name} · {featuredArtist.profile.targetTerritory[locale]}
              </p>
            )}
            <div className="hero-actions">
              <Link className="btn primary" to={`/${locale}/releases`}>
                {openReleasesLabel}
              </Link>
              <Link className="btn secondary" to={`/${locale}/artists`}>
                {messages.home.ctaSecondary}
              </Link>
              <Link className="hero-inline-link" to={`/${locale}/join`}>
                {messages.home.ctaPrimary}
              </Link>
            </div>
          </div>
        </div>
      </article>

      <aside className="home-panel card">
        <p className="home-panel-kicker">{homeLabels.labelDesk}</p>
        <h2>{snapshotTitle}</h2>
        <ul className="snapshot-list">
          <li>{messages.home.stats.founded}</li>
          <li>{messages.home.stats.distributor}</li>
          <li>{messages.home.stats.languages}</li>
        </ul>
        <p className="home-panel-mission">{labelMetadata.mission[locale]}</p>

        <dl className="home-pulse-grid">
          {pulseItems.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        {featuredRelease && (
          <div className="release-preview">
            <p className="preview-kicker">{nextReleaseLabel}</p>
            <h3>{featuredRelease.title[locale]}</h3>
            <p className="muted">
              {latestArtistName} · {latestReleaseDate}
            </p>
            <p className="home-release-description">{featuredRelease.description[locale]}</p>
            <div className="home-panel-actions">
              <Link className="btn primary" to={latestReleasePath}>
                {homeLabels.openFocusRelease}
              </Link>
              <Link className="text-link" to={`/${locale}/contact`}>
                {homeLabels.contactTeam}
              </Link>
            </div>
          </div>
        )}
      </aside>

      <section className="home-manifest card">
        <header className="home-manifest-header">
          <p className="eyebrow">{homeLabels.methodKicker}</p>
          <h2>{homeLabels.methodTitle}</h2>
          <p>{homeLabels.methodIntro}</p>
        </header>

        <div className="home-manifest-grid">
          {methodBlocks.map((block, index) => (
            <article key={block.title} className="home-manifest-item">
              <p className="home-manifest-index">{String(index + 1).padStart(2, '0')}</p>
              <h3>{block.title}</h3>
              <p>{block.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-strip">
        <header className="section-header home-strip-header">
          <div>
            <h2>{homeLabels.releaseFlow}</h2>
            <p>{homeLabels.releaseFlowIntro}</p>
          </div>
          <Link className="text-link" to={`/${locale}/releases`}>
            {openReleasesLabel}
          </Link>
        </header>
        <div className="strip-grid">
          {stripReleases.map((release) => {
            const releaseArtist = artists.find((artist) => artist.id === release.artistId);
            const upcoming = compareReleaseDatesAsc(release.releaseDate, localDateKey) > 0;
            const releasePath = `/${locale}/releases?release=${release.id}`;

            return (
              <Link
                key={release.id}
                to={releasePath}
                className="strip-card"
                aria-label={`${homeLabels.openRelease}: ${release.title[locale]}`}
              >
                <div
                  className="strip-image"
                  role="img"
                  aria-label={release.title[locale]}
                  style={{ backgroundImage: `url(${release.artwork})` }}
                />
                <div className="strip-body">
                  <div className="strip-meta-row">
                    <p className="muted">{releaseArtist?.name ?? ''}</p>
                    <span className={`strip-status ${upcoming ? 'upcoming' : 'live'}`}>
                      {upcoming ? homeLabels.statusUpcoming : homeLabels.statusLive}
                    </span>
                  </div>
                  <h3>{release.title[locale]}</h3>
                  <p className="muted">{formatReleaseDate(release.releaseDate, locale)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}

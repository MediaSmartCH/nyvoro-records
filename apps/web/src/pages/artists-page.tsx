import { artists, releases } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';
import { compareReleaseDatesAsc, formatReleaseDate } from '../lib/date';

export function ArtistsPage() {
  const { locale, messages } = useLocaleContext();
  const labels =
    locale === 'fr'
      ? {
          mainLanguage: 'Langue principale',
          territory: 'Territoire cible',
          positioning: 'Positionnement',
          artistFile: 'Fiche Artiste',
          concept: 'Concept artistique',
          conceptAxes: 'Tensions narratives',
          soundDna: 'ADN sonore',
          visualUniverse: 'Univers visuel',
          keyThemes: 'Thématiques',
          releaseTimeline: 'Calendrier des sorties'
        }
      : {
          mainLanguage: 'Main language',
          territory: 'Target territory',
          positioning: 'Positioning',
          artistFile: 'Artist File',
          concept: 'Artistic concept',
          conceptAxes: 'Narrative tensions',
          soundDna: 'Sound DNA',
          visualUniverse: 'Visual Universe',
          keyThemes: 'Main Themes',
          releaseTimeline: 'Release timeline'
        };

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{messages.artists.title}</h1>
        <p>{messages.artists.subtitle}</p>
      </header>

      <div className="artist-list">
        {artists.map((artist) => {
          const artistReleases = [...releases]
            .filter((release) => release.artistId === artist.id)
            .sort((a, b) => compareReleaseDatesAsc(a.releaseDate, b.releaseDate));
          const featureImage = artist.portrait ?? artistReleases[0]?.artwork ?? '';

          return (
            <article key={artist.id} className="artist-feature">
              <div
                className="artist-feature-media"
                role="img"
                aria-label={artist.name}
                style={{ backgroundImage: `url(${featureImage})` }}
              >
                <div className="artist-feature-media-overlay">
                  <p className="artist-media-kicker">{labels.artistFile}</p>
                  <h2>{artist.name}</h2>
                  <p>{artist.profile.positioning[locale]}</p>
                </div>
              </div>

              <div className="artist-feature-copy">
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

                <p className="artist-lead">{artist.bio[locale]}</p>

                <section className="artist-concept-block">
                  <h3>{labels.concept}</h3>
                  <p>{artist.profile.conceptSummary[locale]}</p>
                </section>

                <div className="artist-detail-grid">
                  <section className="artist-detail-panel">
                    <h3>{labels.conceptAxes}</h3>
                    <ul className="artist-plain-list">
                      {artist.profile.conceptAxes[locale].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="artist-detail-panel">
                    <h3>{labels.soundDna}</h3>
                    <ul className="artist-plain-list">
                      {artist.profile.soundDna[locale].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="artist-detail-panel">
                    <h3>{labels.visualUniverse}</h3>
                    <ul className="artist-plain-list">
                      {artist.profile.visualUniverse[locale].map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="artist-detail-panel">
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
                      {platform}
                    </a>
                  ))}
                </div>

                <section className="artist-release-section">
                  <h3>{labels.releaseTimeline}</h3>
                  <ul className="artist-release-timeline">
                    {artistReleases.map((release) => (
                      <li key={release.id} className="artist-release-item">
                        <p className="artist-release-date">{formatReleaseDate(release.releaseDate, locale)}</p>
                        <div className="artist-release-main">
                          <h4>{release.title[locale]}</h4>
                          <p className="muted">{release.description[locale]}</p>
                          <div className="platform-links">
                            {Object.entries(release.links).map(([platform, url]) => (
                              <a key={platform} href={url} target="_blank" rel="noreferrer">
                                {platform}
                              </a>
                            ))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

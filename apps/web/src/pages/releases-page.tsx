import { releases, artists } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';
import { compareReleaseDatesDesc, formatReleaseDate } from '../lib/date';

const artistMap = new Map(artists.map((artist) => [artist.id, artist.name]));

export function ReleasesPage() {
  const { locale, messages } = useLocaleContext();

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{messages.releases.title}</h1>
        <p>{messages.releases.subtitle}</p>
      </header>

      <div className="release-list">
        {[...releases]
          .sort((a, b) => compareReleaseDatesDesc(a.releaseDate, b.releaseDate))
          .map((release) => (
            <article key={release.id} className="release-item card">
              <div
                className="release-image"
                role="img"
                aria-label={release.title[locale]}
                style={{ backgroundImage: `url(${release.artwork})` }}
              />
              <div className="release-content">
                <p className="release-meta muted">{artistMap.get(release.artistId)}</p>
                <h2>{release.title[locale]}</h2>
                <p>{release.description[locale]}</p>
                <p className="release-meta muted">
                  {messages.releases.releasedOn} {formatReleaseDate(release.releaseDate, locale)}
                </p>
                <div className="platform-links">
                  {Object.entries(release.links).map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noreferrer">
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

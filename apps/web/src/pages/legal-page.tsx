import { getLegalContent, type LegalDocumentKey } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';

function formatLegalDate(lastUpdated: string, locale: 'en' | 'fr'): string {
  const parsedDate = new Date(`${lastUpdated}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return lastUpdated;
  }

  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parsedDate);
}

export function LegalPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const { locale, messages } = useLocaleContext();
  const document = getLegalContent(locale)[documentKey];
  const formattedDate = formatLegalDate(document.lastUpdated, locale);

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{document.title}</h1>
      </header>

      <div className="card legal-intro">
        <p className="legal-summary">{document.summary}</p>
        <p className="legal-meta">
          <span className="legal-meta-label">{messages.legal.lastUpdated}</span>
          <time dateTime={document.lastUpdated}>{formattedDate}</time>
        </p>
        <p className="legal-meta">
          <span className="legal-meta-label">{messages.legal.legalContact}</span>
          <a href={`mailto:${document.contactEmail}`} className="legal-contact-link">
            {document.contactEmail}
          </a>
        </p>
      </div>

      <nav className="card legal-toc" aria-label={messages.legal.tableOfContents}>
        <p className="legal-meta-label">{messages.legal.tableOfContents}</p>
        <ol>
          {document.sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>
                <span className="legal-toc-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{section.heading}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-sections">
        {document.sections.map((section, index) => (
          <article id={section.id} key={section.id} className="card legal-card">
            <p className="legal-index">{String(index + 1).padStart(2, '0')}</p>
            <h2>{section.heading}</h2>
            {section.content.map((paragraph, paragraphIndex) => (
              <p key={`${section.id}-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

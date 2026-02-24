import { getLegalContent } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';

type LegalDocumentKey = 'imprint' | 'privacy' | 'terms';

export function LegalPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const { locale } = useLocaleContext();
  const document = getLegalContent(locale)[documentKey];

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{document.title}</h1>
      </header>

      <div className="legal-sections">
        {document.sections.map((section, index) => (
          <article key={section.heading} className="card legal-card">
            <p className="legal-index">{String(index + 1).padStart(2, '0')}</p>
            <h2>{section.heading}</h2>
            {section.content.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

import { artists, labelMetadata } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';

export function ContactPage() {
  const { locale, messages } = useLocaleContext();

  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL ?? 'contact@nyvoro-records.com';
  const pressEmail = import.meta.env.VITE_PRESS_EMAIL ?? 'press@nyvoro-records.com';
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL ?? 'demo@nyvoro-records.com';

  const artistEmailLabel = locale === 'fr' ? 'Email artiste' : 'Artist inbox';
  const contactShowcaseTitle =
    locale === 'fr' ? 'Une boîte claire pour chaque besoin.' : 'A clear inbox for each request.';
  const contactShowcaseBody =
    locale === 'fr'
      ? 'Nous séparons presse, démos et contact général pour te répondre plus vite et orienter chaque message vers la bonne personne.'
      : 'We split press, demos, and general contact to answer faster and route each message to the right person.';
  const responseLabel = locale === 'fr' ? 'Temps de réponse moyen' : 'Average response time';
  const coverageLabel = locale === 'fr' ? 'Couverture' : 'Coverage';
  const artistHint = locale === 'fr' ? 'Boîtes directes artistes' : 'Direct artist inboxes';

  const primaryChannels = [
    {
      key: 'general',
      label: messages.contact.general,
      email: contactEmail,
      hint:
        locale === 'fr'
          ? 'Partenariats, administration, collaboration label.'
          : 'Partnerships, administration, and label collaboration.'
    },
    {
      key: 'press',
      label: messages.contact.press,
      email: pressEmail,
      hint: locale === 'fr' ? 'Interviews, médias, demandes presse.' : 'Interviews, media, and press requests.'
    },
    {
      key: 'demos',
      label: messages.contact.demos,
      email: demoEmail,
      hint:
        locale === 'fr'
          ? 'Envoi de projets artistiques et demos.'
          : 'Artist submissions and demo material.'
    }
  ];

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>{messages.contact.title}</h1>
        <p>{messages.contact.subtitle}</p>
      </header>

      <article className="card contact-showcase">
        <div>
          <p className="contact-kicker">Nyvoro Mailroom</p>
          <h2>{contactShowcaseTitle}</h2>
          <p>{contactShowcaseBody}</p>
        </div>
        <div className="contact-showcase-meta">
          <div>
            <p className="label">{responseLabel}</p>
            <p className="value">24-72h</p>
          </div>
          <div>
            <p className="label">{coverageLabel}</p>
            <p className="value">FR · EN</p>
          </div>
        </div>
      </article>

      <div className="cards-grid contact-grid contact-grid--premium">
        {primaryChannels.map((channel) => (
          <article key={channel.key} className="card contact-card contact-card--primary">
            <p className="contact-channel-label">{channel.label}</p>
            <p className="contact-address">
              <a href={`mailto:${channel.email}`}>{channel.email}</a>
            </p>
            <p className="contact-channel-hint">{channel.hint}</p>
          </article>
        ))}

        <article className="card contact-card contact-card--muted">
          <p className="contact-channel-label">{messages.contact.distributor}</p>
          <p className="contact-address">{labelMetadata.distributor}</p>
          <p className="contact-channel-hint">
            {locale === 'fr'
              ? 'Distribution digitale centralisée via DistroKid.'
              : 'Digital distribution workflow centralized with DistroKid.'}
          </p>
        </article>

        <article className="card contact-card artist-inboxes">
          <p className="contact-channel-label">{messages.contact.artistInboxes}</p>
          <p className="contact-channel-hint">{artistHint}</p>
          <div className="artist-mail-list">
            {artists.map((artist) => {
              const inbox = `${artist.id}@nyvoro-records.com`;
              return (
                <p key={artist.id} className="artist-mail-item">
                  <span>
                    <strong>{artist.name}</strong> · {artistEmailLabel}
                  </span>
                  <a href={`mailto:${inbox}`}>{inbox}</a>
                </p>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}

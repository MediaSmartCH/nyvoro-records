import { artists, labelMetadata, releases } from '@nyvoro/content';
import { useLocaleContext } from '../context/locale-context';

export function ContactPage() {
  const { locale, messages } = useLocaleContext();

  const distroKidUrl = 'https://distrokid.com';
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
  const routingLabel =
    locale === 'fr' ? 'Routage intelligent' : 'Smart routing';
  const routingValue =
    locale === 'fr'
      ? 'Chaque message arrive directement dans la bonne boîte.'
      : 'Each request lands directly in the right inbox.';
  const artistCountLabel =
    locale === 'fr'
      ? `${artists.length} boîtes actives`
      : `${artists.length} active inboxes`;
  const artistMailListClassName = artists.length > 1 ? 'artist-mail-list artist-mail-list--multi' : 'artist-mail-list';

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
    <section className="stacked-section contact-page">
      <header className="section-header contact-header">
        <h1>{messages.contact.title}</h1>
        <p>{messages.contact.subtitle}</p>
      </header>

      <article className="card contact-showcase">
        <div className="contact-showcase-main">
          <p className="contact-kicker">Nyvoro Mailroom</p>
          <h2>{contactShowcaseTitle}</h2>
          <p>{contactShowcaseBody}</p>
        </div>
        <div className="contact-showcase-meta">
          <div className="contact-showcase-meta-item">
            <p className="label">{responseLabel}</p>
            <p className="value">24-72h</p>
          </div>
          <div className="contact-showcase-meta-item">
            <p className="label">{coverageLabel}</p>
            <p className="value">FR · EN</p>
          </div>
          <div className="contact-showcase-meta-item">
            <p className="label">{routingLabel}</p>
            <p className="value">{routingValue}</p>
          </div>
        </div>
      </article>

      <div className="cards-grid contact-grid contact-grid--premium">
        {primaryChannels.map((channel, index) => (
          <a
            key={channel.key}
            className="card contact-card contact-card--primary contact-card-link"
            href={`mailto:${channel.email}`}
            aria-label={`${channel.label}: ${channel.email}`}
          >
            <p className="contact-card-step">{String(index + 1).padStart(2, '0')}</p>
            <p className="contact-channel-label">{channel.label}</p>
            <p className="contact-address">{channel.email}</p>
            <p className="contact-channel-hint">{channel.hint}</p>
          </a>
        ))}

        <article className="card contact-card contact-card--muted">
          <p className="contact-channel-label">{messages.contact.distributor}</p>
          <p className="contact-address">
            <a href={distroKidUrl} target="_blank" rel="noreferrer">
              {labelMetadata.distributor}
            </a>
          </p>
          <p className="contact-channel-hint">
            {locale === 'fr'
              ? 'Distribution digitale centralisée via '
              : 'Digital distribution workflow centralized with '}
            <a className="contact-inline-link" href={distroKidUrl} target="_blank" rel="noreferrer">
              DistroKid
            </a>
            .
          </p>
        </article>

        <article className="card contact-card artist-inboxes">
          <div className="artist-inbox-head">
            <p className="contact-channel-label">{messages.contact.artistInboxes}</p>
            <p className="contact-inline-count">{artistCountLabel}</p>
          </div>
          <p className="contact-channel-hint">{artistHint}</p>
          <div className={artistMailListClassName}>
            {artists.map((artist) => {
              const inbox = `${artist.id}@nyvoro-records.com`;
              const avatar = artist.portrait ?? releases.find((release) => release.artistId === artist.id)?.artwork ?? '';
              return (
                <a
                  key={artist.id}
                  className="artist-mail-item artist-mail-item-link"
                  href={`mailto:${inbox}`}
                  aria-label={`${artist.name}: ${inbox}`}
                >
                  <span className="artist-mail-profile">
                    <span
                      className={`artist-mail-avatar ${avatar ? '' : 'fallback'}`.trim()}
                      role="img"
                      aria-label={artist.name}
                      style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
                    >
                      {!avatar ? artist.name.slice(0, 1).toUpperCase() : null}
                    </span>
                    <span>
                      <strong>{artist.name}</strong> · {artistEmailLabel}
                    </span>
                  </span>
                  <span className="artist-mail-pill">{inbox}</span>
                </a>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}

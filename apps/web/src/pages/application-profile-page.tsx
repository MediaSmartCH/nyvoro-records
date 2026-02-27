import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLocaleContext } from '../context/locale-context';
import { fetchApplicationProfile, toJoinFormState, type JoinFormState } from '../lib/join-api';

type ProfileState = {
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  values: JoinFormState;
};

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function renderValue(value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return <span>n/a</span>;
  }

  if (isUrl(normalized)) {
    return (
      <a href={normalized} target="_blank" rel="noreferrer">
        {normalized}
      </a>
    );
  }

  return <span>{normalized}</span>;
}

type FieldViewProps = {
  label: string;
  value: string;
};

function FieldView({ label, value }: FieldViewProps) {
  return (
    <div className="join-field full-width">
      <span className="join-field-label">{label}</span>
      <div className="card" style={{ padding: '0.75rem 1rem' }}>
        {renderValue(value)}
      </div>
    </div>
  );
}

export function ApplicationProfilePage() {
  const { locale, messages } = useLocaleContext();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalidToken' | 'error'>('loading');
  const [profile, setProfile] = useState<ProfileState | null>(null);

  const applicationId = params.applicationId;
  const token = searchParams.get('token')?.trim() ?? '';

  useEffect(() => {
    if (!applicationId || token.length === 0) {
      setStatus('invalidToken');
      return;
    }

    let isMounted = true;
    setStatus('loading');

    void (async () => {
      const response = await fetchApplicationProfile({
        applicationId,
        token
      });

      if (!isMounted) {
        return;
      }

      if (!response.ok || !response.body.payload) {
        if (response.body.code === 'invalid_token') {
          setStatus('invalidToken');
        } else {
          setStatus('error');
        }
        return;
      }

      setProfile({
        applicationId: response.body.applicationId ?? applicationId,
        createdAt: response.body.createdAt ?? '',
        updatedAt: response.body.updatedAt ?? '',
        canEdit: response.body.canEdit === true,
        values: toJoinFormState(response.body.payload)
      });
      setStatus('ready');
    })();

    return () => {
      isMounted = false;
    };
  }, [applicationId, token]);

  if (status === 'loading') {
    return (
      <section className="stacked-section">
        <header className="section-header">
          <h1>Application Profile</h1>
          <p>Loading profile...</p>
        </header>
      </section>
    );
  }

  if (status === 'invalidToken') {
    return (
      <section className="stacked-section">
        <header className="section-header">
          <h1>Application Profile</h1>
          <p>Invalid or expired magic link token.</p>
        </header>
      </section>
    );
  }

  if (status === 'error' || !profile) {
    return (
      <section className="stacked-section">
        <header className="section-header">
          <h1>Application Profile</h1>
          <p>Unable to load this profile right now.</p>
        </header>
      </section>
    );
  }

  const editLink = `/${locale}/join?applicationId=${encodeURIComponent(profile.applicationId)}&editToken=${encodeURIComponent(token)}`;

  return (
    <section className="stacked-section">
      <header className="section-header">
        <h1>Application Profile</h1>
        <p>
          Application ID: <code>{profile.applicationId}</code>
        </p>
        <p>
          Created at (UTC): <code>{profile.createdAt || 'n/a'}</code>
        </p>
        <p>
          Updated at (UTC): <code>{profile.updatedAt || 'n/a'}</code>
        </p>
        {profile.canEdit ? (
          <p>
            <Link to={editLink}>Edit this profile</Link>
          </p>
        ) : null}
      </header>

      <section className="join-form-section">
        <header className="join-form-section-header">
          <h2>Profile</h2>
        </header>
        <div className="form-grid">
          <FieldView label={messages.joinFields.legalName} value={profile.values.legalName} />
          <FieldView label={messages.joinFields.artistName} value={profile.values.artistName} />
          <FieldView label={messages.joinFields.email} value={profile.values.email} />
          <FieldView label={messages.joinFields.phone} value={profile.values.phone} />
          <FieldView label={messages.joinFields.city} value={profile.values.city} />
          <FieldView label={messages.joinFields.country} value={profile.values.country} />
          <FieldView label={messages.joinFields.projectType} value={profile.values.projectType} />
          <FieldView label={messages.joinFields.yearsActive} value={profile.values.yearsActive} />
          <FieldView label={messages.joinFields.primaryGenre} value={profile.values.primaryGenre} />
          <FieldView
            label={messages.joinFields.secondaryGenres}
            value={profile.values.secondaryGenres}
          />
        </div>
      </section>

      <section className="join-form-section">
        <header className="join-form-section-header">
          <h2>Presence</h2>
        </header>
        <div className="form-grid">
          <FieldView label={messages.joinFields.instagram} value={profile.values.instagram} />
          <FieldView label={messages.joinFields.tiktok} value={profile.values.tiktok} />
          <FieldView label={messages.joinFields.youtube} value={profile.values.youtube} />
          <FieldView label={messages.joinFields.x} value={profile.values.x} />
          <FieldView label={messages.joinFields.website} value={profile.values.website} />
          <FieldView label={messages.joinFields.spotify} value={profile.values.spotify} />
          <FieldView label={messages.joinFields.appleMusic} value={profile.values.appleMusic} />
          <FieldView label={messages.joinFields.soundCloud} value={profile.values.soundCloud} />
          <FieldView label={messages.joinFields.deezer} value={profile.values.deezer} />
          <FieldView label={messages.joinFields.beatport} value={profile.values.beatport} />
        </div>
      </section>

      <section className="join-form-section">
        <header className="join-form-section-header">
          <h2>History and metrics</h2>
        </header>
        <div className="form-grid">
          <FieldView label={messages.joinFields.notableReleases} value={profile.values.notableReleases} />
          <FieldView label={messages.joinFields.releaseSummary} value={profile.values.releaseSummary} />
          <FieldView label={messages.joinFields.monthlyListeners} value={profile.values.monthlyListeners} />
          <FieldView label={messages.joinFields.totalFollowers} value={profile.values.totalFollowers} />
          <FieldView
            label={messages.joinFields.averageStreamsPerRelease}
            value={profile.values.averageStreamsPerRelease}
          />
          <FieldView label={messages.joinFields.topMarkets} value={profile.values.topMarkets} />
          <FieldView
            label={messages.joinFields.monthlyMarketingBudgetEur}
            value={profile.values.monthlyMarketingBudgetEur}
          />
          <FieldView
            label={messages.joinFields.productionBudgetPerTrackEur}
            value={profile.values.productionBudgetPerTrackEur}
          />
          <FieldView label={messages.joinFields.teamDescription} value={profile.values.teamDescription} />
        </div>
      </section>

      <section className="join-form-section">
        <header className="join-form-section-header">
          <h2>Strategy</h2>
        </header>
        <div className="form-grid">
          <FieldView label={messages.joinFields.releaseFrequency} value={profile.values.releaseFrequency} />
          <FieldView label={messages.joinFields.roadmap90Days} value={profile.values.roadmap90Days} />
          <FieldView label={messages.joinFields.goals12Months} value={profile.values.goals12Months} />
          <FieldView label={messages.joinFields.whyNyvoro} value={profile.values.whyNyvoro} />
          <FieldView label={messages.joinFields.message} value={profile.values.message} />
        </div>
      </section>
    </section>
  );
}

import { describe, expect, it } from 'vitest';
import type { JoinApplicationInput } from '@nyvoro/shared-types';
import {
  buildApplicantAcknowledgementEmail,
  buildApplicationNotificationEmail
} from '../src/application-email-template.js';

const profileLinks = {
  viewUrl: 'https://www.nyvoro-records.com/fr/application-profile/app_123?token=view_token',
  editUrl: 'https://www.nyvoro-records.com/fr/join?applicationId=app_123&editToken=edit_token'
};

const logoUrl = 'https://www.nyvoro-records.com/favicon.svg';

function buildPayload(): JoinApplicationInput {
  return {
    locale: 'fr',
    turnstileToken: 'token_1234567890',
    honeypot: '',
    profile: {
      legalName: 'Alex Martin',
      artistName: 'Lumina Nova',
      email: 'alex@example.com',
      phone: '+33123456789',
      city: 'Paris',
      country: 'France',
      projectType: 'dj',
      yearsActive: 6,
      primaryGenre: 'Melodic Techno',
      secondaryGenres: ['Progressive House', 'Electronica']
    },
    socialLinks: {
      instagram: 'https://instagram.com/luminanova',
      tiktok: '',
      youtube: 'https://youtube.com/@luminanova',
      x: '',
      website: 'https://luminanova.example.com'
    },
    streamingLinks: {
      spotify: 'https://open.spotify.com/artist/example',
      appleMusic: '',
      soundCloud: '',
      deezer: '',
      beatport: 'https://beatport.com/artist/luminanova/12345'
    },
    releaseHistory: {
      notableReleases: ['Aurora Echo', 'Deep Horizon'],
      releaseSummary: 'Three singles released with a clear visual identity.'
    },
    audienceAnalytics: {
      monthlyListeners: 12000,
      totalFollowers: 8900,
      averageStreamsPerRelease: 47000,
      topMarkets: ['France', 'Germany', 'Belgium']
    },
    budgetAndResources: {
      monthlyMarketingBudgetEur: 1500,
      productionBudgetPerTrackEur: 700,
      teamDescription: 'Manager and freelance visual director.'
    },
    planning: {
      releaseFrequency: 'One single every 6 weeks',
      roadmap90Days: 'Finalize two tracks.\nLaunch one live session.\nSecure remix swap.'
    },
    objectives: {
      goals12Months: 'Grow to 250k monthly listeners and build stronger show demand.',
      whyNyvoro: 'Need long-term strategic support and better release coordination.'
    },
    message: 'Happy to share unreleased demos and campaign plans.',
    consent: true
  };
}

describe('buildApplicationNotificationEmail', () => {
  it('includes all major application sections in text fallback', () => {
    const payload = buildPayload();
    const email = buildApplicationNotificationEmail({
      applicationId: 'app_123',
      payload,
      profileLinks,
      logoUrl,
      submittedAt: new Date('2026-02-20T10:11:12.000Z')
    });

    expect(email.subject).toContain(payload.profile.artistName);
    expect(email.text).toContain('Submission');
    expect(email.text).toContain('Profile');
    expect(email.text).toContain('Social links');
    expect(email.text).toContain('Streaming links');
    expect(email.text).toContain('Release history');
    expect(email.text).toContain('Audience analytics');
    expect(email.text).toContain('Budget and resources');
    expect(email.text).toContain('Planning and objectives');
    expect(email.text).toContain('Project type: DJ');
    expect(email.text).toContain('Monthly marketing budget: EUR 1,500');
    expect(email.text).toContain('Spotify: https://open.spotify.com/artist/example');
    expect(email.text).toContain(`Public profile: ${profileLinks.viewUrl}`);
    expect(email.text).toContain(`Edit profile: ${profileLinks.editUrl}`);
    expect(email.text).toContain('Roadmap (90 days): Finalize two tracks.');
  });

  it('escapes user values in html and keeps links clickable', () => {
    const payload = buildPayload();
    payload.profile.artistName = '<script>alert(1)</script>';
    payload.message = 'Line 1\nLine 2 <b>unsafe</b>';

    const email = buildApplicationNotificationEmail({
      applicationId: 'app_456',
      payload,
      profileLinks,
      logoUrl,
      submittedAt: new Date('2026-02-20T10:11:12.000Z')
    });

    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).not.toContain('<script>alert(1)</script>');
    expect(email.html).toContain('href="https://instagram.com/luminanova"');
    expect(email.html).toContain('Open public profile');
    expect(email.html).toContain('Line 1<br />Line 2 &lt;b&gt;unsafe&lt;/b&gt;');
  });

  it('builds an acknowledgement email with edit and view links', () => {
    const payload = buildPayload();
    const email = buildApplicantAcknowledgementEmail({
      applicationId: 'app_789',
      payload,
      profileLinks,
      logoUrl,
      submittedAt: new Date('2026-02-20T10:11:12.000Z')
    });

    expect(email.subject).toContain('Application received');
    expect(email.text).toContain(profileLinks.viewUrl);
    expect(email.text).toContain(profileLinks.editUrl);
    expect(email.html).toContain('View profile');
    expect(email.html).toContain('Edit profile');
    expect(email.html).toContain(`src="${logoUrl}"`);
  });
});

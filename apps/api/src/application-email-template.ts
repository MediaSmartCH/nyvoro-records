import type { JoinApplicationInput } from '@nyvoro/shared-types';

type EmailRow = {
  label: string;
  textValue: string;
  htmlValue?: string;
};

type EmailSection = {
  title: string;
  rows: EmailRow[];
};

type NotificationEmail = {
  subject: string;
  text: string;
  html: string;
};

const PROJECT_TYPE_LABELS: Record<JoinApplicationInput['profile']['projectType'], string> = {
  solo: 'Solo',
  duo: 'Duo',
  band: 'Band',
  producer: 'Producer',
  dj: 'DJ',
  other: 'Other'
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatOptionalText(value: string | undefined): string {
  const normalizedValue = value?.trim();
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : 'n/a';
}

function formatList(values: string[]): string {
  const normalizedValues = values.map((value) => value.trim()).filter((value) => value.length > 0);
  return normalizedValues.length > 0 ? normalizedValues.join(', ') : 'n/a';
}

function formatNumber(value: number | undefined): string {
  if (typeof value !== 'number') {
    return 'n/a';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
  }).format(value);
}

function formatMoney(value: number | undefined): string {
  const formattedNumber = formatNumber(value);
  return formattedNumber === 'n/a' ? 'n/a' : `EUR ${formattedNumber}`;
}

function formatUrl(url: string | undefined): { text: string; html?: string } {
  const normalizedUrl = formatOptionalText(url);
  if (normalizedUrl === 'n/a') {
    return { text: normalizedUrl };
  }

  const escapedUrl = escapeHtml(normalizedUrl);
  return {
    text: normalizedUrl,
    html: `<a href="${escapedUrl}" style="color:#2563eb;text-decoration:none;">${escapedUrl}</a>`
  };
}

function buildUrlRow(label: string, value: { text: string; html?: string }): EmailRow {
  if (value.html) {
    return {
      label,
      textValue: value.text,
      htmlValue: value.html
    };
  }

  return {
    label,
    textValue: value.text
  };
}

function renderMultilineHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}

function renderTextSection(section: EmailSection): string {
  const rows = section.rows.map((row) => `- ${row.label}: ${row.textValue}`).join('\n');
  return `${section.title}\n${rows}`;
}

function renderHtmlSection(section: EmailSection): string {
  const rowsHtml = section.rows
    .map((row, index) => {
      const topBorder = index > 0 ? 'border-top:1px solid #e5e7eb;' : '';
      return (
        `<tr>
          <td style="padding:9px 14px 9px 0;width:220px;vertical-align:top;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;${topBorder}">${escapeHtml(row.label)}</td>
          <td style="padding:9px 0;vertical-align:top;color:#111827;font-size:14px;line-height:1.55;${topBorder}">${row.htmlValue ?? escapeHtml(row.textValue)}</td>
        </tr>`
      );
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;border-collapse:collapse;">
    <tr>
      <td style="padding:0 0 8px 0;color:#0f172a;font-size:16px;font-weight:800;letter-spacing:0.01em;">${escapeHtml(section.title)}</td>
    </tr>
    <tr>
      <td style="padding:14px;border:1px solid #dbe4f3;border-radius:12px;background:#ffffff;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${rowsHtml}
        </table>
      </td>
    </tr>
  </table>`;
}

function renderStatCard(label: string, value: string): string {
  return `<td style="padding:0 6px 12px 6px;" width="33.33%">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #dbe4f3;border-radius:10px;background:#f8fbff;">
      <tr>
        <td style="padding:12px 12px 4px 12px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td style="padding:0 12px 12px 12px;color:#0f172a;font-size:21px;font-weight:800;line-height:1.2;">${escapeHtml(value)}</td>
      </tr>
    </table>
  </td>`;
}

function renderSpotlightCards(payload: JoinApplicationInput): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;border-collapse:collapse;">
    <tr>
      ${renderStatCard('Monthly listeners', formatNumber(payload.audienceAnalytics.monthlyListeners))}
      ${renderStatCard('Total followers', formatNumber(payload.audienceAnalytics.totalFollowers))}
      ${renderStatCard('Avg streams/release', formatNumber(payload.audienceAnalytics.averageStreamsPerRelease))}
    </tr>
  </table>`;
}

function renderSubmissionSnapshot(input: {
  applicationId: string;
  payload: JoinApplicationInput;
  submittedAtIso: string;
}): string {
  const { applicationId, payload, submittedAtIso } = input;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;border-collapse:collapse;border:1px solid #dbe4f3;border-radius:12px;background:#ffffff;">
    <tr>
      <td style="padding:14px 16px;color:#0f172a;font-size:16px;font-weight:800;">Application snapshot</td>
    </tr>
    <tr>
      <td style="padding:0 16px 14px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px 8px 0;width:180px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid #e5e7eb;">Artist</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${escapeHtml(payload.profile.artistName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;width:180px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid #e5e7eb;">Primary genre</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${escapeHtml(payload.profile.primaryGenre)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;width:180px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid #e5e7eb;">Country</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;border-top:1px solid #e5e7eb;">${escapeHtml(payload.profile.country)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;width:180px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid #e5e7eb;">Application ID</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-family:'Courier New',Courier,monospace;border-top:1px solid #e5e7eb;">${escapeHtml(applicationId)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;width:180px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;border-top:1px solid #e5e7eb;">Submitted (UTC)</td>
            <td style="padding:8px 0;color:#0f172a;font-size:14px;font-family:'Courier New',Courier,monospace;border-top:1px solid #e5e7eb;">${escapeHtml(submittedAtIso)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function buildSections(input: {
  applicationId: string;
  payload: JoinApplicationInput;
  submittedAtIso: string;
}): EmailSection[] {
  const { applicationId, payload, submittedAtIso } = input;

  const instagram = formatUrl(payload.socialLinks.instagram);
  const tiktok = formatUrl(payload.socialLinks.tiktok);
  const youtube = formatUrl(payload.socialLinks.youtube);
  const x = formatUrl(payload.socialLinks.x);
  const website = formatUrl(payload.socialLinks.website);

  const spotify = formatUrl(payload.streamingLinks.spotify);
  const appleMusic = formatUrl(payload.streamingLinks.appleMusic);
  const soundCloud = formatUrl(payload.streamingLinks.soundCloud);
  const deezer = formatUrl(payload.streamingLinks.deezer);
  const beatport = formatUrl(payload.streamingLinks.beatport);

  return [
    {
      title: 'Submission',
      rows: [
        { label: 'Application ID', textValue: applicationId },
        { label: 'Submitted at (UTC)', textValue: submittedAtIso },
        { label: 'Locale', textValue: payload.locale.toUpperCase() },
        { label: 'Consent', textValue: payload.consent ? 'Yes' : 'No' }
      ]
    },
    {
      title: 'Profile',
      rows: [
        { label: 'Artist name', textValue: payload.profile.artistName },
        { label: 'Legal name', textValue: payload.profile.legalName },
        { label: 'Email', textValue: payload.profile.email },
        { label: 'Phone', textValue: formatOptionalText(payload.profile.phone) },
        { label: 'City', textValue: payload.profile.city },
        { label: 'Country', textValue: payload.profile.country },
        { label: 'Project type', textValue: PROJECT_TYPE_LABELS[payload.profile.projectType] },
        { label: 'Years active', textValue: String(payload.profile.yearsActive) },
        { label: 'Primary genre', textValue: payload.profile.primaryGenre },
        { label: 'Secondary genres', textValue: formatList(payload.profile.secondaryGenres) }
      ]
    },
    {
      title: 'Social links',
      rows: [
        buildUrlRow('Instagram', instagram),
        buildUrlRow('TikTok', tiktok),
        buildUrlRow('YouTube', youtube),
        buildUrlRow('X', x),
        buildUrlRow('Website', website)
      ]
    },
    {
      title: 'Streaming links',
      rows: [
        buildUrlRow('Spotify', spotify),
        buildUrlRow('Apple Music', appleMusic),
        buildUrlRow('SoundCloud', soundCloud),
        buildUrlRow('Deezer', deezer),
        buildUrlRow('Beatport', beatport)
      ]
    },
    {
      title: 'Release history',
      rows: [
        { label: 'Notable releases', textValue: formatList(payload.releaseHistory.notableReleases) },
        {
          label: 'Release summary',
          textValue: payload.releaseHistory.releaseSummary,
          htmlValue: renderMultilineHtml(payload.releaseHistory.releaseSummary)
        }
      ]
    },
    {
      title: 'Audience analytics',
      rows: [
        { label: 'Monthly listeners', textValue: formatNumber(payload.audienceAnalytics.monthlyListeners) },
        { label: 'Total followers', textValue: formatNumber(payload.audienceAnalytics.totalFollowers) },
        {
          label: 'Avg streams/release',
          textValue: formatNumber(payload.audienceAnalytics.averageStreamsPerRelease)
        },
        { label: 'Top markets', textValue: formatList(payload.audienceAnalytics.topMarkets) }
      ]
    },
    {
      title: 'Budget and resources',
      rows: [
        {
          label: 'Monthly marketing budget',
          textValue: formatMoney(payload.budgetAndResources.monthlyMarketingBudgetEur)
        },
        {
          label: 'Production budget / track',
          textValue: formatMoney(payload.budgetAndResources.productionBudgetPerTrackEur)
        },
        {
          label: 'Team description',
          textValue: payload.budgetAndResources.teamDescription,
          htmlValue: renderMultilineHtml(payload.budgetAndResources.teamDescription)
        }
      ]
    },
    {
      title: 'Planning and objectives',
      rows: [
        { label: 'Release frequency', textValue: payload.planning.releaseFrequency },
        {
          label: 'Roadmap (90 days)',
          textValue: payload.planning.roadmap90Days,
          htmlValue: renderMultilineHtml(payload.planning.roadmap90Days)
        },
        {
          label: 'Goals (12 months)',
          textValue: payload.objectives.goals12Months,
          htmlValue: renderMultilineHtml(payload.objectives.goals12Months)
        },
        {
          label: 'Why Nyvoro',
          textValue: payload.objectives.whyNyvoro,
          htmlValue: renderMultilineHtml(payload.objectives.whyNyvoro)
        },
        {
          label: 'Additional message',
          textValue: payload.message,
          htmlValue: renderMultilineHtml(payload.message)
        }
      ]
    }
  ];
}

export function buildApplicationNotificationEmail(input: {
  applicationId: string;
  payload: JoinApplicationInput;
  submittedAt?: Date;
}): NotificationEmail {
  const { applicationId, payload, submittedAt = new Date() } = input;
  const submittedAtIso = submittedAt.toISOString();
  const subject = `[Nyvoro] New application - ${payload.profile.artistName}`;
  const previewText = `New artist application from ${payload.profile.artistName}`;
  const sections = buildSections({
    applicationId,
    payload,
    submittedAtIso
  });

  const textBody = [
    'NYVORO - NEW ARTIST APPLICATION',
    `Reply-to: ${payload.profile.email}`,
    '',
    ...sections.map(renderTextSection)
  ].join('\n\n');

  const htmlSections = sections.map(renderHtmlSection).join('');
  const spotlightCardsHtml = renderSpotlightCards(payload);
  const snapshotHtml = renderSubmissionSnapshot({
    applicationId,
    payload,
    submittedAtIso
  });

  const htmlBody = `<!doctype html>
<html lang="${escapeHtml(payload.locale)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#edf2fb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;border-collapse:collapse;background:#ffffff;border:1px solid #d5deed;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:26px 28px;background:linear-gradient(135deg,#081326 0%,#0f2b57 100%);color:#ffffff;">
                <div style="display:inline-block;padding:6px 10px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Nyvoro Records</div>
                <div style="margin-top:12px;font-size:24px;line-height:1.25;font-weight:800;">New Artist Application</div>
                <div style="margin-top:6px;font-size:15px;line-height:1.5;opacity:0.95;">${escapeHtml(payload.profile.artistName)} submitted a new form.</div>
                <div style="margin-top:14px;font-size:13px;line-height:1.5;opacity:0.88;">Reply-to: <a href="mailto:${escapeHtml(payload.profile.email)}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(payload.profile.email)}</a></div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 22px 8px 22px;background:#f6f9ff;">
                ${spotlightCardsHtml}
                ${snapshotHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 22px 8px 22px;">
                ${htmlSections}
              </td>
            </tr>
            <tr>
              <td style="padding:0 22px 22px 22px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding-top:14px;color:#6b7280;font-size:12px;line-height:1.5;">
                      Sent by Nyvoro application backend.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    text: textBody,
    html: htmlBody
  };
}

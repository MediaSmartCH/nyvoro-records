import type { Locale } from '@nyvoro/shared-types';

function toDateParts(dateString: string): { year: number; month: number; day: number } | null {
  const [yearRaw, monthRaw, dayRaw] = dateString.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return { year, month, day };
}

export function getLocalDateKey(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function compareReleaseDatesAsc(left: string, right: string): number {
  return left.localeCompare(right);
}

export function compareReleaseDatesDesc(left: string, right: string): number {
  return right.localeCompare(left);
}

export function isReleaseOnOrAfter(releaseDate: string, localDateKey: string): boolean {
  return compareReleaseDatesAsc(releaseDate, localDateKey) >= 0;
}

export function formatReleaseDate(releaseDate: string, locale: Locale): string {
  const parts = toDateParts(releaseDate);
  if (!parts) {
    return releaseDate;
  }

  // Force UTC rendering to avoid date shifts caused by browser timezone offsets.
  const stableDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', { timeZone: 'UTC' }).format(stableDate);
}

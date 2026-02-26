import type { Artist, LabelMetadata, Locale, Release } from '@nyvoro/shared-types';
import artistsData from '../data/artists.json';
import labelData from '../data/label.json';
import legalEnData from '../data/legal.en.json';
import legalFrData from '../data/legal.fr.json';
import releasesData from '../data/releases.json';
import translationEnData from '../data/translations.en.json';
import translationFrData from '../data/translations.fr.json';

export const defaultLocale: Locale = 'en';

export const labelMetadata = labelData as LabelMetadata;
export const artists = artistsData as Artist[];
export const releases = releasesData as Release[];

export const translations = {
  en: translationEnData,
  fr: translationFrData
} as const;

export type LegalDocumentKey = 'imprint' | 'privacy' | 'terms';

export type LegalSection = {
  id: string;
  heading: string;
  content: string[];
};

export type LegalDocument = {
  title: string;
  summary: string;
  lastUpdated: string;
  contactEmail: string;
  sections: LegalSection[];
};

export type LegalDocumentMap = Record<LegalDocumentKey, LegalDocument>;
export type LegalContentMap = Record<Locale, LegalDocumentMap>;

export const legalContent: LegalContentMap = {
  en: legalEnData as LegalDocumentMap,
  fr: legalFrData as LegalDocumentMap
};

export const supportedLocaleList: Locale[] = ['en', 'fr'];

export function isSupportedLocale(value: string): value is Locale {
  return supportedLocaleList.includes(value as Locale);
}

export function getTranslation(locale: Locale) {
  return translations[locale] ?? translations[defaultLocale];
}

export function getLegalContent(locale: Locale): LegalDocumentMap {
  return legalContent[locale] ?? legalContent[defaultLocale];
}

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

export const legalContent = {
  en: legalEnData,
  fr: legalFrData
} as const;

export const supportedLocaleList: Locale[] = ['en', 'fr'];

export function isSupportedLocale(value: string): value is Locale {
  return supportedLocaleList.includes(value as Locale);
}

export function getTranslation(locale: Locale) {
  return translations[locale] ?? translations[defaultLocale];
}

export function getLegalContent(locale: Locale) {
  return legalContent[locale] ?? legalContent[defaultLocale];
}

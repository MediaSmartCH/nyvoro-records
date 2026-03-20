import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adminCatalogSnapshotSchema,
  type AdminCatalogArtist,
  type AdminCatalogRelease,
  type AdminCatalogSnapshot,
  type Artist,
  type ArtistDiscographyEntry,
  type Release,
  type ReleaseFormat,
  type ReleaseStatus,
  type ReleaseTrack
} from '@nyvoro/shared-types';

export type ContentStore = {
  readCatalog(): AdminCatalogSnapshot;
  writeCatalog(snapshot: AdminCatalogSnapshot): AdminCatalogSnapshot;
};

function resolveContentDataDir(): string {
  const candidateRoots = [process.cwd(), path.dirname(fileURLToPath(import.meta.url))];

  for (const root of candidateRoots) {
    let currentDir = path.resolve(root);

    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.join(currentDir, 'packages', 'content', 'data');
      if (
        fs.existsSync(path.join(candidate, 'artists.json')) &&
        fs.existsSync(path.join(candidate, 'releases.json'))
      ) {
        return candidate;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }
  }

  throw new Error('Unable to locate packages/content/data.');
}

function normalizeLocalizedText(input: Record<'en' | 'fr', string>): Record<'en' | 'fr', string> {
  return {
    en: input.en.trim(),
    fr: input.fr.trim()
  };
}

function normalizeLocalizedList(input: Record<'en' | 'fr', string[]>): Record<'en' | 'fr', string[]> {
  return {
    en: input.en.map((item) => item.trim()).filter(Boolean),
    fr: input.fr.map((item) => item.trim()).filter(Boolean)
  };
}

function normalizeLinks(input: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([platform, url]) => [platform.trim(), url.trim()] as const)
      .filter(([platform, url]) => platform.length > 0 && url.length > 0)
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function inferReleaseFormat(release: Release): ReleaseFormat {
  return release.format ?? 'single';
}

function inferReleaseStatus(release: Release): ReleaseStatus {
  if (release.status) {
    return release.status;
  }

  const today = new Date().toISOString().slice(0, 10);
  return release.releaseDate > today ? 'scheduled' : 'published';
}

function slugifyTrackTitle(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function inferReleaseTracks(release: Release): ReleaseTrack[] {
  if (Array.isArray(release.tracks) && release.tracks.length > 0) {
    return release.tracks.map((track, index) => ({
      id: track.id.trim() || `${release.id}-track-${index + 1}`,
      title: track.title.trim(),
      version: track.version?.trim() || undefined,
      duration: track.duration?.trim() || undefined,
      isFocusTrack: track.isFocusTrack === true
    }));
  }

  const fallbackTitle = release.title.en.trim() || release.title.fr.trim() || release.id;

  return [
    {
      id: `${release.id}-${slugifyTrackTitle(fallbackTitle) || 'track-1'}`,
      title: fallbackTitle,
      isFocusTrack: true
    }
  ];
}

function normalizeArtist(artist: Artist): AdminCatalogArtist {
  return {
    id: artist.id.trim(),
    name: artist.name.trim(),
    genres: artist.genres.map((genre) => genre.trim()).filter(Boolean),
    basedIn: artist.basedIn.trim(),
    portrait: artist.portrait?.trim() || undefined,
    profile: {
      mainLanguage: normalizeLocalizedText(artist.profile.mainLanguage),
      targetTerritory: normalizeLocalizedText(artist.profile.targetTerritory),
      positioning: normalizeLocalizedText(artist.profile.positioning),
      conceptSummary: normalizeLocalizedText(artist.profile.conceptSummary),
      conceptAxes: normalizeLocalizedList(artist.profile.conceptAxes),
      soundDna: normalizeLocalizedList(artist.profile.soundDna),
      visualUniverse: normalizeLocalizedList(artist.profile.visualUniverse),
      keyThemes: normalizeLocalizedList(artist.profile.keyThemes)
    },
    bio: normalizeLocalizedText(artist.bio),
    links: normalizeLinks(artist.links)
  };
}

function normalizeRelease(release: Release): AdminCatalogRelease {
  return {
    id: release.id.trim(),
    artistId: release.artistId.trim(),
    title: normalizeLocalizedText(release.title),
    releaseDate: release.releaseDate.trim(),
    artwork: release.artwork.trim(),
    links: normalizeLinks(release.links),
    description: normalizeLocalizedText(release.description),
    format: inferReleaseFormat(release),
    status: inferReleaseStatus(release),
    tracks: inferReleaseTracks(release)
  };
}

function sortCatalog(snapshot: AdminCatalogSnapshot): AdminCatalogSnapshot {
  return {
    artists: [...snapshot.artists].sort((left, right) => left.name.localeCompare(right.name)),
    releases: [...snapshot.releases].sort((left, right) => {
      if (left.releaseDate === right.releaseDate) {
        return left.title.en.localeCompare(right.title.en);
      }

      return left.releaseDate.localeCompare(right.releaseDate);
    })
  };
}

function buildDiscographyEntries(releases: AdminCatalogRelease[]): ArtistDiscographyEntry[] {
  return [...releases]
    .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate))
    .map((release) => ({
      title: release.title.en,
      year: Number.parseInt(release.releaseDate.slice(0, 4), 10),
      format: release.format.toUpperCase(),
      platforms: release.links
    }));
}

function buildArtistFileSnapshot(snapshot: AdminCatalogSnapshot): Artist[] {
  return snapshot.artists.map((artist) => {
    const artistReleases = snapshot.releases.filter((release) => release.artistId === artist.id);

    const nextArtist: Artist = {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      basedIn: artist.basedIn,
      profile: artist.profile,
      bio: artist.bio,
      links: artist.links,
      discography: buildDiscographyEntries(artistReleases)
    };

    if (artist.portrait) {
      nextArtist.portrait = artist.portrait;
    }

    return nextArtist;
  });
}

function writeJsonFileAtomically(filePath: string, payload: unknown): void {
  const tempFilePath = `${filePath}.tmp`;
  fs.writeFileSync(tempFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempFilePath, filePath);
}

function readCatalogFromFiles(input: { artistsFilePath: string; releasesFilePath: string }): AdminCatalogSnapshot {
  const artistsJson = JSON.parse(fs.readFileSync(input.artistsFilePath, 'utf8')) as Artist[];
  const releasesJson = JSON.parse(fs.readFileSync(input.releasesFilePath, 'utf8')) as Release[];

  return adminCatalogSnapshotSchema.parse(
    sortCatalog({
      artists: artistsJson.map(normalizeArtist),
      releases: releasesJson.map(normalizeRelease)
    })
  );
}

export function createFileContentStore(): ContentStore {
  const dataDir = resolveContentDataDir();
  const artistsFilePath = path.join(dataDir, 'artists.json');
  const releasesFilePath = path.join(dataDir, 'releases.json');

  return {
    readCatalog() {
      return readCatalogFromFiles({
        artistsFilePath,
        releasesFilePath
      });
    },
    writeCatalog(snapshot) {
      const parsedSnapshot = adminCatalogSnapshotSchema.parse(sortCatalog(snapshot));

      writeJsonFileAtomically(releasesFilePath, parsedSnapshot.releases);
      writeJsonFileAtomically(artistsFilePath, buildArtistFileSnapshot(parsedSnapshot));

      return parsedSnapshot;
    }
  };
}

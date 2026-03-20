import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AdminCatalogArtist,
  AdminCatalogRelease,
  AdminCatalogSnapshot,
  ReleaseFormat,
  ReleaseStatus
} from '@nyvoro/shared-types';
import { fetchAdminCatalog, saveAdminCatalog } from '../../lib/admin-catalog-api';

type LocaleKey = 'en' | 'fr';

type FeedbackState =
  | {
      kind: 'success' | 'error';
      message: string;
    }
  | null;

type Copy = {
  title: string;
  subtitle: string;
  loading: string;
  loadError: string;
  save: string;
  saving: string;
  reset: string;
  unsaved: string;
  saved: string;
  addArtist: string;
  deleteArtist: string;
  addSingle: string;
  addAlbum: string;
  deleteRelease: string;
  noArtists: string;
  noArtistSelected: string;
  noReleaseSelected: string;
  artistDirectory: string;
  catalogStats: {
    artists: string;
    releases: string;
    tracks: string;
    scheduled: string;
  };
  artistFields: {
    section: string;
    name: string;
    id: string;
    genres: string;
    basedIn: string;
    portrait: string;
    bioEn: string;
    bioFr: string;
  };
  strategyFields: {
    section: string;
    mainLanguageEn: string;
    mainLanguageFr: string;
    targetTerritoryEn: string;
    targetTerritoryFr: string;
    positioningEn: string;
    positioningFr: string;
    conceptSummaryEn: string;
    conceptSummaryFr: string;
  };
  creativeFields: {
    section: string;
    conceptAxesEn: string;
    conceptAxesFr: string;
    soundDnaEn: string;
    soundDnaFr: string;
    visualUniverseEn: string;
    visualUniverseFr: string;
    keyThemesEn: string;
    keyThemesFr: string;
    listHint: string;
  };
  linksSection: string;
  releaseSection: string;
  releaseFields: {
    titleEn: string;
    titleFr: string;
    id: string;
    date: string;
    artwork: string;
    format: string;
    status: string;
    descriptionEn: string;
    descriptionFr: string;
  };
  releaseFormats: Record<ReleaseFormat, string>;
  releaseStatuses: Record<ReleaseStatus, string>;
  releaseListEmpty: string;
  releaseCountLabel: string;
  releaseSearchPlaceholder: string;
  releaseSearchEmpty: string;
  releaseTrackCount: string;
  trackSection: string;
  trackBrowserTitle: string;
  trackEditorTitle: string;
  trackSearchPlaceholder: string;
  trackSearchEmpty: string;
  noTrackSelected: string;
  addTrack: string;
  removeTrack: string;
  trackTitle: string;
  trackId: string;
  trackVersion: string;
  trackDuration: string;
  focusTrack: string;
  confirmDeleteArtist: string;
  confirmDeleteRelease: string;
};

const copyByLocale: Record<LocaleKey, Copy> = {
  fr: {
    title: 'Catalogue label',
    subtitle:
      'Edite les artistes, les singles, les EPs, les albums et les tracks depuis une seule vue admin.',
    loading: 'Chargement du catalogue...',
    loadError: 'Impossible de charger le catalogue admin pour le moment.',
    save: 'Enregistrer les changements',
    saving: 'Enregistrement...',
    reset: 'Annuler les changements',
    unsaved: 'Modifications locales non enregistrees.',
    saved: 'Catalogue enregistre.',
    addArtist: 'Nouvel artiste',
    deleteArtist: 'Supprimer artiste',
    addSingle: 'Ajouter single',
    addAlbum: 'Ajouter album / EP',
    deleteRelease: 'Supprimer sortie',
    noArtists: 'Aucun artiste dans le catalogue. Cree la premiere fiche pour demarrer.',
    noArtistSelected: 'Selectionne un artiste pour commencer.',
    noReleaseSelected: 'Selectionne une sortie ou ajoute un nouveau single / album.',
    artistDirectory: 'Roster',
    catalogStats: {
      artists: 'Artistes',
      releases: 'Sorties',
      tracks: 'Tracks',
      scheduled: 'A venir'
    },
    artistFields: {
      section: 'Fiche artiste',
      name: 'Nom artiste',
      id: 'Identifiant',
      genres: 'Genres (separes par des virgules)',
      basedIn: 'Base / territoire',
      portrait: 'Portrait (URL ou chemin /images/...)',
      bioEn: 'Bio EN',
      bioFr: 'Bio FR'
    },
    strategyFields: {
      section: 'Positionnement',
      mainLanguageEn: 'Langue principale EN',
      mainLanguageFr: 'Langue principale FR',
      targetTerritoryEn: 'Territoire cible EN',
      targetTerritoryFr: 'Territoire cible FR',
      positioningEn: 'Positionnement EN',
      positioningFr: 'Positionnement FR',
      conceptSummaryEn: 'Resume concept EN',
      conceptSummaryFr: 'Resume concept FR'
    },
    creativeFields: {
      section: 'Univers creatif',
      conceptAxesEn: 'Axes narratifs EN',
      conceptAxesFr: 'Axes narratifs FR',
      soundDnaEn: 'ADN sonore EN',
      soundDnaFr: 'ADN sonore FR',
      visualUniverseEn: 'Univers visuel EN',
      visualUniverseFr: 'Univers visuel FR',
      keyThemesEn: 'Themes EN',
      keyThemesFr: 'Themes FR',
      listHint: 'Une ligne = un item.'
    },
    linksSection: 'Liens publics',
    releaseSection: 'Sorties de l artiste',
    releaseFields: {
      titleEn: 'Titre EN',
      titleFr: 'Titre FR',
      id: 'Identifiant release',
      date: 'Date de sortie',
      artwork: 'Artwork (URL ou chemin /images/...)',
      format: 'Format',
      status: 'Statut',
      descriptionEn: 'Description EN',
      descriptionFr: 'Description FR'
    },
    releaseFormats: {
      single: 'Single',
      ep: 'EP',
      album: 'Album'
    },
    releaseStatuses: {
      draft: 'Draft',
      scheduled: 'Planifiee',
      published: 'Publiee'
    },
    releaseListEmpty: 'Aucune sortie pour cet artiste.',
    releaseCountLabel: 'sorties',
    releaseSearchPlaceholder: 'Rechercher une sortie, une date ou un id...',
    releaseSearchEmpty: 'Aucune sortie ne correspond a cette recherche.',
    releaseTrackCount: 'tracks',
    trackSection: 'Tracks',
    trackBrowserTitle: 'Selection rapide',
    trackEditorTitle: 'Edition du track',
    trackSearchPlaceholder: 'Rechercher un track...',
    trackSearchEmpty: 'Aucun track ne correspond a cette recherche.',
    noTrackSelected: 'Selectionne un track pour l editer.',
    addTrack: 'Ajouter track',
    removeTrack: 'Supprimer track',
    trackTitle: 'Titre',
    trackId: 'Id track',
    trackVersion: 'Version',
    trackDuration: 'Duree',
    focusTrack: 'Track focus',
    confirmDeleteArtist:
      'Supprimer cet artiste supprimera aussi toutes ses sorties. Continuer ?',
    confirmDeleteRelease: 'Supprimer cette sortie du catalogue ?'
  },
  en: {
    title: 'Label catalog',
    subtitle: 'Edit artists, singles, EPs, albums, and track lists from one admin control room.',
    loading: 'Loading catalog...',
    loadError: 'Unable to load the admin catalog right now.',
    save: 'Save changes',
    saving: 'Saving...',
    reset: 'Reset changes',
    unsaved: 'Local changes are not saved yet.',
    saved: 'Catalog saved.',
    addArtist: 'New artist',
    deleteArtist: 'Delete artist',
    addSingle: 'Add single',
    addAlbum: 'Add album / EP',
    deleteRelease: 'Delete release',
    noArtists: 'No artists in the catalog yet. Create the first profile to get started.',
    noArtistSelected: 'Select an artist to start editing.',
    noReleaseSelected: 'Select a release or add a new single / album.',
    artistDirectory: 'Roster',
    catalogStats: {
      artists: 'Artists',
      releases: 'Releases',
      tracks: 'Tracks',
      scheduled: 'Scheduled'
    },
    artistFields: {
      section: 'Artist file',
      name: 'Artist name',
      id: 'Identifier',
      genres: 'Genres (comma-separated)',
      basedIn: 'Base / territory',
      portrait: 'Portrait (URL or /images/... path)',
      bioEn: 'Bio EN',
      bioFr: 'Bio FR'
    },
    strategyFields: {
      section: 'Positioning',
      mainLanguageEn: 'Main language EN',
      mainLanguageFr: 'Main language FR',
      targetTerritoryEn: 'Target territory EN',
      targetTerritoryFr: 'Target territory FR',
      positioningEn: 'Positioning EN',
      positioningFr: 'Positioning FR',
      conceptSummaryEn: 'Concept summary EN',
      conceptSummaryFr: 'Concept summary FR'
    },
    creativeFields: {
      section: 'Creative system',
      conceptAxesEn: 'Concept axes EN',
      conceptAxesFr: 'Concept axes FR',
      soundDnaEn: 'Sound DNA EN',
      soundDnaFr: 'Sound DNA FR',
      visualUniverseEn: 'Visual universe EN',
      visualUniverseFr: 'Visual universe FR',
      keyThemesEn: 'Key themes EN',
      keyThemesFr: 'Key themes FR',
      listHint: 'One line per item.'
    },
    linksSection: 'Public links',
    releaseSection: 'Artist releases',
    releaseFields: {
      titleEn: 'Title EN',
      titleFr: 'Title FR',
      id: 'Release identifier',
      date: 'Release date',
      artwork: 'Artwork (URL or /images/... path)',
      format: 'Format',
      status: 'Status',
      descriptionEn: 'Description EN',
      descriptionFr: 'Description FR'
    },
    releaseFormats: {
      single: 'Single',
      ep: 'EP',
      album: 'Album'
    },
    releaseStatuses: {
      draft: 'Draft',
      scheduled: 'Scheduled',
      published: 'Published'
    },
    releaseListEmpty: 'No releases for this artist yet.',
    releaseCountLabel: 'releases',
    releaseSearchPlaceholder: 'Search a release, date, or id...',
    releaseSearchEmpty: 'No releases match this search.',
    releaseTrackCount: 'tracks',
    trackSection: 'Tracks',
    trackBrowserTitle: 'Quick pick',
    trackEditorTitle: 'Track editor',
    trackSearchPlaceholder: 'Search a track...',
    trackSearchEmpty: 'No tracks match this search.',
    noTrackSelected: 'Select a track to edit it.',
    addTrack: 'Add track',
    removeTrack: 'Remove track',
    trackTitle: 'Title',
    trackId: 'Track id',
    trackVersion: 'Version',
    trackDuration: 'Duration',
    focusTrack: 'Focus track',
    confirmDeleteArtist:
      'Deleting this artist will also remove every linked release. Continue?',
    confirmDeleteRelease: 'Delete this release from the catalog?'
  }
};

function cloneSnapshot(snapshot: AdminCatalogSnapshot): AdminCatalogSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AdminCatalogSnapshot;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function createUniqueId(baseValue: string, existingIds: string[]): string {
  const base = slugify(baseValue) || 'item';
  let candidate = base;
  let index = 2;

  while (existingIds.includes(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function listToTextareaValue(values: string[]): string {
  return values.join('\n');
}

function textareaValueToList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function recordToRows(record: Record<string, string>): Array<{ key: string; value: string }> {
  const rows = Object.entries(record).map(([key, value]) => ({ key, value }));
  return rows.length > 0 ? rows : [{ key: '', value: '' }];
}

function rowsToRecord(rows: Array<{ key: string; value: string }>): Record<string, string> {
  return Object.fromEntries(
    rows
      .map((row) => ({
        key: row.key.trim(),
        value: row.value.trim()
      }))
      .filter((row) => row.key.length > 0 && row.value.length > 0)
      .map((row) => [row.key, row.value] as const)
  );
}

function buildEmptyArtist(existingIds: string[]): AdminCatalogArtist {
  const id = createUniqueId('new-artist', existingIds);

  return {
    id,
    name: 'New Artist',
    genres: ['Electronic'],
    basedIn: 'Europe',
    portrait: '',
    profile: {
      mainLanguage: {
        en: 'English',
        fr: 'Anglais'
      },
      targetTerritory: {
        en: 'Europe',
        fr: 'Europe'
      },
      positioning: {
        en: 'Define the artistic angle.',
        fr: 'Definir l angle artistique.'
      },
      conceptSummary: {
        en: 'Describe the project arc.',
        fr: 'Decrire l arc du projet.'
      },
      conceptAxes: {
        en: ['Narrative axis'],
        fr: ['Axe narratif']
      },
      soundDna: {
        en: ['Production trait'],
        fr: ['Trait de production']
      },
      visualUniverse: {
        en: ['Visual cue'],
        fr: ['Repere visuel']
      },
      keyThemes: {
        en: ['Theme'],
        fr: ['Theme']
      }
    },
    bio: {
      en: 'Add the English artist bio here.',
      fr: 'Ajoute ici la bio artiste en francais.'
    },
    links: {}
  };
}

function buildEmptyRelease(input: {
  artistId: string;
  format: ReleaseFormat;
  existingIds: string[];
}): AdminCatalogRelease {
  const fallbackTitle = input.format === 'album' ? 'New Album' : 'New Single';
  const id = createUniqueId(fallbackTitle, input.existingIds);

  return {
    id,
    artistId: input.artistId,
    title: {
      en: fallbackTitle,
      fr: input.format === 'album' ? 'Nouvel Album' : 'Nouveau Single'
    },
    releaseDate: new Date().toISOString().slice(0, 10),
    artwork: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    links: {},
    description: {
      en: 'Add release notes and positioning.',
      fr: 'Ajoute les notes de sortie et le positionnement.'
    },
    format: input.format,
    status: 'draft',
    tracks: [
      {
        id: `${id}-track-1`,
        title: fallbackTitle,
        isFocusTrack: true
      }
    ]
  };
}

function sumTrackCount(releases: AdminCatalogRelease[]): number {
  return releases.reduce((total, release) => total + release.tracks.length, 0);
}

function EditableRecordField({
  label,
  value,
  onChange
}: {
  label: string;
  value: Record<string, string>;
  onChange: (nextValue: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState(() => recordToRows(value));

  useEffect(() => {
    setRows(recordToRows(value));
  }, [value]);

  function updateRow(index: number, field: 'key' | 'value', nextValue: string) {
    const nextRows = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: nextValue } : row
    );

    setRows(nextRows);
    onChange(rowsToRecord(nextRows));
  }

  function removeRow(index: number) {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    const normalizedRows = nextRows.length > 0 ? nextRows : [{ key: '', value: '' }];

    setRows(normalizedRows);
    onChange(rowsToRecord(normalizedRows));
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, { key: '', value: '' }]);
  }

  return (
    <section className="admin-field-block">
      <div className="admin-section-head">
        <h4>{label}</h4>
        <button type="button" className="btn secondary dashboard-inline-action" onClick={addRow}>
          +
        </button>
      </div>

      <div className="admin-record-grid">
        {rows.map((row, index) => (
          <div key={`${label}-${index}`} className="admin-record-row">
            <input
              type="text"
              value={row.key}
              placeholder="platform"
              onChange={(event) => updateRow(index, 'key', event.target.value)}
            />
            <input
              type="url"
              value={row.value}
              placeholder="https://..."
              onChange={(event) => updateRow(index, 'value', event.target.value)}
            />
            <button
              type="button"
              className="btn secondary dashboard-inline-action"
              onClick={() => removeRow(index)}
            >
              -
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminCatalogManagerContent({
  locale,
  copy
}: {
  locale: string;
  copy: Copy;
}) {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<AdminCatalogSnapshot | null>(null);
  const [draft, setDraft] = useState<AdminCatalogSnapshot | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [releaseSearchTerm, setReleaseSearchTerm] = useState('');
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const response = await fetchAdminCatalog();

      if (!mounted) {
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          navigate(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin/dashboard`)}`, {
            replace: true
          });
          return;
        }

        setFeedback({ kind: 'error', message: copy.loadError });
        setIsLoading(false);
        return;
      }

      const snapshot: AdminCatalogSnapshot = {
        artists: Array.isArray(response.body.artists) ? response.body.artists : [],
        releases: Array.isArray(response.body.releases) ? response.body.releases : []
      };

      setCatalog(cloneSnapshot(snapshot));
      setDraft(cloneSnapshot(snapshot));
      setSelectedArtistId(snapshot.artists[0]?.id ?? null);
      setSelectedReleaseId(snapshot.releases[0]?.id ?? null);
      setSelectedTrackId(snapshot.releases[0]?.tracks[0]?.id ?? null);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [copy.loadError, locale, navigate]);

  const hasUnsavedChanges = useMemo(() => {
    if (!catalog || !draft) {
      return false;
    }

    return JSON.stringify(catalog) !== JSON.stringify(draft);
  }, [catalog, draft]);

  useEffect(() => {
    if (!draft) {
      return;
    }

    if (!selectedArtistId || !draft.artists.some((artist) => artist.id === selectedArtistId)) {
      setSelectedArtistId(draft.artists[0]?.id ?? null);
    }
  }, [draft, selectedArtistId]);

  useEffect(() => {
    setReleaseSearchTerm('');
  }, [selectedArtistId]);

  useEffect(() => {
    if (!draft || !selectedArtistId) {
      setSelectedReleaseId(null);
      return;
    }

    const artistReleaseIds = draft.releases
      .filter((release) => release.artistId === selectedArtistId)
      .map((release) => release.id);

    if (!selectedReleaseId || !artistReleaseIds.includes(selectedReleaseId)) {
      setSelectedReleaseId(artistReleaseIds[0] ?? null);
    }
  }, [draft, selectedArtistId, selectedReleaseId]);

  useEffect(() => {
    setTrackSearchTerm('');
  }, [selectedReleaseId]);

  const selectedArtist = useMemo(() => {
    return draft?.artists.find((artist) => artist.id === selectedArtistId) ?? null;
  }, [draft, selectedArtistId]);

  const selectedArtistReleases = useMemo(() => {
    if (!draft || !selectedArtistId) {
      return [];
    }

    return [...draft.releases]
      .filter((release) => release.artistId === selectedArtistId)
      .sort((left, right) => right.releaseDate.localeCompare(left.releaseDate));
  }, [draft, selectedArtistId]);

  const filteredArtistReleases = useMemo(() => {
    const normalizedSearchTerm = releaseSearchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return selectedArtistReleases;
    }

    return selectedArtistReleases.filter((release) => {
      const searchTarget = [
        release.title.en,
        release.title.fr,
        release.id,
        release.releaseDate,
        release.status,
        release.format
      ]
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedSearchTerm);
    });
  }, [releaseSearchTerm, selectedArtistReleases]);

  const selectedRelease = useMemo(() => {
    return selectedArtistReleases.find((release) => release.id === selectedReleaseId) ?? null;
  }, [selectedArtistReleases, selectedReleaseId]);

  const filteredReleaseTracks = useMemo(() => {
    if (!selectedRelease) {
      return [];
    }

    const normalizedSearchTerm = trackSearchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return selectedRelease.tracks;
    }

    return selectedRelease.tracks.filter((track) => {
      const searchTarget = [track.title, track.id, track.version ?? '', track.duration ?? '']
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(normalizedSearchTerm);
    });
  }, [selectedRelease, trackSearchTerm]);

  const selectedTrack = useMemo(() => {
    return selectedRelease?.tracks.find((track) => track.id === selectedTrackId) ?? null;
  }, [selectedRelease, selectedTrackId]);

  useEffect(() => {
    if (filteredArtistReleases.length > 0 && !filteredArtistReleases.some((release) => release.id === selectedReleaseId)) {
      setSelectedReleaseId(filteredArtistReleases[0]?.id ?? null);
    }
  }, [filteredArtistReleases, selectedReleaseId]);

  useEffect(() => {
    if (!selectedRelease) {
      setSelectedTrackId(null);
      return;
    }

    const releaseTrackIds = selectedRelease.tracks.map((track) => track.id);
    if (!selectedTrackId || !releaseTrackIds.includes(selectedTrackId)) {
      setSelectedTrackId(selectedRelease.tracks[0]?.id ?? null);
    }
  }, [selectedRelease, selectedTrackId]);

  useEffect(() => {
    if (filteredReleaseTracks.length > 0 && !filteredReleaseTracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(filteredReleaseTracks[0]?.id ?? null);
    }
  }, [filteredReleaseTracks, selectedTrackId]);

  const catalogStats = useMemo(() => {
    const releases = draft?.releases ?? [];

    return [
      { label: copy.catalogStats.artists, value: draft?.artists.length ?? 0 },
      { label: copy.catalogStats.releases, value: releases.length },
      { label: copy.catalogStats.tracks, value: sumTrackCount(releases) },
      {
        label: copy.catalogStats.scheduled,
        value: releases.filter((release) => release.status === 'scheduled').length
      }
    ];
  }, [copy.catalogStats, draft]);

  function updateDraft(nextSnapshot: AdminCatalogSnapshot) {
    setDraft(nextSnapshot);
    setFeedback(null);
  }

  function updateSelectedArtist(
    updater: (artist: AdminCatalogArtist) => AdminCatalogArtist,
    options?: { nextArtistId?: string }
  ) {
    if (!draft || !selectedArtist) {
      return;
    }

    const nextArtist = updater(selectedArtist);
    const nextArtists = draft.artists.map((artist) => (artist.id === selectedArtist.id ? nextArtist : artist));
    const nextReleases = draft.releases.map((release) =>
      release.artistId === selectedArtist.id
        ? {
            ...release,
            artistId: options?.nextArtistId ?? nextArtist.id
          }
        : release
    );

    updateDraft({
      artists: nextArtists,
      releases: nextReleases
    });

    if (options?.nextArtistId) {
      setSelectedArtistId(options.nextArtistId);
    }
  }

  function updateSelectedRelease(updater: (release: AdminCatalogRelease) => AdminCatalogRelease) {
    if (!draft || !selectedRelease) {
      return;
    }

    updateDraft({
      ...draft,
      releases: draft.releases.map((release) =>
        release.id === selectedRelease.id ? updater(selectedRelease) : release
      )
    });
  }

  function updateSelectedTrack(
    updater: (track: NonNullable<typeof selectedTrack>) => NonNullable<typeof selectedTrack>
  ) {
    if (!selectedTrack) {
      return;
    }

    updateSelectedRelease((release) => ({
      ...release,
      tracks: release.tracks.map((track) => (track.id === selectedTrack.id ? updater(track) : track))
    }));
  }

  function handleAddArtist() {
    if (!draft) {
      return;
    }

    const nextArtist = buildEmptyArtist(draft.artists.map((artist) => artist.id));

    updateDraft({
      ...draft,
      artists: [...draft.artists, nextArtist]
    });
    setSelectedArtistId(nextArtist.id);
    setSelectedReleaseId(null);
  }

  function handleDeleteArtist() {
    if (!draft || !selectedArtist || !window.confirm(copy.confirmDeleteArtist)) {
      return;
    }

    const nextArtists = draft.artists.filter((artist) => artist.id !== selectedArtist.id);
    const nextReleases = draft.releases.filter((release) => release.artistId !== selectedArtist.id);

    updateDraft({
      artists: nextArtists,
      releases: nextReleases
    });
    setSelectedArtistId(nextArtists[0]?.id ?? null);
    setSelectedReleaseId(null);
  }

  function handleAddRelease(format: ReleaseFormat) {
    if (!draft || !selectedArtist) {
      return;
    }

    const nextRelease = buildEmptyRelease({
      artistId: selectedArtist.id,
      format,
      existingIds: draft.releases.map((release) => release.id)
    });

    updateDraft({
      ...draft,
      releases: [...draft.releases, nextRelease]
    });
    setSelectedReleaseId(nextRelease.id);
    setSelectedTrackId(nextRelease.tracks[0]?.id ?? null);
  }

  function handleDeleteRelease() {
    if (!draft || !selectedRelease || !window.confirm(copy.confirmDeleteRelease)) {
      return;
    }

    const nextReleases = draft.releases.filter((release) => release.id !== selectedRelease.id);

    updateDraft({
      ...draft,
      releases: nextReleases
    });
    setSelectedReleaseId(null);
    setSelectedTrackId(null);
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const response = await saveAdminCatalog(draft);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        navigate(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin/dashboard`)}`, {
          replace: true
        });
        return;
      }

      setIsSaving(false);
      setFeedback({
        kind: 'error',
        message: typeof response.body.message === 'string' ? response.body.message : copy.loadError
      });
      return;
    }

    const savedSnapshot: AdminCatalogSnapshot = {
      artists: Array.isArray(response.body.artists) ? response.body.artists : [],
      releases: Array.isArray(response.body.releases) ? response.body.releases : []
    };

    setCatalog(cloneSnapshot(savedSnapshot));
    setDraft(cloneSnapshot(savedSnapshot));
    setSelectedArtistId(savedSnapshot.artists.find((artist) => artist.id === selectedArtistId)?.id ?? savedSnapshot.artists[0]?.id ?? null);
    setSelectedReleaseId(
      savedSnapshot.releases.find((release) => release.id === selectedReleaseId)?.id ??
        savedSnapshot.releases[0]?.id ??
        null
    );
    setSelectedTrackId(
      savedSnapshot.releases
        .find((release) => release.id === selectedReleaseId)
        ?.tracks.find((track) => track.id === selectedTrackId)?.id ??
        savedSnapshot.releases.find((release) => release.id === selectedReleaseId)?.tracks[0]?.id ??
        savedSnapshot.releases[0]?.tracks[0]?.id ??
        null
    );
    setFeedback({
      kind: 'success',
      message: copy.saved
    });
    setIsSaving(false);
  }

  function handleReset() {
    if (!catalog) {
      return;
    }

    setDraft(cloneSnapshot(catalog));
    setFeedback(null);
  }

  if (isLoading) {
    return (
      <article className="card dashboard-card dashboard-catalog-shell">
        <p>{copy.loading}</p>
      </article>
    );
  }

  if (!draft) {
    return (
      <article className="card dashboard-card dashboard-catalog-shell">
        <p>{copy.loadError}</p>
      </article>
    );
  }

  return (
    <article className="card dashboard-card dashboard-catalog-shell">
      <div className="dashboard-card-header admin-catalog-header">
        <div>
          <p className="admin-kicker">{copy.title}</p>
          <h2>{copy.subtitle}</h2>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="btn secondary" onClick={handleReset} disabled={!hasUnsavedChanges || isSaving}>
            {copy.reset}
          </button>
          <button type="button" className="btn primary" onClick={() => void handleSave()} disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? copy.saving : copy.save}
          </button>
        </div>
      </div>

      <div className="dashboard-metric-grid admin-catalog-stats">
        {catalogStats.map((stat) => (
          <div key={stat.label} className="dashboard-metric-item">
            <p className="dashboard-metric-value">{stat.value}</p>
            <p className="dashboard-metric-label">{stat.label}</p>
          </div>
        ))}
      </div>

      {feedback ? <p className={`form-status ${feedback.kind}`}>{feedback.message}</p> : null}
      {hasUnsavedChanges ? <p className="admin-dirty-indicator">{copy.unsaved}</p> : null}

      <div className="admin-catalog-layout">
        <aside className="admin-catalog-sidebar">
          <div className="admin-section-head">
            <h3>{copy.artistDirectory}</h3>
            <button type="button" className="btn secondary dashboard-inline-action" onClick={handleAddArtist}>
              {copy.addArtist}
            </button>
          </div>

          {draft.artists.length > 0 ? (
            <div className="admin-artist-list">
              {draft.artists.map((artist) => {
                const releaseCount = draft.releases.filter((release) => release.artistId === artist.id).length;
                const isActive = artist.id === selectedArtistId;

                return (
                  <button
                    key={artist.id}
                    type="button"
                    className={`admin-artist-list-item ${isActive ? 'active' : ''}`.trim()}
                    onClick={() => setSelectedArtistId(artist.id)}
                  >
                    <span className="admin-artist-list-name">{artist.name}</span>
                    <span className="admin-artist-list-meta">
                      {releaseCount} {copy.releaseCountLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="dashboard-list-subtitle">{copy.noArtists}</p>
          )}
        </aside>

        <div className="admin-catalog-main">
          {selectedArtist ? (
            <>
              <div className="admin-editor-grid">
                <section className="admin-editor-panel">
                  <div className="admin-section-head">
                    <h3>{copy.artistFields.section}</h3>
                    <button type="button" className="btn secondary dashboard-inline-action" onClick={handleDeleteArtist}>
                      {copy.deleteArtist}
                    </button>
                  </div>

                  <div className="admin-form-grid">
                    <label>
                      <span>{copy.artistFields.name}</span>
                      <input
                        type="text"
                        value={selectedArtist.name}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            name: event.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.artistFields.id}</span>
                      <input
                        type="text"
                        value={selectedArtist.id}
                        onChange={(event) => {
                          const nextArtistId = slugify(event.target.value) || selectedArtist.id;
                          updateSelectedArtist(
                            (artist) => ({
                              ...artist,
                              id: nextArtistId
                            }),
                            { nextArtistId }
                          );
                        }}
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.artistFields.genres}</span>
                      <input
                        type="text"
                        value={selectedArtist.genres.join(', ')}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            genres: csvToList(event.target.value)
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.artistFields.basedIn}</span>
                      <input
                        type="text"
                        value={selectedArtist.basedIn}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            basedIn: event.target.value
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.artistFields.portrait}</span>
                      <input
                        type="text"
                        value={selectedArtist.portrait ?? ''}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            portrait: event.target.value
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.artistFields.bioEn}</span>
                      <textarea
                        rows={4}
                        value={selectedArtist.bio.en}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            bio: {
                              ...artist.bio,
                              en: event.target.value
                            }
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.artistFields.bioFr}</span>
                      <textarea
                        rows={4}
                        value={selectedArtist.bio.fr}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            bio: {
                              ...artist.bio,
                              fr: event.target.value
                            }
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-section-head">
                    <h3>{copy.strategyFields.section}</h3>
                  </div>

                  <div className="admin-form-grid">
                    <label>
                      <span>{copy.strategyFields.mainLanguageEn}</span>
                      <input
                        type="text"
                        value={selectedArtist.profile.mainLanguage.en}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              mainLanguage: {
                                ...artist.profile.mainLanguage,
                                en: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.strategyFields.mainLanguageFr}</span>
                      <input
                        type="text"
                        value={selectedArtist.profile.mainLanguage.fr}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              mainLanguage: {
                                ...artist.profile.mainLanguage,
                                fr: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.strategyFields.targetTerritoryEn}</span>
                      <input
                        type="text"
                        value={selectedArtist.profile.targetTerritory.en}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              targetTerritory: {
                                ...artist.profile.targetTerritory,
                                en: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.strategyFields.targetTerritoryFr}</span>
                      <input
                        type="text"
                        value={selectedArtist.profile.targetTerritory.fr}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              targetTerritory: {
                                ...artist.profile.targetTerritory,
                                fr: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.strategyFields.positioningEn}</span>
                      <textarea
                        rows={3}
                        value={selectedArtist.profile.positioning.en}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              positioning: {
                                ...artist.profile.positioning,
                                en: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.strategyFields.positioningFr}</span>
                      <textarea
                        rows={3}
                        value={selectedArtist.profile.positioning.fr}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              positioning: {
                                ...artist.profile.positioning,
                                fr: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.strategyFields.conceptSummaryEn}</span>
                      <textarea
                        rows={4}
                        value={selectedArtist.profile.conceptSummary.en}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              conceptSummary: {
                                ...artist.profile.conceptSummary,
                                en: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label className="admin-form-grid-span">
                      <span>{copy.strategyFields.conceptSummaryFr}</span>
                      <textarea
                        rows={4}
                        value={selectedArtist.profile.conceptSummary.fr}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              conceptSummary: {
                                ...artist.profile.conceptSummary,
                                fr: event.target.value
                              }
                            }
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="admin-section-head">
                    <h3>{copy.creativeFields.section}</h3>
                    <p className="dashboard-list-subtitle">{copy.creativeFields.listHint}</p>
                  </div>

                  <div className="admin-form-grid">
                    <label>
                      <span>{copy.creativeFields.conceptAxesEn}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.conceptAxes.en)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              conceptAxes: {
                                ...artist.profile.conceptAxes,
                                en: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.conceptAxesFr}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.conceptAxes.fr)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              conceptAxes: {
                                ...artist.profile.conceptAxes,
                                fr: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.soundDnaEn}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.soundDna.en)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              soundDna: {
                                ...artist.profile.soundDna,
                                en: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.soundDnaFr}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.soundDna.fr)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              soundDna: {
                                ...artist.profile.soundDna,
                                fr: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.visualUniverseEn}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.visualUniverse.en)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              visualUniverse: {
                                ...artist.profile.visualUniverse,
                                en: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.visualUniverseFr}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.visualUniverse.fr)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              visualUniverse: {
                                ...artist.profile.visualUniverse,
                                fr: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.keyThemesEn}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.keyThemes.en)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              keyThemes: {
                                ...artist.profile.keyThemes,
                                en: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>{copy.creativeFields.keyThemesFr}</span>
                      <textarea
                        rows={4}
                        value={listToTextareaValue(selectedArtist.profile.keyThemes.fr)}
                        onChange={(event) =>
                          updateSelectedArtist((artist) => ({
                            ...artist,
                            profile: {
                              ...artist.profile,
                              keyThemes: {
                                ...artist.profile.keyThemes,
                                fr: textareaValueToList(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </label>
                  </div>

                  <EditableRecordField
                    label={copy.linksSection}
                    value={selectedArtist.links}
                    onChange={(nextLinks) =>
                      updateSelectedArtist((artist) => ({
                        ...artist,
                        links: nextLinks
                      }))
                    }
                  />
                </section>

                <section className="admin-editor-panel">
                  <div className="admin-section-head">
                    <h3>{copy.releaseSection}</h3>
                    <div className="admin-inline-actions">
                      <button
                        type="button"
                        className="btn secondary dashboard-inline-action"
                        onClick={() => handleAddRelease('single')}
                      >
                        {copy.addSingle}
                      </button>
                      <button
                        type="button"
                        className="btn secondary dashboard-inline-action"
                        onClick={() => handleAddRelease('album')}
                      >
                        {copy.addAlbum}
                      </button>
                    </div>
                  </div>

                  <div className="admin-release-toolbar">
                    <label className="admin-search-field">
                      <span>{copy.releaseSection}</span>
                      <input
                        type="search"
                        value={releaseSearchTerm}
                        placeholder={copy.releaseSearchPlaceholder}
                        onChange={(event) => setReleaseSearchTerm(event.target.value)}
                      />
                    </label>
                    <p className="dashboard-list-subtitle">
                      {filteredArtistReleases.length} / {selectedArtistReleases.length} {copy.releaseCountLabel}
                    </p>
                  </div>

                  {selectedArtistReleases.length > 0 ? (
                    filteredArtistReleases.length > 0 ? (
                      <div className="admin-release-list">
                        {filteredArtistReleases.map((release) => (
                          <button
                            key={release.id}
                            type="button"
                            className={`admin-release-list-item ${release.id === selectedReleaseId ? 'active' : ''}`.trim()}
                            onClick={() => setSelectedReleaseId(release.id)}
                          >
                            <span>
                              <strong>{release.title.en}</strong>
                              <small>
                                {release.releaseDate} · {release.tracks.length} {copy.releaseTrackCount}
                              </small>
                            </span>
                            <span className="admin-release-badge">{copy.releaseFormats[release.format]}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="dashboard-list-subtitle">{copy.releaseSearchEmpty}</p>
                    )
                  ) : (
                    <p className="dashboard-list-subtitle">{copy.releaseListEmpty}</p>
                  )}

                  {selectedRelease ? (
                    <>
                      <div className="admin-section-head">
                        <h3>{selectedRelease.title.en}</h3>
                        <button
                          type="button"
                          className="btn secondary dashboard-inline-action"
                          onClick={handleDeleteRelease}
                        >
                          {copy.deleteRelease}
                        </button>
                      </div>

                      <div className="admin-form-grid">
                        <label>
                          <span>{copy.releaseFields.titleEn}</span>
                          <input
                            type="text"
                            value={selectedRelease.title.en}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                title: {
                                  ...release.title,
                                  en: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label>
                          <span>{copy.releaseFields.titleFr}</span>
                          <input
                            type="text"
                            value={selectedRelease.title.fr}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                title: {
                                  ...release.title,
                                  fr: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label>
                          <span>{copy.releaseFields.id}</span>
                          <input
                            type="text"
                            value={selectedRelease.id}
                            onChange={(event) => {
                              const nextReleaseId = slugify(event.target.value) || selectedRelease.id;
                              updateSelectedRelease((release) => ({
                                ...release,
                                id: nextReleaseId,
                                tracks: release.tracks.map((track, index) =>
                                  index === 0 && track.id.startsWith(`${selectedRelease.id}-`)
                                    ? { ...track, id: `${nextReleaseId}-track-1` }
                                    : track
                                )
                              }));
                              setSelectedReleaseId(nextReleaseId);
                            }}
                          />
                        </label>

                        <label>
                          <span>{copy.releaseFields.date}</span>
                          <input
                            type="date"
                            value={selectedRelease.releaseDate}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                releaseDate: event.target.value
                              }))
                            }
                          />
                        </label>

                        <label>
                          <span>{copy.releaseFields.format}</span>
                          <select
                            value={selectedRelease.format}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                format: event.target.value as ReleaseFormat
                              }))
                            }
                          >
                            {Object.entries(copy.releaseFormats).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>{copy.releaseFields.status}</span>
                          <select
                            value={selectedRelease.status}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                status: event.target.value as ReleaseStatus
                              }))
                            }
                          >
                            {Object.entries(copy.releaseStatuses).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="admin-form-grid-span">
                          <span>{copy.releaseFields.artwork}</span>
                          <input
                            type="text"
                            value={selectedRelease.artwork}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                artwork: event.target.value
                              }))
                            }
                          />
                        </label>

                        <label className="admin-form-grid-span">
                          <span>{copy.releaseFields.descriptionEn}</span>
                          <textarea
                            rows={4}
                            value={selectedRelease.description.en}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                description: {
                                  ...release.description,
                                  en: event.target.value
                                }
                              }))
                            }
                          />
                        </label>

                        <label className="admin-form-grid-span">
                          <span>{copy.releaseFields.descriptionFr}</span>
                          <textarea
                            rows={4}
                            value={selectedRelease.description.fr}
                            onChange={(event) =>
                              updateSelectedRelease((release) => ({
                                ...release,
                                description: {
                                  ...release.description,
                                  fr: event.target.value
                                }
                              }))
                            }
                          />
                        </label>
                      </div>

                      <EditableRecordField
                        label={copy.linksSection}
                        value={selectedRelease.links}
                        onChange={(nextLinks) =>
                          updateSelectedRelease((release) => ({
                            ...release,
                            links: nextLinks
                          }))
                        }
                      />

                      <section className="admin-field-block admin-track-browser">
                        <div className="admin-section-head">
                          <div>
                            <h4>{copy.trackBrowserTitle}</h4>
                            <p className="dashboard-list-subtitle">
                              {selectedRelease.tracks.length} {copy.releaseTrackCount}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn secondary dashboard-inline-action"
                            onClick={() =>
                              updateSelectedRelease((release) => {
                                const nextTrack = {
                                  id: `${release.id}-track-${release.tracks.length + 1}`,
                                  title: `Track ${release.tracks.length + 1}`,
                                  isFocusTrack: false
                                };

                                setSelectedTrackId(nextTrack.id);

                                return {
                                  ...release,
                                  tracks: [...release.tracks, nextTrack]
                                };
                              })
                            }
                          >
                            {copy.addTrack}
                          </button>
                        </div>

                        <label className="admin-search-field">
                          <span>{copy.trackSection}</span>
                          <input
                            type="search"
                            value={trackSearchTerm}
                            placeholder={copy.trackSearchPlaceholder}
                            onChange={(event) => setTrackSearchTerm(event.target.value)}
                          />
                        </label>

                        {filteredReleaseTracks.length > 0 ? (
                          <div className="admin-track-picker">
                            {filteredReleaseTracks.map((track) => (
                              <button
                                key={track.id}
                                type="button"
                                className={`admin-track-pill ${track.id === selectedTrackId ? 'active' : ''}`.trim()}
                                onClick={() => setSelectedTrackId(track.id)}
                              >
                                <strong>{track.title}</strong>
                                <small>
                                  {track.version ? `${track.version} · ` : ''}
                                  {track.duration || track.id}
                                </small>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="dashboard-list-subtitle">{copy.trackSearchEmpty}</p>
                        )}

                        {selectedTrack ? (
                          <div className="admin-track-card admin-track-editor">
                            <div className="admin-section-head">
                              <div>
                                <h4>{copy.trackEditorTitle}</h4>
                                <p className="dashboard-list-subtitle">{selectedTrack.title}</p>
                              </div>
                              <button
                                type="button"
                                className="btn secondary dashboard-inline-action"
                                disabled={selectedRelease.tracks.length <= 1}
                                onClick={() => {
                                  const remainingTracks = selectedRelease.tracks.filter(
                                    (track) => track.id !== selectedTrack.id
                                  );

                                  setSelectedTrackId(remainingTracks[0]?.id ?? null);
                                  updateSelectedRelease((release) => ({
                                    ...release,
                                    tracks: remainingTracks
                                  }));
                                }}
                              >
                                {copy.removeTrack}
                              </button>
                            </div>

                            <div className="admin-form-grid">
                              <label>
                                <span>{copy.trackTitle}</span>
                                <input
                                  type="text"
                                  value={selectedTrack.title}
                                  onChange={(event) =>
                                    updateSelectedTrack((track) => ({
                                      ...track,
                                      title: event.target.value
                                    }))
                                  }
                                />
                              </label>

                              <label>
                                <span>{copy.trackId}</span>
                                <input
                                  type="text"
                                  value={selectedTrack.id}
                                  onChange={(event) => {
                                    const nextTrackId = slugify(event.target.value) || selectedTrack.id;
                                    setSelectedTrackId(nextTrackId);
                                    updateSelectedTrack((track) => ({
                                      ...track,
                                      id: nextTrackId
                                    }));
                                  }}
                                />
                              </label>

                              <label>
                                <span>{copy.trackVersion}</span>
                                <input
                                  type="text"
                                  value={selectedTrack.version ?? ''}
                                  onChange={(event) =>
                                    updateSelectedTrack((track) => ({
                                      ...track,
                                      version: event.target.value
                                    }))
                                  }
                                />
                              </label>

                              <label>
                                <span>{copy.trackDuration}</span>
                                <input
                                  type="text"
                                  value={selectedTrack.duration ?? ''}
                                  onChange={(event) =>
                                    updateSelectedTrack((track) => ({
                                      ...track,
                                      duration: event.target.value
                                    }))
                                  }
                                />
                              </label>
                            </div>

                            <div className="admin-track-actions">
                              <label className="admin-checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedTrack.isFocusTrack}
                                  onChange={(event) =>
                                    updateSelectedTrack((track) => ({
                                      ...track,
                                      isFocusTrack: event.target.checked
                                    }))
                                  }
                                />
                                <span>{copy.focusTrack}</span>
                              </label>
                            </div>
                          </div>
                        ) : (
                          <p className="dashboard-list-subtitle">{copy.noTrackSelected}</p>
                        )}
                      </section>
                    </>
                  ) : (
                    <p className="dashboard-list-subtitle">{copy.noReleaseSelected}</p>
                  )}
                </section>
              </div>
            </>
          ) : (
            <p className="dashboard-list-subtitle">{copy.noArtistSelected}</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function AdminCatalogManager({ locale }: { locale: string }) {
  const localizedLocale: LocaleKey = locale === 'fr' ? 'fr' : 'en';
  const copy = copyByLocale[localizedLocale];

  return <AdminCatalogManagerContent locale={locale} copy={copy} />;
}

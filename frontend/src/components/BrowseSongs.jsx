import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Music2, User, Tag, SearchX } from 'lucide-react';

// Tolerant lookup that handles camelCase / PascalCase / lowercase keys
const get = (obj, ...keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null && obj?.[k] !== '') return obj[k];
  }
  return undefined;
};

export function BrowseSongs() {
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedArtist, setSelectedArtist] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [songsSnap, artistsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, 'SongDetails')),
          getDocs(collection(db, 'ArtistDetails')),
          getDocs(collection(db, 'CategoryDetails')),
        ]);
        if (!mounted) return;
        setSongs(songsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Sort artists by artistID desc (numeric), categories by categoryGroupId desc
        const sortDesc = (arr, ...keys) =>
          [...arr].sort((a, b) => {
            const av = Number(get(a, ...keys));
            const bv = Number(get(b, ...keys));
            const aOk = !isNaN(av);
            const bOk = !isNaN(bv);
            if (aOk && bOk) return bv - av;
            if (aOk) return -1;
            if (bOk) return 1;
            return 0;
          });

        setArtists(sortDesc(
          artistsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          'categoryGroupId', 'CategoryGroupID', 'artistID', 'ArtistID'
        ));
        setCategories(sortDesc(
          categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          'categoryGroupId', 'CategoryGroupID', 'categoryID', 'CategoryID'
        ));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Look up an artist or category Kannada label for a song's value
  const artistMap = useMemo(() => {
    const map = new Map();
    artists.forEach(a => {
      const id = String(get(a, 'artistID', 'ArtistID') ?? a.id);
      map.set(id, a);
      // also key by display name for legacy songArtist that stored a name
      const nameEN = get(a, 'ARTISTNAMEEN', 'artistNameEN');
      if (nameEN) map.set(String(nameEN).toLowerCase(), a);
    });
    return map;
  }, [artists]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(c => {
      const id = String(get(c, 'categoryID', 'CategoryID', 'categoryGroupId', 'CategoryGroupID') ?? c.id);
      map.set(id, c);
      const nameEN = get(c, 'categoryNameEN', 'CategoryNameEN');
      if (nameEN) map.set(String(nameEN).toLowerCase(), c);
    });
    return map;
  }, [categories]);

  // Does a song match a selected artist?
  const songMatchesArtist = (song, artistKey) => {
    if (artistKey === 'all') return true;
    const value = String(get(song, 'songArtist', 'ArtistID', 'artistID', 'ArtistName') ?? '').toLowerCase();
    const artist = artists.find(a => String(get(a, 'artistID', 'ArtistID') ?? a.id) === artistKey);
    if (!artist) return false;
    const candidates = [
      String(get(artist, 'artistID', 'ArtistID') ?? artist.id),
      String(get(artist, 'ARTISTNAMEEN', 'artistNameEN') ?? '').toLowerCase(),
      String(get(artist, 'ARTISTNAMEKN', 'artistNameKN', 'ARTISTNAMEKA', 'artistNameKA') ?? '').toLowerCase(),
      String(artist.id).toLowerCase(),
    ].filter(Boolean);
    return candidates.some(c => c === value || (c && value.includes(c)) || (value && c.includes(value)));
  };

  const songMatchesCategory = (song, categoryKey) => {
    if (categoryKey === 'all') return true;
    const value = String(get(song, 'songGroup', 'CategoryID', 'categoryID', 'CategoryName') ?? '').toLowerCase();
    const category = categories.find(c => String(get(c, 'categoryID', 'CategoryID', 'categoryGroupId', 'CategoryGroupID') ?? c.id) === categoryKey);
    if (!category) return false;
    const candidates = [
      String(get(category, 'categoryID', 'CategoryID') ?? category.id),
      String(get(category, 'categoryGroupId', 'CategoryGroupID') ?? ''),
      String(get(category, 'categoryNameEN', 'CategoryNameEN') ?? '').toLowerCase(),
      String(get(category, 'categoryNameKN', 'CategoryNameKN', 'categoryNameKA', 'CategoryNameKA') ?? '').toLowerCase(),
      String(category.id).toLowerCase(),
    ].filter(Boolean);
    return candidates.some(c => c === value || (c && value.includes(c)) || (value && c.includes(value)));
  };

  const filteredSongs = useMemo(() => {
    return songs.filter(s => songMatchesArtist(s, selectedArtist) && songMatchesCategory(s, selectedCategory));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, selectedArtist, selectedCategory, artists, categories]);

  const kannadaSongName = (song) =>
    get(song, 'songNameKA', 'songNameKN', 'SongNameKA', 'SongNameKN', 'songNameEN', 'SongNameEN') || '—';

  const artistLabel = (a) =>
    get(a, 'ARTISTNAMEKN', 'artistNameKN', 'ARTISTNAMEKA', 'artistNameKA', 'ARTISTNAMEEN', 'artistNameEN') ||
    String(get(a, 'artistID', 'ArtistID') ?? a.id);

  const categoryLabel = (c) =>
    get(c, 'categoryNameKN', 'CategoryNameKN', 'categoryNameKA', 'CategoryNameKA', 'categoryNameEN', 'CategoryNameEN') ||
    String(get(c, 'categoryID', 'CategoryID') ?? c.id);

  return (
    <div className="space-y-8 font-body">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-1">
          Explore
        </p>
        <h2 className="text-2xl tracking-tight font-bold text-zinc-900 font-heading">
          Browse Songs
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Filter songs by artist or category. Names shown in Kannada when available.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-zinc-200 rounded-xl shadow-sm p-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-2 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Artist
              </label>
              <Select value={selectedArtist} onValueChange={setSelectedArtist}>
                <SelectTrigger data-testid="browse-artist-select" className="rounded-lg">
                  <SelectValue>
                    {selectedArtist === 'all'
                      ? 'All artists'
                      : artistLabel(artists.find(a => String(get(a, 'artistID', 'ArtistID') ?? a.id) === selectedArtist) || {})}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All artists</SelectItem>
                  {artists.map(a => {
                    const key = String(get(a, 'artistID', 'ArtistID') ?? a.id);
                    return (
                      <SelectItem key={a.id} value={key}>
                        {artistLabel(a)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-2 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="browse-category-select" className="rounded-lg">
                  <SelectValue>
                    {selectedCategory === 'all'
                      ? 'All categories'
                      : categoryLabel(categories.find(c => String(get(c, 'categoryID', 'CategoryID', 'categoryGroupId', 'CategoryGroupID') ?? c.id) === selectedCategory) || {})}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => {
                    const key = String(get(c, 'categoryID', 'CategoryID', 'categoryGroupId', 'CategoryGroupID') ?? c.id);
                    return (
                      <SelectItem key={c.id} value={key}>
                        {categoryLabel(c)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-600">
              <span data-testid="browse-results-count" className="font-semibold text-primary">{filteredSongs.length}</span>
              {' '}song{filteredSongs.length === 1 ? '' : 's'} found
            </div>
          </div>

          <ul className="border border-zinc-200 rounded-xl bg-white shadow-sm divide-y divide-zinc-100 overflow-hidden">
            {filteredSongs.length === 0 ? (
              <li className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
                  <SearchX className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500">No songs match your filters.</p>
              </li>
            ) : (
              filteredSongs.map((s, idx) => (
                <li
                  key={s.id}
                  data-testid={`browse-song-${s.id}`}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-mono text-zinc-400 w-10 text-right">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base text-zinc-900 truncate">
                      {kannadaSongName(s)}
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                      songid: {get(s, 'songid', 'SongID') ?? '—'} · {get(s, 'songArtist', 'ArtistName') ?? '—'} · {get(s, 'songGroup', 'CategoryName') ?? '—'}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

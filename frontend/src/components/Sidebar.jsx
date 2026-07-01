import { useState, useEffect } from 'react';
import { Music, Library, Layers, Mic2, Tag, Tags, Globe, Music2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTIONS = [
  'ArtistCollections',
  'ArtistDetails',
  'CategoryDetails',
  'CategorySubDetails',
  'Languages',
  'SongDetails'
];

const COLLECTION_ICONS = {
  ArtistCollections: Layers,
  ArtistDetails: Mic2,
  CategoryDetails: Tag,
  CategorySubDetails: Tags,
  Languages: Globe,
  SongDetails: Music2,
};

export function Sidebar({ selectedCollection, onSelectCollection, view, onSelectView }) {
  const [collectionCounts, setCollectionCounts] = useState({});

  useEffect(() => {
    const unsubscribes = COLLECTIONS.map(collectionName => {
      return onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          setCollectionCounts(prev => ({
            ...prev,
            [collectionName]: snapshot.size
          }));
        },
        (error) => {
          console.error(`Error loading ${collectionName} count:`, error);
        }
      );
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  return (
    <aside className="w-64 fixed h-screen border-r border-zinc-200/70 bg-white flex flex-col font-body">
      <div className="h-16 px-5 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm shadow-primary/30">
          <Music className="w-[18px] h-[18px] text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm leading-tight tracking-tight font-bold text-zinc-900 font-heading truncate">
            Dasara Padagalu
          </h1>
          <p className="text-[11px] leading-tight text-zinc-400 truncate">Admin Panel</p>
        </div>
      </div>
      <div className="mx-5 h-px bg-zinc-100" />

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2 px-3">
          Explore
        </p>
        <ul className="space-y-0.5 mb-6">
          <li>
            <button
              data-testid="sidebar-nav-browse"
              onClick={() => onSelectView?.('browse')}
              className={`group relative w-full text-left pl-4 pr-3 py-2.5 text-sm rounded-lg transition-all duration-150 flex items-center gap-3 ${
                view === 'browse'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {view === 'browse' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-primary" />
              )}
              <Library className={`w-4 h-4 flex-shrink-0 ${view === 'browse' ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-500'}`} />
              <span className="truncate">Browse Songs</span>
            </button>
          </li>
        </ul>

        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2 px-3">
          Collections
        </p>
        <ul className="space-y-0.5">
          {COLLECTIONS.map((collectionName) => {
            const Icon = COLLECTION_ICONS[collectionName] || Layers;
            const active = view === 'manage' && selectedCollection === collectionName;
            return (
              <li key={collectionName}>
                <button
                  data-testid={`sidebar-nav-${collectionName.toLowerCase()}`}
                  onClick={() => {
                    onSelectView?.('manage');
                    onSelectCollection(collectionName);
                  }}
                  className={`group relative w-full text-left pl-4 pr-3 py-2.5 text-sm rounded-lg transition-all duration-150 flex items-center justify-between gap-2 ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-full bg-primary" />
                  )}
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : 'text-zinc-400 group-hover:text-zinc-500'}`} />
                    <span className="truncate">{collectionName}</span>
                  </span>
                  <span
                    className={`ml-2 px-2 py-0.5 text-[11px] font-mono rounded-full flex-shrink-0 ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {collectionCounts[collectionName] ?? '···'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-100 px-5 py-4 flex items-center gap-3">
        <img
          src="https://images.pexels.com/photos/20157010/pexels-photo-20157010.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100"
          alt=""
          aria-hidden="true"
          className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-800 truncate">Admin</p>
          <p className="text-[11px] text-zinc-400 truncate">Content Manager</p>
        </div>
      </div>
    </aside>
  );
}

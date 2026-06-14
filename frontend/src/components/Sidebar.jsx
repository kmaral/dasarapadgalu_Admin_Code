import { useState, useEffect } from 'react';
import { Database, Library } from 'lucide-react';
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
    <aside className="w-64 fixed h-screen border-r border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="h-16 border-b border-zinc-200 px-6 flex items-center">
        <Database className="w-6 h-6 text-[#002FA7] mr-3" />
        <h1 className="text-xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Firestore Manager
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">
          Explore
        </p>
        <ul className="space-y-1 mb-6">
          <li>
            <button
              data-testid="sidebar-nav-browse"
              onClick={() => onSelectView?.('browse')}
              className={`w-full text-left px-4 py-2 text-sm rounded-none transition-colors duration-150 flex items-center gap-3 ${
                view === 'browse'
                  ? 'bg-[#002FA7] text-white font-medium'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              <Library className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Browse Songs</span>
            </button>
          </li>
        </ul>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">
          Collections
        </p>
        <ul className="space-y-1">
          {COLLECTIONS.map((collectionName) => (
            <li key={collectionName}>
              <button
                data-testid={`sidebar-nav-${collectionName.toLowerCase()}`}
                onClick={() => {
                  onSelectView?.('manage');
                  onSelectCollection(collectionName);
                }}
                className={`w-full text-left px-4 py-2 text-sm rounded-none transition-colors duration-150 flex items-center justify-between ${
                  view === 'manage' && selectedCollection === collectionName
                    ? 'bg-[#002FA7] text-white font-medium'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                <span className="truncate">{collectionName}</span>
                <span 
                  className={`ml-2 px-2 py-0.5 text-xs font-mono rounded ${
                    view === 'manage' && selectedCollection === collectionName
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {collectionCounts[collectionName] ?? '...'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

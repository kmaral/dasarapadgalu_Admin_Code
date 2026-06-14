import { Database } from 'lucide-react';

const COLLECTIONS = [
  'ArtistCollections',
  'ArtistDetails',
  'CategoryDetails',
  'CategorySubDetails',
  'Languages',
  'SongDetails'
];

export function Sidebar({ selectedCollection, onSelectCollection }) {
  return (
    <aside className="w-64 fixed h-screen border-r border-zinc-200 bg-zinc-50 flex flex-col">
      <div className="h-16 border-b border-zinc-200 px-6 flex items-center">
        <Database className="w-6 h-6 text-[#002FA7] mr-3" />
        <h1 className="text-xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Firestore Manager
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4 px-2">
          Collections
        </p>
        <ul className="space-y-1">
          {COLLECTIONS.map((collection) => (
            <li key={collection}>
              <button
                data-testid={`sidebar-nav-${collection.toLowerCase()}`}
                onClick={() => onSelectCollection(collection)}
                className={`w-full text-left px-4 py-2 text-sm rounded-none transition-colors duration-150 ${
                  selectedCollection === collection
                    ? 'bg-[#002FA7] text-white font-medium'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                {collection}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

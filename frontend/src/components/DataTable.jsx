import { useState, useEffect, useMemo } from 'react';
import { collection, query, limit, onSnapshot, deleteDoc, doc, orderBy, startAfter, getDocs, writeBatch, updateDoc, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreVertical, Edit, Trash2, ArrowUpDown, Loader2, Search, X, AlertCircle, Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import Fuse from 'fuse.js';
import { advancedSearch } from '@/lib/advancedSearch';

// Parse "DD-MM-YYYY HH:MM:SS" → Date for accurate chronological ordering.
// Returns null if format isn't recognized (the caller treats null as "missing").
function parseLastTimestamp(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{1,2}):(\d{1,2}))?$/);
  if (!m) {
    // try generic Date parser as fallback (ISO etc.)
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = m;
  return new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss);
}

// Per-collection ID field used as the default sort.
const ID_FIELD_PER_COLLECTION = {
  SongDetails: 'songid',
  ArtistDetails: 'artistID',
  ArtistCollections: 'artistID',
  CategoryDetails: 'categoryGroupId',
  CategorySubDetails: 'categoryGroupId',
  Languages: 'languageID',
};

const getDefaultSort = (collName) => {
  const field = ID_FIELD_PER_COLLECTION[collName];
  return field ? `${field}-desc` : 'id-desc';
};

// Case/variant-tolerant field lookup on a document.
// Tries the canonical name and common case variants (camel, Pascal, all-caps).
const lookupField = (docObj, field) => {
  if (!field || !docObj) return undefined;
  if (docObj[field] !== undefined) return docObj[field];
  const lower = field.toLowerCase();
  const upper = field.toUpperCase();
  const pascal = field.charAt(0).toUpperCase() + field.slice(1);
  for (const k of [lower, upper, pascal]) {
    if (docObj[k] !== undefined) return docObj[k];
  }
  // last resort: scan keys ignoring case
  const target = lower;
  for (const k of Object.keys(docObj)) {
    if (k.toLowerCase() === target) return docObj[k];
  }
  return undefined;
};

const PAGE_SIZE = 50;
const CELL_TRUNCATE_LEN = 40;

// Truncates long values and shows the full text in a popover on click.
// Plain (short) values render inline so the grid feels normal.
function CellValue({ value, columnName }) {
  const raw = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '-');
  if (raw.length <= CELL_TRUNCATE_LEN) return <span>{raw}</span>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={`cell-popover-${columnName}`}
          className="text-left text-[#002FA7] hover:underline focus:outline-none"
          style={{ fontFamily: 'inherit' }}
        >
          {raw.slice(0, CELL_TRUNCATE_LEN)}…
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-w-[420px] max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-sm rounded-sm border-zinc-300"
        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{columnName}</div>
        {raw}
      </PopoverContent>
    </Popover>
  );
}

export function DataTable({ collectionName, onEditDocument, onDocumentCountChange }) {
  const [documents, setDocuments] = useState([]);
  const [sortedDocuments, setSortedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [columns, setColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [sortBy, setSortBy] = useState(getDefaultSort(collectionName));
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchAlgorithm, setSearchAlgorithm] = useState('advanced'); // 'advanced' or 'fuzzy'

  // Sync column order with current columns. Preserve user's saved order
  // from localStorage; append any new columns at the end; drop missing ones.
  useEffect(() => {
    if (columns.length === 0) {
      setColumnOrder([]);
      return;
    }
    const storageKey = `columnOrder:${collectionName}`;
    let saved = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch (e) { /* ignore */ }
    if (Array.isArray(saved)) {
      const valid = saved.filter((c) => columns.includes(c));
      const missing = columns.filter((c) => !valid.includes(c));
      setColumnOrder([...valid, ...missing]);
    } else {
      setColumnOrder(columns);
    }
  }, [columns, collectionName]);

  const persistColumnOrder = (order) => {
    setColumnOrder(order);
    try {
      localStorage.setItem(`columnOrder:${collectionName}`, JSON.stringify(order));
    } catch (e) { /* ignore quota errors */ }
  };

  const moveColumn = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= columnOrder.length) return;
    const next = [...columnOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistColumnOrder(next);
  };

  const resetColumnOrder = () => {
    persistColumnOrder(columns);
  };

  // Reset sort when switching collections
  useEffect(() => {
    setSortBy(getDefaultSort(collectionName));
  }, [collectionName]);

  // Load initial data with pagination - order by songid desc for SongDetails
  useEffect(() => {
    if (!collectionName) return;
    
    setLoading(true);
    setDocuments([]);
    setHasMore(true);
    setLastDoc(null);
    
    // For SongDetails, order by songid (descending - newest first).
    // For other collections, order by document ID (descending). Using documentId()
    // guarantees every doc is returned — older docs that may be missing
    // `createdAt` were being silently filtered out by `orderBy('createdAt')`.
    let q;
    if (collectionName === 'SongDetails') {
      q = query(
        collection(db, collectionName),
        orderBy('songid', 'desc'),
        limit(PAGE_SIZE)
      );
    } else {
      q = query(
        collection(db, collectionName),
        orderBy(documentId(), 'desc'),
        limit(PAGE_SIZE)
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDocuments(docs);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
      
      if (docs.length > 0) {
        const allKeys = new Set();
        docs.forEach(doc => {
          Object.keys(doc).forEach(key => allKeys.add(key));
        });
        let cols = Array.from(allKeys).filter(key => key !== 'id');
        if (collectionName === 'SongDetails') {
          cols = cols.filter(k => k.toLowerCase() !== 'playcount');
        }
        setColumns(cols);
      } else {
        setColumns([]);
      }
      
      setLoading(false);
    }, (error) => {
      // If index doesn't exist, fall back to a plain query (Firestore default = doc id asc)
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.log('Falling back to no orderBy');
        const fallbackQuery = query(
          collection(db, collectionName),
          limit(PAGE_SIZE)
        );
        
        onSnapshot(fallbackQuery, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setDocuments(docs);
          
          if (snapshot.docs.length > 0) {
            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === PAGE_SIZE);
          } else {
            setHasMore(false);
          }
          
          if (docs.length > 0) {
            const allKeys = new Set();
            docs.forEach(doc => {
              Object.keys(doc).forEach(key => allKeys.add(key));
            });
            let cols = Array.from(allKeys).filter(key => key !== 'id');
            if (collectionName === 'SongDetails') {
              cols = cols.filter(k => k.toLowerCase() !== 'playcount');
            }
            setColumns(cols);
          } else {
            setColumns([]);
          }
          
          setLoading(false);
        });
      } else if (error.code === 'unavailable') {
        // Transient network issue — Firebase auto-reconnects, no need to alarm user
        console.warn('Firestore temporarily unavailable, will retry automatically');
        setLoading(false);
      } else {
        console.error('Firestore error:', error);
        toast.error(`Failed to load documents: ${error.message || error.code || 'unknown'}`);
        setLoading(false);
      }
    });

    getDocs(collection(db, collectionName)).then((snap) => {
      setTotalCount(snap.size);
      onDocumentCountChange?.(snap.size);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return;
    
    setLoadingMore(true);
    try {
      let q;
      if (collectionName === 'SongDetails') {
        q = query(
          collection(db, collectionName),
          orderBy('songid', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, collectionName),
          orderBy(documentId(), 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }
      
      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDocuments(prev => [...prev, ...newDocs]);
      
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Load more error:', error);
      toast.error('Failed to load more documents');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const sorted = [...documents].sort((a, b) => {
      const [field, order] = sortBy.split('-');
      const dir = order === 'asc' ? 1 : -1;

      // Chronological sort for lasttimeStamp (handles "DD-MM-YYYY HH:MM:SS")
      if (field === 'lasttimeStamp') {
        const ad = parseLastTimestamp(lookupField(a, field));
        const bd = parseLastTimestamp(lookupField(b, field));
        if (ad && bd) return (ad.getTime() - bd.getTime()) * dir;
        if (ad && !bd) return -1;
        if (!ad && bd) return 1;
        return 0;
      }

      let aVal = field === 'id' ? a.id : lookupField(a, field);
      let bVal = field === 'id' ? b.id : lookupField(b, field);

      // Coerce numeric strings so "100" > "9" sorts numerically
      const aNum = typeof aVal === 'number' ? aVal : (typeof aVal === 'string' && /^\d+$/.test(aVal) ? Number(aVal) : null);
      const bNum = typeof bVal === 'number' ? bVal : (typeof bVal === 'string' && /^\d+$/.test(bVal) ? Number(bVal) : null);
      if (aNum !== null && bNum !== null) {
        if (aNum === bNum) return 0;
        return (aNum > bNum ? 1 : -1) * dir;
      }

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal === bVal) return 0;
      return (aVal > bVal ? 1 : -1) * dir;
    });
    
    setSortedDocuments(sorted);
  }, [documents, sortBy]);

  // Fuzzy search with Fuse.js
  const fuse = useMemo(() => {
    const searchKeys = [];
    
    // Add all text fields as search keys
    if (columns.length > 0) {
      columns.forEach(col => {
        // Search in all string fields, especially names in different languages
        if (col.toLowerCase().includes('name') || 
            col.toLowerCase().includes('title') ||
            col.toLowerCase().includes('artist') ||
            col.toLowerCase().includes('category') ||
            col.toLowerCase().includes('song') ||
            col.toLowerCase().includes('description')) {
          searchKeys.push(col);
        }
      });
    }
    
    // If no specific keys found, search all fields
    if (searchKeys.length === 0) {
      searchKeys.push(...columns);
    }
    
    return new Fuse(documents, {
      keys: searchKeys,
      threshold: 0.3, // 0 = exact match, 1 = match anything
      distance: 100,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      ignoreLocation: true,
      findAllMatches: true,
      includeScore: true
    });
  }, [documents, columns]);

  // Get searchable fields
  const searchableFields = useMemo(() => {
    if (columns.length === 0) return [];
    
    const fields = [];
    columns.forEach(col => {
      if (col.toLowerCase().includes('name') || 
          col.toLowerCase().includes('title') ||
          col.toLowerCase().includes('artist') ||
          col.toLowerCase().includes('category') ||
          col.toLowerCase().includes('song') ||
          col.toLowerCase().includes('description')) {
        fields.push(col);
      }
    });
    
    return fields.length > 0 ? fields : columns.slice(0, 5);
  }, [columns]);

  // Handle search with selected algorithm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    if (searchAlgorithm === 'advanced') {
      // Use advanced search with N-gram, trigram, and phonetic matching
      const results = advancedSearch(searchQuery, documents, searchableFields);
      setSearchResults(results.map(r => r.document));
    } else {
      // Use Fuse.js fuzzy search
      const results = fuse.search(searchQuery);
      setSearchResults(results.map(result => result.item));
    }
  }, [searchQuery, documents, searchableFields, searchAlgorithm]);

  // Display either search results or sorted documents
  const displayDocuments = searchQuery.trim() ? searchResults : sortedDocuments;

  const confirmDelete = (docId) => {
    setDocToDelete(docId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    
    try {
      await deleteDoc(doc(db, collectionName, docToDelete));
      toast.success('Document deleted successfully');
      setDocuments(prev => prev.filter(d => d.id !== docToDelete));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete document: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          No documents found. Add your first document to get started.
        </p>
      </div>
    );
  }

  const sortableColumns = (() => {
    const idField = ID_FIELD_PER_COLLECTION[collectionName];
    const extras = columns.filter(col =>
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('created') ||
      col.toLowerCase().includes('updated')
    );
    const ordered = ['id'];
    if (idField && !ordered.includes(idField)) ordered.push(idField);
    extras.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
    return ordered;
  })();

  return (
    <>
      <div className="mb-4 space-y-4">
        {/* Search Bar with Algorithm Selector */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Search with N-gram, Trigram & Phonetic algorithms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-none border-zinc-300 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7]"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            />
            {searchQuery && (
              <button
                data-testid="clear-search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <Select value={searchAlgorithm} onValueChange={setSearchAlgorithm}>
            <SelectTrigger data-testid="algorithm-select" className="w-[200px] rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advanced">Advanced (N-gram + Phonetic)</SelectItem>
              <SelectItem value="fuzzy">Fuzzy Search</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {searchQuery && (
          <div className="flex items-center justify-between text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <div className="text-zinc-600">
              Found <span className="font-semibold text-[#002FA7]">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''} for "<span className="font-medium">{searchQuery}</span>"
              <span className="ml-2 text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                {searchAlgorithm === 'advanced' ? '🧠 N-gram + Trigram + Phonetic' : '🔍 Fuzzy Match'}
              </span>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-600" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="sort-select" className="w-[200px] rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortableColumns.map(col => (
                  <div key={col}>
                    <SelectItem value={`${col}-desc`}>{col} (Newest first)</SelectItem>
                    <SelectItem value={`${col}-asc`}>{col} (Oldest first)</SelectItem>
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-zinc-600" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {searchQuery ? `Showing ${displayDocuments.length} of ${totalCount}` : `Showing ${documents.length} of ${totalCount} documents`}
            </div>
            <Popover open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  data-testid="columns-settings-button"
                  type="button"
                  variant="outline"
                  className="rounded-none h-9 border-zinc-300"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 max-h-[420px] overflow-auto rounded-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Rearrange columns</div>
                  <button
                    type="button"
                    onClick={resetColumnOrder}
                    className="text-xs text-[#002FA7] hover:underline"
                    data-testid="columns-reset"
                  >
                    Reset
                  </button>
                </div>
                <ul className="space-y-1">
                  {columnOrder.map((col, idx) => (
                    <li
                      key={col}
                      data-testid={`column-row-${col}`}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-sm"
                    >
                      <span className="text-sm text-zinc-800 truncate">{col}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          data-testid={`column-up-${col}`}
                          onClick={() => moveColumn(idx, -1)}
                          disabled={idx === 0}
                          className="h-6 w-6 inline-flex items-center justify-center text-zinc-600 hover:text-[#002FA7] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move ${col} up`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          data-testid={`column-down-${col}`}
                          onClick={() => moveColumn(idx, 1)}
                          disabled={idx === columnOrder.length - 1}
                          className="h-6 w-6 inline-flex items-center justify-center text-zinc-600 hover:text-[#002FA7] disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`Move ${col} down`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-sm bg-white overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sticky left-0 bg-zinc-50 z-10 w-16 text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>ID</TableHead>
              {columnOrder.map((col) => (
                <TableHead key={col} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {col}
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right sticky right-0 bg-zinc-50 z-10" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocuments.map((doc, index) => (
              <TableRow key={doc.id} data-testid={`table-row-${doc.id}`} className="hover:bg-zinc-50">
                <TableCell className="font-semibold text-sm text-zinc-700 sticky left-0 bg-white z-10 text-center">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs text-zinc-600">{doc.id}</TableCell>
                {columnOrder.map((col) => (
                  <TableCell key={col} className="text-sm text-zinc-800 whitespace-nowrap" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    <CellValue value={doc[col]} columnName={col} />
                  </TableCell>
                ))}
                <TableCell className="text-right sticky right-0 bg-white z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        data-testid={`actions-menu-${doc.id}`}
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        data-testid={`edit-document-${doc.id}`}
                        onClick={() => onEditDocument(doc)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-testid={`delete-document-${doc.id}`}
                        onClick={() => confirmDelete(doc.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasMore && !searchQuery && (
        <div className="mt-6 text-center">
          <Button
            data-testid="load-more-button"
            onClick={loadMore}
            disabled={loadingMore}
            className="bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none px-8"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${totalCount - documents.length} remaining)`
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: 'Chivo, sans-serif' }}>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

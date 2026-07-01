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
import { Checkbox } from '@/components/ui/checkbox';
import { MoreVertical, Edit, Trash2, ArrowUpDown, Loader2, Search, X, AlertCircle, Settings2, ArrowUp, ArrowDown, Inbox, Plus, Eye, EyeOff } from 'lucide-react';
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
          className="text-left text-primary hover:underline focus:outline-none"
        >
          {raw.slice(0, CELL_TRUNCATE_LEN)}…
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-w-[420px] max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-sm rounded-lg border-zinc-200 font-body"
      >
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">{columnName}</div>
        {raw}
      </PopoverContent>
    </Popover>
  );
}

export function DataTable({ collectionName, onEditDocument, onDocumentCountChange, onAddDocument }) {
  const [documents, setDocuments] = useState([]);
  const [sortedDocuments, setSortedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [columns, setColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState(new Set());
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [columnFilterText, setColumnFilterText] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState(getDefaultSort(collectionName));
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchAlgorithm, setSearchAlgorithm] = useState('advanced'); // 'advanced' or 'fuzzy'
  // Full dataset cache (used so search can cover every doc, not only the
  // currently paginated/loaded ones). Populated alongside the total-count fetch.
  const [allDocuments, setAllDocuments] = useState([]);

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

    const visKey = `columnHidden:${collectionName}`;
    try {
      const raw = localStorage.getItem(visKey);
      const savedHidden = raw ? JSON.parse(raw) : [];
      setHiddenColumns(new Set(Array.isArray(savedHidden) ? savedHidden.filter((c) => columns.includes(c)) : []));
    } catch (e) {
      setHiddenColumns(new Set());
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

  const persistHiddenColumns = (set) => {
    setHiddenColumns(set);
    try {
      localStorage.setItem(`columnHidden:${collectionName}`, JSON.stringify(Array.from(set)));
    } catch (e) { /* ignore quota errors */ }
  };

  const toggleColumnVisibility = (col) => {
    const next = new Set(hiddenColumns);
    if (next.has(col)) next.delete(col); else next.add(col);
    persistHiddenColumns(next);
  };

  const showAllColumns = () => persistHiddenColumns(new Set());
  const hideAllColumns = () => persistHiddenColumns(new Set(columnOrder));

  const visibleColumnOrder = columnOrder.filter((c) => !hiddenColumns.has(c));

  // Reset sort and selection when switching collections
  useEffect(() => {
    setSortBy(getDefaultSort(collectionName));
    setSelectedIds(new Set());
  }, [collectionName]);

  // Load initial data.
  // SongDetails: paginated (50 at a time, orderBy songid desc).
  // Other collections: fetch all docs (no pagination, no Load More).
  useEffect(() => {
    if (!collectionName) return;
    
    setLoading(true);
    setDocuments([]);
    setAllDocuments([]);
    setHasMore(collectionName === 'SongDetails');
    setLastDoc(null);
    
    const isPaginated = collectionName === 'SongDetails';

    const q = isPaginated
      ? query(
          collection(db, collectionName),
          orderBy('songid', 'desc'),
          limit(PAGE_SIZE)
        )
      : query(collection(db, collectionName));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDocuments(docs);
      
      if (isPaginated) {
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === PAGE_SIZE);
        } else {
          setHasMore(false);
        }
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
      if (error.code === 'unavailable') {
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
      // Cache full dataset for search across all docs (not just paginated ones)
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllDocuments(all);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || collectionName !== 'SongDetails') return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, collectionName),
        orderBy('songid', 'desc'),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      
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
    
    return new Fuse(allDocuments.length > 0 ? allDocuments : documents, {
      keys: searchKeys,
      threshold: 0.3, // 0 = exact match, 1 = match anything
      distance: 100,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      ignoreLocation: true,
      findAllMatches: true,
      includeScore: true
    });
  }, [documents, allDocuments, columns]);

  // Get searchable fields — derive from the full dataset (when cached) so we
  // don't miss fields present only in non-paginated docs.
  const searchableFields = useMemo(() => {
    const pool = allDocuments.length > 0 ? allDocuments : null;
    const fieldSet = new Set(columns);
    if (pool) {
      pool.forEach((d) => Object.keys(d).forEach((k) => { if (k !== 'id') fieldSet.add(k); }));
    }
    const allCols = Array.from(fieldSet);
    if (allCols.length === 0) return [];
    
    const fields = [];
    allCols.forEach(col => {
      const lower = col.toLowerCase();
      if (lower.includes('name') ||
          lower.includes('title') ||
          lower.includes('artist') ||
          lower.includes('category') ||
          lower.includes('song') ||
          lower.includes('group') ||
          lower.includes('description') ||
          lower.includes('lyric')) {
        fields.push(col);
      }
    });
    return fields.length > 0 ? fields : allCols.slice(0, 5);
  }, [columns, allDocuments]);

  // Handle search with selected algorithm — search the full dataset when available.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Use the cached full dataset so search covers ALL documents,
    // not just the currently paginated/loaded ones.
    const searchPool = allDocuments.length > 0 ? allDocuments : documents;

    if (searchAlgorithm === 'advanced') {
      const results = advancedSearch(searchQuery, searchPool, searchableFields);
      setSearchResults(results.map(r => r.document));
    } else {
      const results = fuse.search(searchQuery);
      setSearchResults(results.map(result => result.item));
    }
  }, [searchQuery, documents, allDocuments, searchableFields, searchAlgorithm, fuse]);

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
      setSelectedIds(prev => { const next = new Set(prev); next.delete(docToDelete); return next; });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete document: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setDocToDelete(null);
    }
  };

  const handleSelectRow = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const allDisplaySelected = displayDocuments.length > 0 && displayDocuments.every(d => selectedIds.has(d.id));
  const someDisplaySelected = displayDocuments.some(d => selectedIds.has(d.id));

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        displayDocuments.forEach(d => next.add(d.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        displayDocuments.forEach(d => next.delete(d.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      // Firestore writeBatch supports up to 500 ops per batch
      const BATCH_LIMIT = 500;
      for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        ids.slice(i, i + BATCH_LIMIT).forEach(id => batch.delete(doc(db, collectionName, id)));
        await batch.commit();
      }
      toast.success(`Deleted ${ids.length} document${ids.length !== 1 ? 's' : ''} successfully`);
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setAllDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(`Failed to delete documents: ${error.message}`);
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-zinc-200 rounded-xl shadow-sm bg-white p-5 space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-zinc-200 rounded-xl bg-white font-body">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Inbox className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-zinc-800">No documents yet</p>
        <p className="text-sm text-zinc-500 mt-1 max-w-xs">
          Add your first document to {collectionName} to get started.
        </p>
        {onAddDocument && (
          <Button
            onClick={onAddDocument}
            className="mt-5 bg-primary text-white hover:bg-primary/90 rounded-lg px-5 shadow-sm shadow-primary/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        )}
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

  const [currentSortField, currentSortDir] = sortBy.split('-');
  const filteredColumnOrder = columnFilterText.trim()
    ? columnOrder.filter((c) => c.toLowerCase().includes(columnFilterText.trim().toLowerCase()))
    : columnOrder;

  return (
    <>
      <div className="mb-4 space-y-4 font-body">
        {/* Search Bar with Algorithm Selector */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              data-testid="search-input"
              type="text"
              placeholder="Search with N-gram, Trigram & Phonetic algorithms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-lg border-zinc-200 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                data-testid="clear-search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select value={searchAlgorithm} onValueChange={setSearchAlgorithm}>
            <SelectTrigger data-testid="algorithm-select" className="w-[200px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advanced">Advanced (N-gram + Phonetic)</SelectItem>
              <SelectItem value="fuzzy">Fuzzy Search</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between text-sm">
            <div className="text-zinc-600">
              Found <span className="font-semibold text-primary">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''} for "<span className="font-medium">{searchQuery}</span>"
              <span className="ml-2 text-xs px-2 py-1 bg-zinc-100 text-zinc-600 rounded-full">
                {searchAlgorithm === 'advanced' ? '🧠 N-gram + Trigram + Phonetic' : '🔍 Fuzzy Match'}
              </span>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span className="text-sm text-zinc-600 flex-shrink-0">Sort by:</span>
            <Select
              value={currentSortField}
              onValueChange={(field) => setSortBy(`${field}-${currentSortDir}`)}
            >
              <SelectTrigger data-testid="sort-field-select" className="w-[180px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortableColumns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              data-testid="sort-direction-toggle"
              onClick={() => setSortBy(`${currentSortField}-${currentSortDir === 'asc' ? 'desc' : 'asc'}`)}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              title={currentSortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {currentSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              {currentSortDir === 'asc' ? 'Oldest first' : 'Newest first'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button
                data-testid="bulk-delete-button"
                variant="destructive"
                className="rounded-lg h-9"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <div className="text-sm text-zinc-600">
              {searchQuery ? `Showing ${displayDocuments.length} of ${totalCount}` : `Showing ${documents.length} of ${totalCount} documents`}
            </div>
            <Popover open={columnSettingsOpen} onOpenChange={(open) => { setColumnSettingsOpen(open); if (!open) setColumnFilterText(''); }}>
              <PopoverTrigger asChild>
                <Button
                  data-testid="columns-settings-button"
                  type="button"
                  variant="outline"
                  className="rounded-lg h-9"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Columns
                  {hiddenColumns.size > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[11px] font-mono bg-primary/10 text-primary rounded-full">
                      {visibleColumnOrder.length}/{columnOrder.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 rounded-lg font-body overflow-hidden">
                <div className="p-3 border-b border-zinc-100 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <Input
                      data-testid="columns-filter-input"
                      value={columnFilterText}
                      onChange={(e) => setColumnFilterText(e.target.value)}
                      placeholder="Filter columns..."
                      className="h-8 pl-8 rounded-md text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{visibleColumnOrder.length} of {columnOrder.length} shown</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={showAllColumns} className="text-primary hover:underline" data-testid="columns-show-all">
                        Show all
                      </button>
                      <button type="button" onClick={hideAllColumns} className="text-zinc-500 hover:underline" data-testid="columns-hide-all">
                        Hide all
                      </button>
                      <button type="button" onClick={resetColumnOrder} className="text-zinc-500 hover:underline" data-testid="columns-reset">
                        Reset order
                      </button>
                    </div>
                  </div>
                </div>
                <ul className="max-h-[320px] overflow-y-auto p-2 space-y-1">
                  {filteredColumnOrder.length === 0 && (
                    <li className="text-sm text-zinc-400 text-center py-6">No columns match "{columnFilterText}"</li>
                  )}
                  {filteredColumnOrder.map((col) => {
                    const idx = columnOrder.indexOf(col);
                    const visible = !hiddenColumns.has(col);
                    return (
                      <li
                        key={col}
                        data-testid={`column-row-${col}`}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${visible ? 'bg-zinc-50 hover:bg-zinc-100' : 'bg-white hover:bg-zinc-50'}`}
                      >
                        <button
                          type="button"
                          data-testid={`column-toggle-${col}`}
                          onClick={() => toggleColumnVisibility(col)}
                          className={`h-6 w-6 inline-flex items-center justify-center flex-shrink-0 rounded ${visible ? 'text-primary' : 'text-zinc-300 hover:text-zinc-500'}`}
                          aria-label={`${visible ? 'Hide' : 'Show'} ${col}`}
                        >
                          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <span className={`text-sm truncate flex-1 ${visible ? 'text-zinc-800' : 'text-zinc-400'}`}>{col}</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            data-testid={`column-up-${col}`}
                            onClick={() => moveColumn(idx, -1)}
                            disabled={idx === 0}
                            className="h-6 w-6 inline-flex items-center justify-center text-zinc-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Move ${col} up`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            data-testid={`column-down-${col}`}
                            onClick={() => moveColumn(idx, 1)}
                            disabled={idx === columnOrder.length - 1}
                            className="h-6 w-6 inline-flex items-center justify-center text-zinc-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`Move ${col} down`}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl shadow-sm bg-white overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="sticky left-0 bg-zinc-50 z-10 w-10 text-center">
                <Checkbox
                  data-testid="select-all-checkbox"
                  checked={allDisplaySelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someDisplaySelected && !allDisplaySelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 sticky left-10 bg-zinc-50 z-10 w-16 text-center font-body">#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 font-body">ID</TableHead>
              {visibleColumnOrder.map((col) => (
                <TableHead key={col} className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 whitespace-nowrap font-body">
                  {col}
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 text-right sticky right-0 bg-zinc-50 z-10 font-body">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocuments.map((doc, index) => (
              <TableRow key={doc.id} data-testid={`table-row-${doc.id}`} className={`hover:bg-zinc-50 transition-colors ${selectedIds.has(doc.id) ? 'bg-primary/5' : ''}`}>
                <TableCell className="sticky left-0 z-10 text-center" style={{ backgroundColor: selectedIds.has(doc.id) ? 'hsl(var(--accent))' : 'white' }}>
                  <Checkbox
                    data-testid={`select-row-${doc.id}`}
                    checked={selectedIds.has(doc.id)}
                    onCheckedChange={(checked) => handleSelectRow(doc.id, checked)}
                    aria-label={`Select row ${index + 1}`}
                  />
                </TableCell>
                <TableCell className="font-semibold text-sm text-zinc-700 sticky left-10 z-10 text-center" style={{ backgroundColor: selectedIds.has(doc.id) ? 'hsl(var(--accent))' : 'white' }}>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs text-zinc-600">{doc.id}</TableCell>
                {visibleColumnOrder.map((col) => (
                  <TableCell key={col} className="text-sm text-zinc-800 whitespace-nowrap font-body">
                    <CellValue value={doc[col]} columnName={col} />
                  </TableCell>
                ))}
                <TableCell className="text-right sticky right-0 z-10" style={{ backgroundColor: selectedIds.has(doc.id) ? 'hsl(var(--accent))' : 'white' }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        data-testid={`actions-menu-${doc.id}`}
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg"
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
            variant="outline"
            className="rounded-lg px-8 font-body"
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
        <AlertDialogContent className="rounded-xl font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-xl font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete <span className="font-semibold text-zinc-900">{selectedIds.size} selected record{selectedIds.size !== 1 ? 's' : ''}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-bulk-delete-button"
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Delete {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

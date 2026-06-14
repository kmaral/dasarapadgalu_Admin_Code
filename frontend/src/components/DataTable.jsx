import { useState, useEffect, useMemo } from 'react';
import { collection, query, limit, onSnapshot, deleteDoc, doc, orderBy, startAfter, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, ArrowUpDown, Loader2, Search, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import Fuse from 'fuse.js';
import { advancedSearch } from '@/lib/advancedSearch';

const PAGE_SIZE = 50;

export function DataTable({ collectionName, onEditDocument, onDocumentCountChange, onDocumentsChange }) {
  const [documents, setDocuments] = useState([]);
  const [sortedDocuments, setSortedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [columns, setColumns] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [sortBy, setSortBy] = useState('id-desc');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchAlgorithm, setSearchAlgorithm] = useState('advanced'); // 'advanced' or 'fuzzy'

  // Load initial data with pagination - order by songid desc for SongDetails
  useEffect(() => {
    if (!collectionName) return;
    
    setLoading(true);
    setDocuments([]);
    setHasMore(true);
    setLastDoc(null);
    
    // For SongDetails, order by songid (descending - newest first)
    let q;
    if (collectionName === 'SongDetails') {
      q = query(
        collection(db, collectionName),
        orderBy('songid', 'desc'),
        limit(PAGE_SIZE)
      );
    } else {
      // For other collections, order by createdAt
      q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDocuments(docs);
      onDocumentsChange?.(docs);
      
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
        setColumns(Array.from(allKeys).filter(key => key !== 'id'));
      } else {
        setColumns([]);
      }
      
      setLoading(false);
    }, (error) => {
      // If index doesn't exist, fall back to createdAt only
      if (error.code === 'failed-precondition' || error.message.includes('index')) {
        console.log('Falling back to createdAt ordering');
        const fallbackQuery = query(
          collection(db, collectionName),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
        
        onSnapshot(fallbackQuery, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setDocuments(docs);
          onDocumentsChange?.(docs);
          
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
            setColumns(Array.from(allKeys).filter(key => key !== 'id'));
          } else {
            setColumns([]);
          }
          
          setLoading(false);
        });
      } else {
        console.error('Firestore error:', error);
        toast.error('Failed to load documents');
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
          orderBy('createdAt', 'desc'),
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
      
      let aVal = a[field];
      let bVal = b[field];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
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

  const sortableColumns = ['id', ...columns.filter(col => 
    col.toLowerCase().includes('time') || 
    col.toLowerCase().includes('date') || 
    col.toLowerCase().includes('created') ||
    col.toLowerCase().includes('updated')
  )];

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
          
          <div className="text-sm text-zinc-600" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {searchQuery ? `Showing ${displayDocuments.length} of ${totalCount}` : `Showing ${documents.length} of ${totalCount} documents`}
          </div>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-sm bg-white overflow-x-auto max-w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sticky left-0 bg-zinc-50 z-10 w-16 text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>#</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 sticky left-16 bg-zinc-50 z-10" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>ID</TableHead>
              {columns.map((col) => (
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
                <TableCell className="font-mono text-xs text-zinc-600 sticky left-16 bg-white z-10">{doc.id}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="text-sm text-zinc-800 whitespace-nowrap" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {typeof doc[col] === 'object' ? JSON.stringify(doc[col]) : String(doc[col] ?? '-')}
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

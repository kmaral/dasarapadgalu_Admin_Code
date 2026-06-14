import { useState, useEffect } from 'react';
import { collection, query, limit, onSnapshot, deleteDoc, doc, orderBy, startAfter, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    if (!collectionName) return;
    
    setLoading(true);
    setDocuments([]);
    setHasMore(true);
    setLastDoc(null);
    
    const q = query(
      collection(db, collectionName),
      orderBy('__name__'),
      limit(PAGE_SIZE)
    );
    
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
      console.error('Firestore error:', error);
      toast.error('Failed to load documents');
      setLoading(false);
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
      const q = query(
        collection(db, collectionName),
        orderBy('__name__'),
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
      <div className="mb-4 flex items-center justify-between">
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
          Showing {documents.length} of {totalCount} documents
        </div>
      </div>

      <div className="border border-zinc-200 rounded-sm bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>ID</TableHead>
              {columns.slice(0, 8).map((col) => (
                <TableHead key={col} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {col}
                </TableHead>
              ))}
              <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDocuments.map((doc) => (
              <TableRow key={doc.id} data-testid={`table-row-${doc.id}`} className="hover:bg-zinc-50">
                <TableCell className="font-mono text-xs text-zinc-600">{doc.id}</TableCell>
                {columns.slice(0, 8).map((col) => (
                  <TableCell key={col} className="text-sm text-zinc-800 max-w-[200px] truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    {typeof doc[col] === 'object' ? JSON.stringify(doc[col]) : String(doc[col] ?? '-')}
                  </TableCell>
                ))}
                <TableCell className="text-right">
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

      {hasMore && (
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

import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function DataTable({ collectionName, onEditDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    if (!collectionName) return;
    
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setDocuments(docs);
        
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
      },
      (error) => {
        console.error('Firestore error:', error);
        toast.error('Failed to load documents');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]);

  const handleDelete = async (docId) => {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
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

  return (
    <div className="border border-zinc-200 rounded-sm bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 hover:bg-zinc-50">
            <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>ID</TableHead>
            {columns.map((col) => (
              <TableHead key={col} className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                {col}
              </TableHead>
            ))}
            <TableHead className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 text-right" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} data-testid={`table-row-${doc.id}`} className="hover:bg-zinc-50">
              <TableCell className="font-mono text-xs text-zinc-600">{doc.id}</TableCell>
              {columns.map((col) => (
                <TableCell key={col} className="text-sm text-zinc-800" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
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
                      onClick={() => handleDelete(doc.id)}
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
  );
}

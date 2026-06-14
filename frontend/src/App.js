import { useState } from 'react';
import '@/App.css';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DataTable } from '@/components/DataTable';
import { ManualEntrySheet } from '@/components/ManualEntrySheet';
import { BulkUploadDialog } from '@/components/BulkUploadDialog';
import { Toaster } from '@/components/ui/sonner';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function App() {
  const [selectedCollection, setSelectedCollection] = useState('ArtistCollections');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [documentCount, setDocumentCount] = useState(0);

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setManualEntryOpen(true);
  };

  const handleCloseManualEntry = () => {
    setManualEntryOpen(false);
    setTimeout(() => setEditingDoc(null), 300);
  };

  const handleExport = async (format) => {
    const toastId = toast.loading(`Fetching all ${selectedCollection} documents...`);

    try {
      // Fetch ALL documents from Firestore (not just paginated/loaded ones)
      const snapshot = await getDocs(collection(db, selectedCollection));
      const exportDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (exportDocs.length === 0) {
        toast.error('No documents to export', { id: toastId });
        return;
      }

      const filename = `${selectedCollection}_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Collect a union of all keys so CSV columns aren't missed for sparse docs
        const allKeys = new Set();
        exportDocs.forEach((d) => Object.keys(d).forEach((k) => allKeys.add(k)));
        const csv = Papa.unparse(exportDocs, { columns: Array.from(allKeys) });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        toast.success(`Exported ${exportDocs.length} documents as CSV`, { id: toastId });
      } else if (format === 'json') {
        const json = JSON.stringify(exportDocs, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.json`;
        link.click();
        toast.success(`Exported ${exportDocs.length} documents as JSON`, { id: toastId });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export: ${error.message}`, { id: toastId });
    }
  };

  return (
    <div className="App">
      <Sidebar
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
      />
      
      <div className="ml-64 flex-1 min-h-screen bg-white">
        <Header
          collectionName={selectedCollection}
          documentCount={documentCount}
          onOpenManualEntry={() => setManualEntryOpen(true)}
          onOpenBulkUpload={() => setBulkUploadOpen(true)}
          onExport={handleExport}
        />
        
        <main className="p-8">
          <DataTable
            collectionName={selectedCollection}
            onEditDocument={handleEditDocument}
            onDocumentCountChange={(count) => {
              setDocumentCount(count);
            }}
          />
        </main>
      </div>

      <ManualEntrySheet
        isOpen={manualEntryOpen}
        onClose={handleCloseManualEntry}
        collectionName={selectedCollection}
        editingDoc={editingDoc}
      />

      <BulkUploadDialog
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        collectionName={selectedCollection}
      />

      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;

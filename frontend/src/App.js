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

function App() {
  const [selectedCollection, setSelectedCollection] = useState('ArtistCollections');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [allDocuments, setAllDocuments] = useState([]);

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setManualEntryOpen(true);
  };

  const handleCloseManualEntry = () => {
    setManualEntryOpen(false);
    setTimeout(() => setEditingDoc(null), 300);
  };

  const handleExport = (format) => {
    if (allDocuments.length === 0) {
      toast.error('No documents to export');
      return;
    }

    const filename = `${selectedCollection}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const csv = Papa.unparse(allDocuments);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();
      toast.success(`Exported ${allDocuments.length} documents as CSV`);
    } else if (format === 'json') {
      const json = JSON.stringify(allDocuments, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.json`;
      link.click();
      toast.success(`Exported ${allDocuments.length} documents as JSON`);
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
            onDocumentsChange={(docs) => {
              setAllDocuments(docs);
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

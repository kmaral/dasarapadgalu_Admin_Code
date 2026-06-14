import { useState } from 'react';
import '@/App.css';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DataTable } from '@/components/DataTable';
import { ManualEntrySheet } from '@/components/ManualEntrySheet';
import { BulkUploadDialog } from '@/components/BulkUploadDialog';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [selectedCollection, setSelectedCollection] = useState('ArtistCollections');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const handleEditDocument = (doc) => {
    setEditingDoc(doc);
    setManualEntryOpen(true);
  };

  const handleCloseManualEntry = () => {
    setManualEntryOpen(false);
    setTimeout(() => setEditingDoc(null), 300);
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
          onOpenManualEntry={() => setManualEntryOpen(true)}
          onOpenBulkUpload={() => setBulkUploadOpen(true)}
        />
        
        <main className="p-8">
          <DataTable
            collectionName={selectedCollection}
            onEditDocument={handleEditDocument}
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

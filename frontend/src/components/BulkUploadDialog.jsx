import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Upload, FileText } from 'lucide-react';

export function BulkUploadDialog({ isOpen, onClose, collectionName }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (error) => reject(error)
        });
      });
    } else if (fileExtension === 'json') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            resolve(Array.isArray(json) ? json : [json]);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } else {
      throw new Error('Unsupported file format. Please use CSV or JSON.');
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const data = await processFile(file);
      
      if (!data || data.length === 0) {
        toast.error('No data found in file');
        return;
      }

      const batch = writeBatch(db);
      const collectionRef = collection(db, collectionName);
      
      data.forEach((item) => {
        const docRef = doc(collectionRef);
        batch.set(docRef, item);
      });

      await batch.commit();
      toast.success(`Successfully uploaded ${data.length} documents`);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-none">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Bulk Upload
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Upload CSV or JSON files to add multiple documents to <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{collectionName}</span>
          </DialogDescription>
        </DialogHeader>

        <div
          data-testid="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-6 border-2 border-dashed rounded-sm py-12 text-center transition-colors duration-150 ${
            dragActive
              ? 'border-[#002FA7] bg-blue-50'
              : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-12 h-12 mx-auto text-zinc-400 mb-4" />
          <p className="text-sm text-zinc-600 mb-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Drag and drop your file here, or
          </p>
          <label>
            <input
              data-testid="file-input"
              type="file"
              accept=".csv,.json"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              asChild
              className="bg-[#002FA7] text-white hover:bg-[#002277] rounded-none px-6"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              disabled={uploading}
            >
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Browse Files'}
              </span>
            </Button>
          </label>
          <p className="text-xs text-zinc-500 mt-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Supported formats: CSV, JSON
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

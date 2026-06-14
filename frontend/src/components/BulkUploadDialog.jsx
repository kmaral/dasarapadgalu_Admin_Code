import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Upload, FileText, ClipboardPaste } from 'lucide-react';

export function BulkUploadDialog({ isOpen, onClose, collectionName }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');

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

  const processPastedText = () => {
    try {
      // Try parsing as JSON first
      const json = JSON.parse(pastedText);
      return Array.isArray(json) ? json : [json];
    } catch (jsonError) {
      // If JSON fails, try parsing as CSV
      try {
        const result = Papa.parse(pastedText, {
          header: true,
          skipEmptyLines: true
        });
        return result.data;
      } catch (csvError) {
        throw new Error('Invalid format. Please paste valid JSON or CSV data.');
      }
    }
  };

  const uploadData = async (data) => {
    if (!data || data.length === 0) {
      toast.error('No data found');
      return;
    }

    const batch = writeBatch(db);
    const collectionRef = collection(db, collectionName);
    const timestamp = new Date();
    
    data.forEach((item) => {
      const docRef = doc(collectionRef);
      const itemWithTimestamp = {
        ...item,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      batch.set(docRef, itemWithTimestamp);
    });

    await batch.commit();
    toast.success(`Successfully uploaded ${data.length} documents`);
    setPastedText('');
    onClose();
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const data = await processFile(file);
      await uploadData(data);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePasteUpload = async () => {
    if (!pastedText.trim()) {
      toast.error('Please paste some data first');
      return;
    }

    setUploading(true);
    try {
      const data = processPastedText();
      await uploadData(data);
    } catch (error) {
      console.error('Paste upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
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
    if (file) handleFileUpload(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-none">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Bulk Upload
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Upload multiple documents to <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{collectionName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" data-testid="file-upload-tab">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="paste" data-testid="paste-json-tab">
              <ClipboardPaste className="w-4 h-4 mr-2" />
              Paste JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-6">
            <div
              data-testid="drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-sm py-12 text-center transition-colors duration-150 ${
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
          </TabsContent>

          <TabsContent value="paste" className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2 block" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  Paste JSON or CSV data
                </label>
                <Textarea
                  data-testid="paste-textarea"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder='Paste your JSON array here. Example:
[
  {
    "ArtistID": "abc123",
    "ArtistName": "ಎಸ್.ಪಿ.ಬಾಲಸುಬ್ರಹ್ಮಣ್ಯಂ",
    "CategoryID": "xyz789",
    "CategoryName": "ಭಕ್ತಿ ಗೀತೆಗಳು",
    "SongNameEN": "Om Namah Shivaya",
    "NextSongCount": 1
  }
]'
                  className="rounded-none min-h-[300px] font-mono text-xs"
                  style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setPastedText('')}
                  className="flex-1 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  disabled={uploading}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  data-testid="upload-pasted-data"
                  onClick={handlePasteUpload}
                  disabled={uploading || !pastedText.trim()}
                  className="flex-1 bg-[#002FA7] text-white hover:bg-[#002277] rounded-none font-medium"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Data'}
                </Button>
              </div>

              <p className="text-xs text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                💡 Tip: See <code className="bg-zinc-100 px-1 rounded">/app/examples/</code> for sample JSON files
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

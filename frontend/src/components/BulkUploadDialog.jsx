import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Upload, FileText, ClipboardPaste } from 'lucide-react';

export function BulkUploadDialog({ isOpen, onClose, collectionName }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Canonical SongDetails schema (per spec). Maps incoming legacy/variant keys
  // to the canonical camelCase keys.
  const SONG_DETAILS_FIELDS = [
    'songNameEN', 'songType', 'songTE', 'songNameTE', 'songNameKA',
    'songGroup', 'songSN', 'lasttimeStamp', 'songArtist', 'songIcon',
    'songNameSN', 'songKA', 'youtubeLinks', 'songid'
  ];

  const SONG_DETAILS_ALIASES = {
    // canonical -> [accepted variants]
    songNameEN: ['songNameEN', 'SongNameEN', 'songnameen', 'SONGNAMEEN'],
    songNameKA: ['songNameKA', 'SongNameKA', 'SongNameKN', 'songNameKN'],
    songNameTE: ['songNameTE', 'SongNameTE'],
    songNameSN: ['songNameSN', 'SongNameSN', 'SongNameHI', 'songNameHI'],
    songKA: ['songKA', 'SongKA', 'SongLyricsKN', 'SongLyricsKA'],
    songTE: ['songTE', 'SongTE', 'SongLyricsTE'],
    songSN: ['songSN', 'SongSN', 'SongLyricsHI', 'SongLyricsSN'],
    songType: ['songType', 'SongType', 'SONGTYPE'],
    songArtist: ['songArtist', 'SongArtist', 'ArtistName', 'ARTISTNAMEEN', 'ARTISTNAMEKN'],
    songGroup: ['songGroup', 'SongGroup', 'CategoryName', 'CategoryNameEN', 'CategoryNameKN'],
    songIcon: ['songIcon', 'SongIcon'],
    youtubeLinks: ['youtubeLinks', 'YoutubeLinks', 'YouTubeLinks', 'youtube_links', 'YOUTUBELINKS'],
    lasttimeStamp: ['lasttimeStamp', 'lastTimeStamp', 'LastTimeStamp', 'lasttimestamp'],
    songid: ['songid', 'SongID', 'SongId', 'songId', 'SONGID'],
  };

  // youtubeLinks is stored as a string array. CSV cells arrive as a single
  // delimited string; JSON uploads may already provide an array.
  const parseYoutubeLinks = (value) => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') {
      return value.split(/[\n,;|]/).map((v) => v.trim()).filter(Boolean);
    }
    return [];
  };

  const normalizeToSongDetails = (item) => {
    const out = {};
    for (const canonical of SONG_DETAILS_FIELDS) {
      const variants = SONG_DETAILS_ALIASES[canonical] || [canonical];
      for (const v of variants) {
        if (item[v] !== undefined && item[v] !== null && item[v] !== '') {
          out[canonical] = item[v];
          break;
        }
      }
      if (out[canonical] === undefined) {
        // default empty values per schema
        out[canonical] = canonical === 'songid' ? 0 : (canonical === 'youtubeLinks' ? [] : '');
      }
    }
    out.youtubeLinks = parseYoutubeLinks(out.youtubeLinks);
    return out;
  };

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

    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, collectionName);
      const baseTimestamp = new Date();
      
      // Get max songid for SongDetails
      let nextSongId = 1;
      if (collectionName === 'SongDetails') {
        const snapshot = await getDocs(collectionRef);
        const maxSongId = snapshot.docs.reduce((max, doc) => {
          const docData = doc.data();
          return docData.songid && docData.songid > max ? docData.songid : max;
        }, 0);
        nextSongId = maxSongId + 1;
        console.log(`Starting from songid: ${nextSongId}`);
      }
      
      console.log(`Uploading ${data.length} documents to ${collectionName}...`);
      
      data.forEach((item, index) => {
        const docRef = doc(collectionRef);
        
        if (collectionName === 'SongDetails') {
          // Normalize to canonical schema
          const normalized = normalizeToSongDetails(item);
          // Auto-assign songid if missing
          if (!normalized.songid || normalized.songid === 0) {
            normalized.songid = nextSongId + index;
          }
          // Default lasttimeStamp = now (DD-MM-YYYY HH:MM:SS) if missing
          if (!normalized.lasttimeStamp) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            normalized.lasttimeStamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          }
          batch.set(docRef, normalized);
          console.log(`Document ${index + 1} (songid: ${normalized.songid}):`, normalized);
          return;
        }

        // Non-SongDetails: keep prior behaviour
        let itemTimestamp = new Date(baseTimestamp.getTime() + index);
        if (item.lasttimeStamp) {
          try {
            const parts = item.lasttimeStamp.split(' ');
            const dateParts = parts[0].split('-');
            const timeParts = parts[1]?.split(':') || ['00', '00', '00'];
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1;
            const year = parseInt(dateParts[2]);
            const hour = parseInt(timeParts[0]);
            const minute = parseInt(timeParts[1]);
            const second = parseInt(timeParts[2]);
            itemTimestamp = new Date(year, month, day, hour, minute, second);
          } catch (e) {
            console.warn('⚠️ Failed to parse lasttimeStamp:', item.lasttimeStamp, e);
          }
        }
        
        const itemWithTimestamp = {
          ...item,
          createdAt: itemTimestamp,
          updatedAt: itemTimestamp
        };
        Object.keys(itemWithTimestamp).forEach(key => 
          itemWithTimestamp[key] === undefined && delete itemWithTimestamp[key]
        );
        batch.set(docRef, itemWithTimestamp);
      });

      await batch.commit();
      console.log(`✅ Successfully uploaded ${data.length} documents to ${collectionName}`);
      
      if (collectionName === 'SongDetails') {
        toast.success(`Successfully uploaded ${data.length} songs (songid ${nextSongId} to ${nextSongId + data.length - 1})`);
      } else {
        toast.success(`Successfully uploaded ${data.length} documents to ${collectionName}`);
      }
      
      setPastedText('');
      onClose();
    } catch (error) {
      console.error('❌ Bulk upload error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        toast.error(`Permission denied! Please update Firebase security rules to allow writes. See /app/FIREBASE_SETUP.md`);
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }
    }
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
      <DialogContent className="sm:max-w-[700px] rounded-xl font-body">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight font-bold text-zinc-900 font-heading">
            Bulk Upload
          </DialogTitle>
          <DialogDescription>
            Upload multiple documents to <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-full">{collectionName}</span>
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
              className={`border-2 border-dashed rounded-xl py-12 text-center transition-colors duration-150 ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-300 bg-zinc-50 hover:bg-zinc-100'
              }`}
            >
              <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors duration-150 ${dragActive ? 'bg-primary/15' : 'bg-white border border-zinc-200'}`}>
                <FileText className={`w-6 h-6 ${dragActive ? 'text-primary' : 'text-zinc-400'}`} />
              </div>
              <p className="text-sm text-zinc-600 mb-2">
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
                  className="bg-primary text-white hover:bg-primary/90 rounded-lg px-6 shadow-sm shadow-primary/30"
                  disabled={uploading}
                >
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Browse Files'}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-zinc-500 mt-4">
                Supported formats: CSV, JSON
              </p>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2 block">
                  Paste JSON or CSV data
                </label>
                <Textarea
                  data-testid="paste-textarea"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder='Paste your JSON array here. SongDetails schema:
[
  {
    "songNameEN": "",
    "songType": "",
    "songTE": "",
    "songNameTE": "",
    "songNameKA": "",
    "songGroup": "",
    "songSN": "",
    "lasttimeStamp": "",
    "songArtist": "",
    "songIcon": "",
    "songNameSN": "",
    "songKA": "",
    "youtubeLinks": [],
    "songid": 0
  }
]'
                  className="rounded-lg min-h-[300px] font-mono text-xs"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setPastedText('')}
                  variant="outline"
                  className="flex-1 rounded-lg"
                  disabled={uploading}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  data-testid="upload-pasted-data"
                  onClick={handlePasteUpload}
                  disabled={uploading || !pastedText.trim()}
                  className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-medium shadow-sm shadow-primary/30"
                >
                  {uploading ? 'Uploading...' : 'Upload Data'}
                </Button>
              </div>

              <p className="text-xs text-zinc-500">
                💡 Tip: See <code className="bg-zinc-100 px-1 rounded">/app/examples/</code> for sample JSON files
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

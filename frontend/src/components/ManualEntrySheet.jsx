import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addDoc, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ManualEntrySheet({ isOpen, onClose, collectionName, editingDoc }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);

  // Fetch related data for dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        // Fetch artists
        const artistsSnap = await getDocs(collection(db, 'ArtistDetails'));
        setArtists(artistsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch categories
        const categoriesSnap = await getDocs(collection(db, 'CategoryDetails'));
        setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch languages
        const languagesSnap = await getDocs(collection(db, 'Languages'));
        setLanguages(languagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (editingDoc) {
      const { id, ...rest } = editingDoc;
      setFormData(rest);
    } else {
      setFormData({});
    }
  }, [editingDoc, isOpen, collectionName]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (Object.keys(formData).length === 0) {
        toast.error('Please fill at least one field');
        setLoading(false);
        return;
      }

      if (editingDoc) {
        await updateDoc(doc(db, collectionName, editingDoc.id), formData);
        toast.success('Document updated successfully');
      } else {
        let dataToSave = { ...formData };

        if (collectionName === 'SongDetails') {
          // Auto-assign next songid
          const snapshot = await getDocs(collection(db, collectionName));
          const maxSongId = snapshot.docs.reduce((max, d) => {
            const data = d.data();
            return data.songid && data.songid > max ? data.songid : max;
          }, 0);
          const songid = maxSongId + 1;

          // Default lasttimeStamp = now if not set
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const ts = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

          // Canonical schema only (drop any stray legacy keys)
          dataToSave = {
            songNameEN: formData.songNameEN || '',
            songType: formData.songType || '',
            songTE: formData.songTE || '',
            songNameTE: formData.songNameTE || '',
            songNameKA: formData.songNameKA || '',
            songGroup: formData.songGroup || '',
            songSN: formData.songSN || '',
            lasttimeStamp: formData.lasttimeStamp || ts,
            songArtist: formData.songArtist || '',
            songIcon: formData.songIcon || '',
            songNameSN: formData.songNameSN || '',
            songKA: formData.songKA || '',
            songid,
          };
          await addDoc(collection(db, collectionName), dataToSave);
          toast.success(`Document created successfully with songid: ${songid}`);
        } else {
          const dataWithTimestamp = {
            ...dataToSave,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          await addDoc(collection(db, collectionName), dataWithTimestamp);
          toast.success('Document created successfully');
        }
      }

      setFormData({});
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(`Failed to save document: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (collectionName) {
      case 'SongDetails':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Artist</Label>
                <Select
                  value={formData.songArtist || ''}
                  onValueChange={(val) => handleInputChange('songArtist', val)}
                >
                  <SelectTrigger data-testid="song-artist-select" className="rounded-none mt-1">
                    <SelectValue placeholder="Select or type artist...">
                      {formData.songArtist || 'Select artist...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => {
                      const label = artist.ARTISTNAMEKN || artist.ARTISTNAMEEN || artist.ARTISTSIGNEN || artist.id;
                      return (
                        <SelectItem key={artist.id} value={label}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Group</Label>
                <Select
                  value={formData.songGroup || ''}
                  onValueChange={(val) => handleInputChange('songGroup', val)}
                >
                  <SelectTrigger data-testid="song-group-select" className="rounded-none mt-1">
                    <SelectValue placeholder="Select category...">
                      {(() => {
                        const cat = categories.find(
                          c => String(c.categoryID ?? c.CategoryID ?? c.id) === String(formData.songGroup)
                        );
                        return cat
                          ? (cat.categoryNameKA || cat.CategoryNameKA || cat.categoryNameKN || cat.CategoryNameKN || cat.categoryNameEN || cat.CategoryNameEN || formData.songGroup)
                          : (formData.songGroup || 'Select category...');
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => {
                      const key = String(cat.categoryID ?? cat.CategoryID ?? cat.id);
                      const label = cat.categoryNameKA || cat.CategoryNameKA || cat.categoryNameKN || cat.CategoryNameKN || cat.categoryNameEN || cat.CategoryNameEN || key;
                      return (
                        <SelectItem key={cat.id} value={key}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (EN)</Label>
                <Input
                  data-testid="song-name-en"
                  value={formData.songNameEN || ''}
                  onChange={(e) => handleInputChange('songNameEN', e.target.value)}
                  placeholder="Enter song name in English"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (KA)</Label>
                <Input
                  data-testid="song-name-ka"
                  value={formData.songNameKA || ''}
                  onChange={(e) => handleInputChange('songNameKA', e.target.value)}
                  placeholder="ಹಾಡಿನ ಹೆಸರು"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (TE)</Label>
                <Input
                  data-testid="song-name-te"
                  value={formData.songNameTE || ''}
                  onChange={(e) => handleInputChange('songNameTE', e.target.value)}
                  placeholder="పాట పేరు"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (SN)</Label>
                <Input
                  data-testid="song-name-sn"
                  value={formData.songNameSN || ''}
                  onChange={(e) => handleInputChange('songNameSN', e.target.value)}
                  placeholder="संस्कृत नाम"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Type</Label>
                <Input
                  data-testid="song-type"
                  value={formData.songType || ''}
                  onChange={(e) => handleInputChange('songType', e.target.value)}
                  placeholder="Type"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Icon</Label>
                <Input
                  data-testid="song-icon"
                  value={formData.songIcon || ''}
                  onChange={(e) => handleInputChange('songIcon', e.target.value)}
                  placeholder="Icon URL"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Last Timestamp (DD-MM-YYYY HH:MM:SS)</Label>
              <Input
                data-testid="last-timestamp"
                value={formData.lasttimeStamp || ''}
                onChange={(e) => handleInputChange('lasttimeStamp', e.target.value)}
                placeholder="Auto-generated if blank"
                className="rounded-none mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Lyrics (KA)</Label>
              <Textarea
                data-testid="song-ka"
                value={formData.songKA || ''}
                onChange={(e) => handleInputChange('songKA', e.target.value)}
                placeholder="ಸಾಹಿತ್ಯ"
                className="rounded-none mt-1"
                rows={5}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Lyrics (TE)</Label>
              <Textarea
                data-testid="song-te"
                value={formData.songTE || ''}
                onChange={(e) => handleInputChange('songTE', e.target.value)}
                placeholder="తెలుగు సాహిత్యం"
                className="rounded-none mt-1"
                rows={5}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Lyrics (SN)</Label>
              <Textarea
                data-testid="song-sn"
                value={formData.songSN || ''}
                onChange={(e) => handleInputChange('songSN', e.target.value)}
                placeholder="संस्कृत साहित्य"
                className="rounded-none mt-1"
                rows={5}
              />
            </div>
          </div>
        );

      case 'ArtistDetails':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Artist Name (English)</Label>
                <Input
                  data-testid="artist-name-en"
                  value={formData.ARTISTNAMEEN || ''}
                  onChange={(e) => handleInputChange('ARTISTNAMEEN', e.target.value)}
                  placeholder="Artist name in English"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Artist Sign (English)</Label>
                <Input
                  data-testid="artist-sign-en"
                  value={formData.ARTISTSIGNEN || ''}
                  onChange={(e) => handleInputChange('ARTISTSIGNEN', e.target.value)}
                  placeholder="Artist signature"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Artist Name (Kannada)</Label>
                <Input
                  data-testid="artist-name-kn"
                  value={formData.ARTISTNAMEKN || ''}
                  onChange={(e) => handleInputChange('ARTISTNAMEKN', e.target.value)}
                  placeholder="ಕಲಾವಿದರ ಹೆಸರು"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Artist Sign (Kannada)</Label>
                <Input
                  data-testid="artist-sign-kn"
                  value={formData.ARTISTSIGNKA || ''}
                  onChange={(e) => handleInputChange('ARTISTSIGNKA', e.target.value)}
                  placeholder="ಸಹಿ"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Type</Label>
              <Input
                data-testid="song-type"
                type="number"
                value={formData.SONGTYPE || ''}
                onChange={(e) => handleInputChange('SONGTYPE', parseInt(e.target.value) || 1)}
                placeholder="Song type (1, 2, etc.)"
                className="rounded-none mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Description (Kannada)</Label>
              <Textarea
                data-testid="artist-description"
                value={formData.ARTISTNAMEDESCRIPTIONKA || ''}
                onChange={(e) => handleInputChange('ARTISTNAMEDESCRIPTIONKA', e.target.value)}
                placeholder="ವಿವರಣೆ"
                className="rounded-none mt-1"
                rows={4}
              />
            </div>
          </div>
        );

      case 'CategoryDetails':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Name (English)</Label>
                <Input
                  data-testid="category-name-en"
                  value={formData.CategoryNameEN || ''}
                  onChange={(e) => handleInputChange('CategoryNameEN', e.target.value)}
                  placeholder="Category name in English"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Name (Kannada)</Label>
                <Input
                  data-testid="category-name-kn"
                  value={formData.CategoryNameKN || ''}
                  onChange={(e) => handleInputChange('CategoryNameKN', e.target.value)}
                  placeholder="ವರ್ಗದ ಹೆಸರು"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Name (Hindi)</Label>
                <Input
                  data-testid="category-name-hi"
                  value={formData.CategoryNameHI || ''}
                  onChange={(e) => handleInputChange('CategoryNameHI', e.target.value)}
                  placeholder="श्रेणी का नाम"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Name (Telugu)</Label>
                <Input
                  data-testid="category-name-te"
                  value={formData.CategoryNameTE || ''}
                  onChange={(e) => handleInputChange('CategoryNameTE', e.target.value)}
                  placeholder="వర్గం పేరు"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Icon URL</Label>
              <Input
                data-testid="category-icon"
                value={formData.CategoryIcon || ''}
                onChange={(e) => handleInputChange('CategoryIcon', e.target.value)}
                placeholder="Icon URL"
                className="rounded-none mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Display Order</Label>
              <Input
                data-testid="display-order"
                type="number"
                value={formData.DisplayOrder || ''}
                onChange={(e) => handleInputChange('DisplayOrder', parseInt(e.target.value) || 0)}
                placeholder="Display order number"
                className="rounded-none mt-1"
              />
            </div>
          </div>
        );

      case 'Languages':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Language Name (English)</Label>
                <Input
                  data-testid="language-name-en"
                  value={formData.LanguageNameEN || ''}
                  onChange={(e) => handleInputChange('LanguageNameEN', e.target.value)}
                  placeholder="e.g., Kannada"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Language Name (Native)</Label>
                <Input
                  data-testid="language-name-native"
                  value={formData.LanguageNameNative || ''}
                  onChange={(e) => handleInputChange('LanguageNameNative', e.target.value)}
                  placeholder="e.g., ಕನ್ನಡ"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Language Code</Label>
              <Input
                data-testid="language-code"
                value={formData.LanguageCode || ''}
                onChange={(e) => handleInputChange('LanguageCode', e.target.value)}
                placeholder="e.g., kn, hi, te"
                className="rounded-none mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Is Active</Label>
              <Select value={formData.IsActive?.toString() || 'true'} onValueChange={(val) => handleInputChange('IsActive', val === 'true')}>
                <SelectTrigger className="rounded-none mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'ArtistCollections':
      case 'CategorySubDetails':
      default:
        return (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">Generic form for {collectionName}. Add fields as needed:</p>
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{key}</Label>
                <Input
                  value={formData[key]?.toString() || ''}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="rounded-none mt-1"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">New Field Name</Label>
              <Input
                placeholder="Enter field name"
                className="rounded-none mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    handleInputChange(e.target.value, '');
                    e.target.value = '';
                  }
                }}
              />
              <p className="text-xs text-zinc-500 mt-1">Press Enter to add field</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[700px] rounded-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {editingDoc ? 'Edit Document' : 'Add New Document'}
          </SheetTitle>
          <SheetDescription style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {editingDoc ? 'Update the document fields below' : 'Fill in the details to create a new document in'} <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{collectionName}</span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {renderFormFields()}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="save-document-button"
              disabled={loading}
              className="flex-1 bg-[#002FA7] text-white hover:bg-[#002277] rounded-none font-medium"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Saving...' : editingDoc ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

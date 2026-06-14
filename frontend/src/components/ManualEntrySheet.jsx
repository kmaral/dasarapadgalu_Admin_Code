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
        await addDoc(collection(db, collectionName), formData);
        toast.success('Document created successfully');
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
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Select Artist</Label>
                <Select 
                  value={formData.ArtistID || ''} 
                  onValueChange={(val) => {
                    const selectedArtist = artists.find(a => a.id === val);
                    handleInputChange('ArtistID', val);
                    handleInputChange('ArtistName', selectedArtist?.ARTISTNAMEKN || selectedArtist?.ARTISTNAMEEN || '');
                  }}
                >
                  <SelectTrigger data-testid="artist-select" className="rounded-none mt-1">
                    <SelectValue placeholder="ಕಲಾವಿದರನ್ನು ಆಯ್ಕೆಮಾಡಿ...">
                      {formData.ArtistID ? (
                        artists.find(a => a.id === formData.ArtistID)?.ARTISTNAMEKN || 
                        artists.find(a => a.id === formData.ArtistID)?.ARTISTNAMEEN ||
                        formData.ArtistID
                      ) : "ಕಲಾವಿದರನ್ನು ಆಯ್ಕೆಮಾಡಿ..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.ARTISTNAMEKN || artist.ARTISTNAMEEN || artist.ARTISTSIGNEN || artist.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Artist Name</Label>
                <Input
                  data-testid="artist-name"
                  value={formData.ArtistName || ''}
                  onChange={(e) => handleInputChange('ArtistName', e.target.value)}
                  placeholder="ಕಲಾವಿದರ ಹೆಸರು"
                  className="rounded-none mt-1"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Select Category</Label>
                <Select 
                  value={formData.CategoryID || ''} 
                  onValueChange={(val) => {
                    const selectedCategory = categories.find(c => c.id === val);
                    handleInputChange('CategoryID', val);
                    handleInputChange('CategoryName', selectedCategory?.CategoryNameKN || selectedCategory?.CategoryNameEN || '');
                  }}
                >
                  <SelectTrigger data-testid="category-select" className="rounded-none mt-1">
                    <SelectValue placeholder="ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ...">
                      {formData.CategoryID ? (
                        categories.find(c => c.id === formData.CategoryID)?.CategoryNameKN || 
                        categories.find(c => c.id === formData.CategoryID)?.CategoryNameEN ||
                        formData.CategoryID
                      ) : "ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.CategoryNameKN || cat.CategoryNameEN || cat.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Category Name</Label>
                <Input
                  data-testid="category-name"
                  value={formData.CategoryName || ''}
                  onChange={(e) => handleInputChange('CategoryName', e.target.value)}
                  placeholder="ವರ್ಗದ ಹೆಸರು"
                  className="rounded-none mt-1"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (English)</Label>
                <Input
                  data-testid="song-name-en"
                  value={formData.SongNameEN || ''}
                  onChange={(e) => handleInputChange('SongNameEN', e.target.value)}
                  placeholder="Enter song name in English"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (Kannada)</Label>
                <Input
                  data-testid="song-name-kn"
                  value={formData.SongNameKN || ''}
                  onChange={(e) => handleInputChange('SongNameKN', e.target.value)}
                  placeholder="ಹಾಡಿನ ಹೆಸರು"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (Hindi)</Label>
                <Input
                  data-testid="song-name-hi"
                  value={formData.SongNameHI || ''}
                  onChange={(e) => handleInputChange('SongNameHI', e.target.value)}
                  placeholder="गाने का नाम"
                  className="rounded-none mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Song Name (Telugu)</Label>
                <Input
                  data-testid="song-name-te"
                  value={formData.SongNameTE || ''}
                  onChange={(e) => handleInputChange('SongNameTE', e.target.value)}
                  placeholder="పాట పేరు"
                  className="rounded-none mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Next Song Count</Label>
              <Input
                data-testid="next-song-count"
                type="number"
                value={formData.NextSongCount || ''}
                onChange={(e) => handleInputChange('NextSongCount', parseInt(e.target.value) || 0)}
                placeholder="Enter next song count"
                className="rounded-none mt-1"
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

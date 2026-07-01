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
import { Loader2, Music2, Type, Info, Youtube, BookOpen, User, Tag, Globe, Sparkles } from 'lucide-react';

function FieldGroup({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/50 p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-primary">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em]">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</Label>
      {children}
    </div>
  );
}

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

  // Textarea holds raw newline-separated text while editing; convert to a
  // clean string array only when saving (avoids losing blank lines the user
  // is still typing on).
  const toYoutubeLinksArray = (value) => {
    if (Array.isArray(value)) return value.map((l) => String(l).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split('\n').map((l) => l.trim()).filter(Boolean);
    return [];
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
        const updates = { ...formData };
        if (collectionName === 'SongDetails') updates.youtubeLinks = toYoutubeLinksArray(formData.youtubeLinks);
        await updateDoc(doc(db, collectionName, editingDoc.id), updates);
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
            youtubeLinks: toYoutubeLinksArray(formData.youtubeLinks),
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
            <FieldGroup icon={Music2} title="Classification">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Song Artist">
                  <Select
                    value={formData.songArtist || ''}
                    onValueChange={(val) => handleInputChange('songArtist', val)}
                  >
                    <SelectTrigger data-testid="song-artist-select" className="rounded-lg mt-1.5 bg-white">
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
                </Field>

                <Field label="Song Group">
                  <Select
                    value={formData.songGroup || ''}
                    onValueChange={(val) => handleInputChange('songGroup', val)}
                  >
                    <SelectTrigger data-testid="song-group-select" className="rounded-lg mt-1.5 bg-white">
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
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup icon={Type} title="Song Names">
              <div className="grid grid-cols-2 gap-3">
                <Field label="English">
                  <Input
                    data-testid="song-name-en"
                    value={formData.songNameEN || ''}
                    onChange={(e) => handleInputChange('songNameEN', e.target.value)}
                    placeholder="Enter song name in English"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Kannada">
                  <Input
                    data-testid="song-name-ka"
                    value={formData.songNameKA || ''}
                    onChange={(e) => handleInputChange('songNameKA', e.target.value)}
                    placeholder="ಹಾಡಿನ ಹೆಸರು"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Telugu">
                  <Input
                    data-testid="song-name-te"
                    value={formData.songNameTE || ''}
                    onChange={(e) => handleInputChange('songNameTE', e.target.value)}
                    placeholder="పాట పేరు"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Sanskrit">
                  <Input
                    data-testid="song-name-sn"
                    value={formData.songNameSN || ''}
                    onChange={(e) => handleInputChange('songNameSN', e.target.value)}
                    placeholder="संस्कृत नाम"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup icon={Info} title="Metadata">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Song Type">
                  <Input
                    data-testid="song-type"
                    value={formData.songType || ''}
                    onChange={(e) => handleInputChange('songType', e.target.value)}
                    placeholder="Type"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Song Icon">
                  <Input
                    data-testid="song-icon"
                    value={formData.songIcon || ''}
                    onChange={(e) => handleInputChange('songIcon', e.target.value)}
                    placeholder="Icon URL"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
              <Field label="Last Timestamp (DD-MM-YYYY HH:MM:SS)">
                <Input
                  data-testid="last-timestamp"
                  value={formData.lasttimeStamp || ''}
                  onChange={(e) => handleInputChange('lasttimeStamp', e.target.value)}
                  placeholder="Auto-generated if blank"
                  className="rounded-lg mt-1.5 bg-white"
                />
              </Field>
            </FieldGroup>

            <FieldGroup icon={Youtube} title="Media">
              <Field label="YouTube Links (one per line)">
                <Textarea
                  data-testid="song-youtube-links"
                  value={Array.isArray(formData.youtubeLinks) ? formData.youtubeLinks.join('\n') : (formData.youtubeLinks || '')}
                  onChange={(e) => handleInputChange('youtubeLinks', e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="rounded-lg mt-1.5 bg-white"
                  rows={3}
                />
              </Field>
            </FieldGroup>

            <FieldGroup icon={BookOpen} title="Lyrics">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Kannada">
                  <Textarea
                    data-testid="song-ka"
                    value={formData.songKA || ''}
                    onChange={(e) => handleInputChange('songKA', e.target.value)}
                    placeholder="ಸಾಹಿತ್ಯ"
                    className="rounded-lg mt-1.5 bg-white"
                    rows={6}
                  />
                </Field>
                <Field label="Telugu">
                  <Textarea
                    data-testid="song-te"
                    value={formData.songTE || ''}
                    onChange={(e) => handleInputChange('songTE', e.target.value)}
                    placeholder="తెలుగు సాహిత్యం"
                    className="rounded-lg mt-1.5 bg-white"
                    rows={6}
                  />
                </Field>
                <Field label="Sanskrit">
                  <Textarea
                    data-testid="song-sn"
                    value={formData.songSN || ''}
                    onChange={(e) => handleInputChange('songSN', e.target.value)}
                    placeholder="संस्कृत साहित्य"
                    className="rounded-lg mt-1.5 bg-white"
                    rows={6}
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>
        );

      case 'ArtistDetails':
        return (
          <div className="space-y-4">
            <FieldGroup icon={User} title="Artist Names">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name (English)">
                  <Input
                    data-testid="artist-name-en"
                    value={formData.ARTISTNAMEEN || ''}
                    onChange={(e) => handleInputChange('ARTISTNAMEEN', e.target.value)}
                    placeholder="Artist name in English"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Sign (English)">
                  <Input
                    data-testid="artist-sign-en"
                    value={formData.ARTISTSIGNEN || ''}
                    onChange={(e) => handleInputChange('ARTISTSIGNEN', e.target.value)}
                    placeholder="Artist signature"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Name (Kannada)">
                  <Input
                    data-testid="artist-name-kn"
                    value={formData.ARTISTNAMEKN || ''}
                    onChange={(e) => handleInputChange('ARTISTNAMEKN', e.target.value)}
                    placeholder="ಕಲಾವಿದರ ಹೆಸರು"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Sign (Kannada)">
                  <Input
                    data-testid="artist-sign-kn"
                    value={formData.ARTISTSIGNKA || ''}
                    onChange={(e) => handleInputChange('ARTISTSIGNKA', e.target.value)}
                    placeholder="ಸಹಿ"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup icon={Info} title="Metadata">
              <Field label="Song Type">
                <Input
                  data-testid="song-type"
                  type="number"
                  value={formData.SONGTYPE || ''}
                  onChange={(e) => handleInputChange('SONGTYPE', parseInt(e.target.value) || 1)}
                  placeholder="Song type (1, 2, etc.)"
                  className="rounded-lg mt-1.5 bg-white"
                />
              </Field>
            </FieldGroup>

            <FieldGroup icon={BookOpen} title="Description">
              <Field label="Description (Kannada)">
                <Textarea
                  data-testid="artist-description"
                  value={formData.ARTISTNAMEDESCRIPTIONKA || ''}
                  onChange={(e) => handleInputChange('ARTISTNAMEDESCRIPTIONKA', e.target.value)}
                  placeholder="ವಿವರಣೆ"
                  className="rounded-lg mt-1.5 bg-white"
                  rows={4}
                />
              </Field>
            </FieldGroup>
          </div>
        );

      case 'CategoryDetails':
        return (
          <div className="space-y-4">
            <FieldGroup icon={Tag} title="Category Names">
              <div className="grid grid-cols-2 gap-3">
                <Field label="English">
                  <Input
                    data-testid="category-name-en"
                    value={formData.CategoryNameEN || ''}
                    onChange={(e) => handleInputChange('CategoryNameEN', e.target.value)}
                    placeholder="Category name in English"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Kannada">
                  <Input
                    data-testid="category-name-kn"
                    value={formData.CategoryNameKN || ''}
                    onChange={(e) => handleInputChange('CategoryNameKN', e.target.value)}
                    placeholder="ವರ್ಗದ ಹೆಸರು"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Hindi">
                  <Input
                    data-testid="category-name-hi"
                    value={formData.CategoryNameHI || ''}
                    onChange={(e) => handleInputChange('CategoryNameHI', e.target.value)}
                    placeholder="श्रेणी का नाम"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Telugu">
                  <Input
                    data-testid="category-name-te"
                    value={formData.CategoryNameTE || ''}
                    onChange={(e) => handleInputChange('CategoryNameTE', e.target.value)}
                    placeholder="వర్గం పేరు"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup icon={Info} title="Display Settings">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category Icon URL">
                  <Input
                    data-testid="category-icon"
                    value={formData.CategoryIcon || ''}
                    onChange={(e) => handleInputChange('CategoryIcon', e.target.value)}
                    placeholder="Icon URL"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Display Order">
                  <Input
                    data-testid="display-order"
                    type="number"
                    value={formData.DisplayOrder || ''}
                    onChange={(e) => handleInputChange('DisplayOrder', parseInt(e.target.value) || 0)}
                    placeholder="Display order number"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
            </FieldGroup>
          </div>
        );

      case 'Languages':
        return (
          <div className="space-y-4">
            <FieldGroup icon={Globe} title="Language Info">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name (English)">
                  <Input
                    data-testid="language-name-en"
                    value={formData.LanguageNameEN || ''}
                    onChange={(e) => handleInputChange('LanguageNameEN', e.target.value)}
                    placeholder="e.g., Kannada"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
                <Field label="Name (Native)">
                  <Input
                    data-testid="language-name-native"
                    value={formData.LanguageNameNative || ''}
                    onChange={(e) => handleInputChange('LanguageNameNative', e.target.value)}
                    placeholder="e.g., ಕನ್ನಡ"
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              </div>
              <Field label="Language Code">
                <Input
                  data-testid="language-code"
                  value={formData.LanguageCode || ''}
                  onChange={(e) => handleInputChange('LanguageCode', e.target.value)}
                  placeholder="e.g., kn, hi, te"
                  className="rounded-lg mt-1.5 bg-white"
                />
              </Field>
            </FieldGroup>

            <FieldGroup icon={Info} title="Status">
              <Field label="Is Active">
                <Select value={formData.IsActive?.toString() || 'true'} onValueChange={(val) => handleInputChange('IsActive', val === 'true')}>
                  <SelectTrigger className="rounded-lg mt-1.5 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </div>
        );

      case 'ArtistCollections':
      case 'CategorySubDetails':
      default:
        return (
          <div className="space-y-4">
            <FieldGroup icon={Sparkles} title="Fields">
              <p className="text-sm text-zinc-600">Generic form for {collectionName}. Add fields as needed:</p>
              {Object.keys(formData).map((key) => (
                <Field key={key} label={key}>
                  <Input
                    value={formData[key]?.toString() || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="rounded-lg mt-1.5 bg-white"
                  />
                </Field>
              ))}
              <Field label="New Field Name">
                <Input
                  placeholder="Enter field name"
                  className="rounded-lg mt-1.5 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value) {
                      handleInputChange(e.target.value, '');
                      e.target.value = '';
                    }
                  }}
                />
                <p className="text-xs text-zinc-500 mt-1">Press Enter to add field</p>
              </Field>
            </FieldGroup>
          </div>
        );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className={`p-0 flex flex-col font-body ${
          collectionName === 'SongDetails' ? 'w-[500px] sm:w-[760px] sm:max-w-[760px]' : 'w-[500px] sm:w-[620px] sm:max-w-[620px]'
        }`}
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 flex-shrink-0">
          <SheetTitle className="text-xl tracking-tight font-bold text-zinc-900 font-heading">
            {editingDoc ? 'Edit Document' : 'Add New Document'}
          </SheetTitle>
          <SheetDescription>
            {editingDoc ? 'Update the document fields below' : 'Fill in the details to create a new document in'} <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded-full">{collectionName}</span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderFormFields()}
          </div>

          <div className="flex-shrink-0 flex gap-3 px-6 py-4 border-t border-zinc-100 bg-white">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="save-document-button"
              disabled={loading}
              className="flex-1 bg-primary text-white hover:bg-primary/90 rounded-lg font-medium shadow-sm shadow-primary/30"
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

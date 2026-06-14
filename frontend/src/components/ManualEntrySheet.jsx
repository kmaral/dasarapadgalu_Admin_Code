import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { X, Plus } from 'lucide-react';

export function ManualEntrySheet({ isOpen, onClose, collectionName, editingDoc }) {
  const [fields, setFields] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingDoc) {
      const docFields = Object.entries(editingDoc)
        .filter(([key]) => key !== 'id')
        .map(([key, value]) => ({ key, value: String(value) }));
      setFields(docFields.length > 0 ? docFields : [{ key: '', value: '' }]);
    } else {
      setFields([{ key: '', value: '' }]);
    }
  }, [editingDoc, isOpen]);

  const addField = () => {
    setFields([...fields, { key: '', value: '' }]);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index, field, value) => {
    const newFields = [...fields];
    newFields[index][field] = value;
    setFields(newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {};
      fields.forEach(({ key, value }) => {
        if (key.trim()) {
          data[key.trim()] = value;
        }
      });

      if (Object.keys(data).length === 0) {
        toast.error('Please add at least one field');
        setLoading(false);
        return;
      }

      if (editingDoc) {
        await updateDoc(doc(db, collectionName, editingDoc.id), data);
        toast.success('Document updated successfully');
      } else {
        await addDoc(collection(db, collectionName), data);
        toast.success('Document created successfully');
      }

      setFields([{ key: '', value: '' }]);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:w-[600px] rounded-none">
        <SheetHeader>
          <SheetTitle className="text-2xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {editingDoc ? 'Edit Document' : 'Add New Document'}
          </SheetTitle>
          <SheetDescription style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {editingDoc ? 'Update the document fields below' : 'Add fields to create a new document in'} <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{collectionName}</span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Field Name</Label>
                  <Input
                    data-testid={`field-name-${index}`}
                    value={field.key}
                    onChange={(e) => updateField(index, 'key', e.target.value)}
                    placeholder="e.g., name, email"
                    className="rounded-none border-zinc-300 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] mt-1"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Value</Label>
                  <Input
                    data-testid={`field-value-${index}`}
                    value={field.value}
                    onChange={(e) => updateField(index, 'value', e.target.value)}
                    placeholder="Enter value"
                    className="rounded-none border-zinc-300 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] mt-1"
                    style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                  />
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeField(index)}
                    className="mt-6 bg-transparent text-red-600 hover:bg-red-50 rounded-none p-2 border-0 shadow-none"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            data-testid="add-field-button"
            onClick={addField}
            className="w-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none py-2 transition-colors"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>

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
              {loading ? 'Saving...' : editingDoc ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

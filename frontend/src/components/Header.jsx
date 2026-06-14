import { Upload, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Header({ collectionName, onOpenManualEntry, onOpenBulkUpload, onExport, documentCount }) {
  return (
    <header className="h-16 border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-40">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl tracking-tight font-bold text-zinc-900" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {collectionName}
          </h2>
          <span className="px-3 py-1 text-xs font-mono bg-zinc-100 text-zinc-600 rounded">
            {documentCount} {documentCount === 1 ? 'document' : 'documents'}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
          Manage documents in real-time
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="export-button"
              className="bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none px-6 py-2 transition-colors"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem data-testid="export-csv" onClick={() => onExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem data-testid="export-json" onClick={() => onExport('json')}>
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          data-testid="bulk-upload-button"
          onClick={onOpenBulkUpload}
          className="bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-none px-6 py-2 transition-colors"
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
        <Button
          data-testid="add-document-button"
          onClick={onOpenManualEntry}
          className="bg-[#002FA7] text-white hover:bg-[#002277] rounded-none px-6 py-2 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#002FA7]"
          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>
    </header>
  );
}

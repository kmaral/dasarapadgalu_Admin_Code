import { Upload, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function Header({ collectionName, onOpenManualEntry, onOpenBulkUpload, onExport, documentCount }) {
  return (
    <header className="h-16 border-b border-zinc-200/70 px-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40 font-body">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-0.5">
          Collections
        </p>
        <div className="flex items-center gap-3">
          <h2 className="text-xl tracking-tight font-bold text-zinc-900 font-heading">
            {collectionName}
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-mono bg-zinc-100 text-zinc-600 rounded-full">
            {documentCount} {documentCount === 1 ? 'document' : 'documents'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="export-button"
              variant="outline"
              className="rounded-lg px-5"
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
          variant="outline"
          className="rounded-lg px-5"
        >
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
        <Button
          data-testid="add-document-button"
          onClick={onOpenManualEntry}
          className="bg-primary text-white hover:bg-primary/90 rounded-lg px-5 font-medium shadow-sm shadow-primary/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>
    </header>
  );
}


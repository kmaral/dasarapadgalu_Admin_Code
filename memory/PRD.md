# PRD — Firestore Manager

## Original Problem Statement
Connect to Firebase Firestore and create a website to upload and manage collections (ArtistCollections, SongDetails, CategoryDetails, etc.). Required: manual form entry, bulk upload (JSON/CSV), view/edit/delete, open access, modern/minimal design.

## Architecture
- Frontend: React + Tailwind + Shadcn UI
- Backend: None (Direct Firebase Firestore client SDK)
- Search: Custom `advancedSearch.js` (N-gram, trigram, phonetic) + Fuse.js

## Implemented
- Firestore CRUD on all collections (ArtistCollections, ArtistDetails, CategoryDetails, CategorySubDetails, Languages, SongDetails)
- Smart manual entry forms with dynamic Kannada-name dropdowns
- Bulk upload via drag/drop and JSON paste
- Pagination (PAGE_SIZE=50) with "Load More"
- Auto-incrementing `songid` on `SongDetails` (client-side)
- `orderBy('songid', 'desc')` for SongDetails grid
- `PlayCount`, `lasttimeStamp` support
- Advanced fuzzy search (N-gram + trigram + phonetic) + Fuse.js fallback
- Horizontal scrolling table with sticky # / ID / Actions columns
- **Export to CSV/JSON now fetches ALL docs from Firestore (not just paginated)** [Feb 2026]

## Backlog / Next
- P0: Test & execute the `songid` migration button for 4 older docs missing `songid` field
- P1: Refactor `songid` generation to Firestore transaction with `counters/songDetails` doc (avoid race conditions on concurrent writes)
- P2: Add server-side search (Algolia/Typesense) for large collections
- P2: Add column visibility toggle for wide tables

## Key Files
- `/app/frontend/src/App.js` — Layout + export handler
- `/app/frontend/src/components/DataTable.jsx` — Grid, search, pagination, migration logic
- `/app/frontend/src/components/ManualEntrySheet.jsx` — Smart forms
- `/app/frontend/src/components/BulkUploadDialog.jsx` — Bulk JSON/CSV upload
- `/app/frontend/src/lib/firebase.js` — Firestore init
- `/app/frontend/src/lib/advancedSearch.js` — Custom search algos

## Integrations
- Firebase Firestore (live customer DB)

# Elazaros

Migration workspace for moving the existing Replit project to GitHub, Supabase, and Cloudflare with minimal risk and no app logic changes.

## Quick Start

1. Place your Replit zip anywhere on this machine.
2. Run the import script from this repo:

```bash
chmod +x scripts/import-replit-zip.sh
./scripts/import-replit-zip.sh "/absolute/path/to/your-replit-export.zip"
```

3. Follow the complete checklist in MIGRATE_REPLIT_TO_CLOUDFLARE.md.

## What This Repo Includes

- scripts/import-replit-zip.sh: Safely imports your Replit zip into this git repo.
- MIGRATE_REPLIT_TO_CLOUDFLARE.md: End-to-end, copy-paste migration and deployment checklist.

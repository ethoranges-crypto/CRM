# Electron Desktop App Packaging Plan

## Approach
Wrap the Next.js CRM in Electron using the "custom server" pattern:
- **Main process** (`electron/main.js`): Starts a Next.js production server programmatically, creates a BrowserWindow, handles native notifications
- **Development**: `concurrently` runs `next dev` + Electron pointing at localhost:3000
- **Production**: `next build` → Electron embeds the `.next` output + starts the server internally → `electron-builder` packages into a Windows `.exe` installer
- **Native notifications**: Electron's `Notification` API replaces the browser Notification API for reliable desktop push even when minimised

## Phases

### Phase 1: Install Electron dependencies
- `electron` (dev dependency)
- `electron-builder` (dev dependency)
- `concurrently` and `wait-on` (dev dependencies — for dev workflow)
- `electron-is-dev` or simple env check

### Phase 2: Create `electron/main.js`
The Electron main process file that:
1. Creates a BrowserWindow (1200x800, with app icon)
2. In **dev mode**: waits for `http://localhost:3000` then loads it
3. In **production mode**: starts a Next.js custom server (`next start` via child_process spawning the standalone server), waits for it to be ready, then loads it
4. Sets up IPC handler for native notifications (Electron's `Notification` API)
5. Handles app lifecycle (single instance lock, quit on all windows closed)

### Phase 3: Create `electron/preload.js`
Exposes a safe `electronAPI` bridge to the renderer:
- `electronAPI.sendNotification({ title, body })` — sends native OS notification via IPC
- `electronAPI.isElectron` — flag for the renderer to detect Electron environment

### Phase 4: Update `src/lib/db.ts` — database path
Currently uses relative `"crm.db"`. In a packaged Electron app, the working directory is unpredictable.
- Add logic: if `process.env.CRM_DB_PATH` is set, use that; otherwise fall back to `"crm.db"` (keeps existing dev flow working)
- The Electron main process will set `CRM_DB_PATH` to `path.join(app.getPath('userData'), 'crm.db')` via environment variable before spawning the Next.js server

### Phase 5: Update notification hook for Electron
Modify `src/modules/deals/hooks/use-reminder-notifications.ts`:
- If `window.electronAPI` exists, use `electronAPI.sendNotification()` instead of browser `Notification` API
- Falls back to browser API when running in regular browser (keeps localhost dev working)

### Phase 6: Add app icon
- Create/place `electron/icon.ico` (256x256 Windows icon)
- Referenced by BrowserWindow and electron-builder config

### Phase 7: Update `package.json`
- Add `"main": "electron/main.js"` entry point
- Add scripts:
  - `"electron:dev"` — `concurrently "next dev" "wait-on http://localhost:3000 && electron ."`
  - `"electron:build"` — `next build && electron-builder`
- Add `"build"` config for `electron-builder` (appId, productName, directories, win target nsis, files to include, extraResources for .env.local)

### Phase 8: Configure `electron-builder`
Add config in package.json `"build"` key:
- `appId`: "com.crm.desktop"
- `productName`: "CRM"
- `win.target`: "nsis" (standard Windows installer)
- `win.icon`: "electron/icon.ico"
- `files`: include `.next/`, `src/`, `public/`, `node_modules/`, `package.json`, `next.config.ts`, `electron/`
- `extraResources`: `.env.local` (bundled alongside the app)
- `asar: false` (needed for native modules like better-sqlite3)

### Phase 9: Build verification
- Test `npm run electron:dev` works (opens window with CRM)
- Test `npm run electron:build` produces installer

## Files to create
- `electron/main.js`
- `electron/preload.js`

## Files to modify
- `package.json` (main field, scripts, build config, new devDependencies)
- `src/lib/db.ts` (respect CRM_DB_PATH env var)
- `src/modules/deals/hooks/use-reminder-notifications.ts` (use Electron notifications when available)
- `next.config.ts` (set output: "standalone" for production packaging)

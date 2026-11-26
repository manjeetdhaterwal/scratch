# Scratch

A small mobile-first scratch-card app built with React, Vite, and TypeScript. Categories, text items, compressed images, and backups all stay on the device in browser IndexedDB.

Each category can use one of six color themes or a compressed custom background photo. The chosen theme follows the category through editing, deck selection, and play. Existing `scratch:v1` localStorage data is migrated automatically on first load.

Settings also includes persistent Aurora light and Midnight dark appearance modes. The preference is stored in IndexedDB and included in exported backups.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Push to `main`, or run **Deploy to GitHub Pages** from the Actions tab.

The included workflow builds `dist` and deploys it with GitHub's official Pages actions. Vite uses `base: './'`, and the app uses `HashRouter`, so it works from either a user site or a project subpath and survives direct refreshes.

## Notes

- Images are resized to at most 800 px and saved as JPEG at 0.7 quality before entering IndexedDB.
- Scratch progress is intentionally temporary and resets when the board is reshuffled or reopened.
- Settings provides JSON export/import and an app-wide clear action. Import replaces the current IndexedDB data, so export first if you need the existing copy.
- The category editor can clear all items and images while preserving the category and its theme.
- The PWA manifest and service worker allow installation and basic offline reopening after the first successful load.

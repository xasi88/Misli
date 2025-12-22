Misli — PWA prototype

This repository contains a lightweight Progressive Web App prototype designed with a blue theme. The files are intended to be served from the repository root on the main branch (suitable for GitHub Pages configured to serve from branch main / root).

Included files
- index.html — main entry (registers service worker using a relative path)
- styles.css — blue design styles
- app.js — small demo behavior (online/offline status, demo action, install UX)
- sw.js — service worker (caches core assets, offline fallback)
- manifest.webmanifest — Web App Manifest (installable settings, icons)
- firebase-config.example.js — example Firebase config (rename and populate to use)
- icons/icon-192.png, icons/icon-512.png — placeholder icons

Notes and next steps
- Replace firebase-config.example.js with your actual config (and add Firebase SDKs) if you intend to use Firebase services.
- Replace the icons with branded artwork of the correct sizes (192x192 and 512x512 PNGs) to improve install appearance.
- GitHub Pages: ensure the repository is configured to serve from branch "main" / root in Settings → Pages.
- Asset paths use relative references (./file). Service worker is registered at ./sw.js so GitHub Pages serving from the repo root will scope it correctly.

If you'd like, I can:
- Replace the placeholder icons with specific images you provide.
- Customize colors, copy, or add additional pages and offline fallbacks.

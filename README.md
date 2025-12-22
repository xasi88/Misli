# Misli

A minimal single-thought journaling web app. This branch contains a polished UI implementation that matches the provided prototype: two-column layout, gradient header with decorative wave, rounded tabs, a write screen modal with animations, character counter, and a 1-per-24h posting limit. It also includes basic PWA support (manifest + service worker).

What's new in this pass
- Header status pills that surface the 24h window and next available posting time.
- More resilient streak stats (current + best), last entry metadata, and grouped timeline days.
- Empty states, safer rendering, and local-first storage with cross-tab syncing.
- Service worker cache bump to pick up new assets.

Key files
- index.html — main UI
- styles.css — visual styling and animations
- app.js — client behavior (tabs, modal, counter, 24h limit, localStorage persistence)
- sw.js — simple service worker to cache assets
- manifest.webmanifest — PWA manifest
- firebase-config.example.js — example placeholder for Firebase configuration
- icons/* — app icons

Notes
- Posting is enforced locally via localStorage and is not backed by a server in this example. Replace with a backend (e.g. Firebase) if you want server-side enforcement.
- Icons included are placeholders; replace them with properly designed assets for production.

Commit: "Polish UI to match prototype: two-column layout, header wave, tabs, write screen, animations, PWA support"

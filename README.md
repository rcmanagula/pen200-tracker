# PEN-200 OSCP Progress Tracker

A personal project built while learning and experimenting with Astro 6. This is a simple PEN-200 study progress tracker with a clean dashboard UI, local browser storage, and optional Supabase-based account sync.

This project is intended for personal study tracking only, not as a production-grade learning management system.

## Features

- Track PEN-200 course/module progress
- Mark chapters and videos as completed
- Track start date, study day, schedule, and completion status
- Save progress locally in the browser
- Optional Supabase account sync for using the tracker across devices
- Static deployment support through GitHub Pages

## Tech Stack

- Astro 6
- Tailwind CSS through PostCSS
- Supabase for optional authentication and cloud sync
- GitHub Pages for static hosting

## Local Setup

```bash
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

The app can run without Supabase configured. In that mode, progress is saved locally in the browser only.

## Limitations

- Built mainly for personal use and learning Astro 6
- Sync conflict handling is simple
- The app depends on correct Supabase Auth and RLS configuration when cloud sync is enabled
- Local browser progress does not automatically sync across devices unless Supabase is configured

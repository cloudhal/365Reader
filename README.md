# 365 Reader

A compact Chrome extension RSS reader for Microsoft 365 and Azure blog posts.

## Features

### Feed Reading
- Latest blog posts from 40+ Microsoft and Azure feeds in a compact popup
- Feed catalog loaded from `feeds.csv` — easily extensible
- Roadmap feed with status badges (Launched ✓, Rolling Out ⟳, In Development ○, Preview ◷, Cancelled ✕, Feature ✦, Retirements ⬇)
- Article expand/collapse to read descriptions inline
- Infinite scroll with chunked batch loading
- Multi-page pagination per feed when a single feed is selected

### Search & Filtering
- Multi-keyword search across title, source, author, and categories
- Feed filter chip panel to show posts from specific sources
- "All feeds" quick-select mode (press <kbd>A</kbd>)
- Search state preserved across popup sessions

### Settings & Customization
- Theme selector — Light, Dark, or System (follows OS preference)
- Configurable posts-per-scroll-batch (1–100)
- Configurable max extra pages per feed (1–20)
- Individual feed enable/disable toggles
- Feeds grouped by category with collapsible sections and "Select all" per group
- Persistent settings across sessions via `chrome.storage.sync`
- Keyboard shortcuts — <kbd>F</kbd> toggles the filter panel, <kbd>A</kbd> selects all feeds

### Popup Controls
- About modal with version info, changelog, release date, and links
- Settings modal with all configuration options
- Refresh button to force-fetch the latest posts
- Expandable popup width for wider layouts
- Reset to defaults option

### Performance & Reliability
- Background service worker for CORS-free feed fetching
- 10-minute local cache to reduce network requests
- Feed failure reporting with per-source status messages
- Graceful handling of feed permission issues

## Development

1. Install dependencies: `npm install`
2. Build popup CSS: `npm run build:css`
3. Load unpacked extension from this folder in Chrome

## License

Copyright © 2026 Cloudrun Ltd

Licensed under the Mozilla Public License, v. 2.0.

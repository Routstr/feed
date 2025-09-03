# Goose Notes: Vite Nostr Events Feed

This document tracks work done by Goose to scaffold and enhance a Vite + React application that accepts Nostr-like JSON and renders a Twitter-style feed with relevancy scoring.

## Project Summary

- Framework: Vite + React
- Styling: Tailwind CSS with dark mode, custom components, and plugins
- Features:
  - Drag-and-drop or paste JSON input
  - Twitter-like event cards with avatar, content, time, and relevancy badge
  - Relevancy progress bar
  - Filter bar: sort by score/time, min score slider, search
  - Dark mode toggle
  - Sample data loader

## JSON Format Supported

Input should match the following structure:

```json
{
  "output": [
    {
      "events": [
        { "event_content": "...", "relevancy_score": 95, "timestamp": 1725340800 },
        { "event_content": "...", "relevancy_score": 90, "timestamp": 1725326400 }
      ],
      "npub": "npub...",
      "summary": "..."
    }
  ]
}
```

## Key Files

- tailwind.config.js: Tailwind setup with typography and line-clamp plugins, dark mode
- postcss.config.js: Uses `@tailwindcss/postcss` and `autoprefixer`
- src/index.css: Tailwind layers + custom CSS variables and component classes
- src/App.jsx: Layout, theme toggle, sample loader, and two-column layout
- src/components/JsonInput.jsx: File drop zone and paste JSON handler
- src/components/EventFeed.jsx: FilterBar + list rendering, sorting, filtering
- src/components/EventCard.jsx: Polished card UI with badge and progress bar
- src/data/sampleData.js: Embedded sample JSON matching your example

## Setup Commands Executed

```bash
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss postcss autoprefixer
# Tailwind config placed manually due to npx issue
npm install -D @tailwindcss/postcss @tailwindcss/typography @tailwindcss/line-clamp
```

## Tailwind/PostCSS Fix

Encountered Vite PostCSS error: Tailwind plugin moved. Fixed by installing `@tailwindcss/postcss` and updating postcss.config.js:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

## Usage

- npm run dev
- Paste or drop JSON in the loader, or use "Load Sample" to preview.
- Adjust filters in the top bar: sort, minimum relevancy score, search.
- Toggle Light/Dark via header button.

## Next Ideas

- Persist theme and last loaded JSON in localStorage
- Add pagination/virtualization for large feeds
- Support Nostr-specific formatting (hashtags, mentions, nostr: URIs)
- Shareable permalink to a pasted JSON via URL param

## Changelog

- v0.1: Scaffolded project; added Tailwind; implemented loader, feed, cards
- v0.2: UI overhaul: dark mode, filter bar, badges, progress bar, sidebar summary; fixed Tailwind PostCSS config

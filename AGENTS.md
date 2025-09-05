# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project-Specific Patterns

- JSON data structure expects `data.output` array where each item has `events`, `npub`, `name`, `profile_pic`, and `summary` fields
- EventFeed component flattens nested structure: `data.output.flatMap(o => o.events.map(e => ({ ...e, npub: o.npub, name: o.name, profile_pic: o.profile_pic })))`
- Profile images use error handling pattern: `onError` hides failed img and shows fallback div with `hidden` class toggle
- Custom CSS variables in `:root` and `.dark` for theming instead of standard Tailwind dark mode classes
- Component-level CSS classes defined in `@layer components`: `.card`, `.btn-primary`, `.btn-secondary`, `.pill`
- Types are defined in JSDoc-style comments in `.js` files, not TypeScript (see `src/types.js`)
- Sample data structure in `src/data/sampleData.js` shows expected JSON format with relevancy scoring
- Dark mode toggled via `document.documentElement.classList.toggle('dark', dark)` not Tailwind's built-in system
- JsonInput component validates JSON must have `output` array or throws "Invalid JSON format" error
- ESLint allows unused vars with pattern `^[A-Z_]` (constants/types pattern)
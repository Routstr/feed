# Project Coding Rules (Non-Obvious Only)

- EventCard component expects `name` and `profile_pic` props in addition to `event` and `npub`
- Profile image fallback uses `onError` to toggle `hidden` class on fallback div, not standard React patterns
- EventFeed flattens data structure in `useMemo` - must include all user fields when mapping events
- Custom CSS component classes (`.card`, `.btn-primary`, etc.) defined in `src/index.css` @layer components
- Dark mode uses manual `classList.toggle('dark')` on `documentElement`, not Tailwind's built-in system
- JSON validation requires `data.output` array structure - JsonInput throws specific error message
- Types defined as JSDoc interfaces in `.js` files, not actual TypeScript
- ESLint configured to allow unused vars matching `^[A-Z_]` pattern for constants/types
# Project Debug Rules (Non-Obvious Only)

- Vite dev server runs on default port with HMR - check terminal output for actual URL
- React 19 strict mode may cause double renders in development - this is expected behavior
- Profile image loading errors are handled silently via `onError` handlers, check network tab for failed requests
- JSON parsing errors in JsonInput component show user-friendly messages but log full errors to console
- Dark mode state persists only in memory - no localStorage implementation
- EventFeed filtering happens in multiple `useMemo` hooks - check each step for performance issues
- Custom CSS variables in `:root` and `.dark` override Tailwind's default dark mode behavior
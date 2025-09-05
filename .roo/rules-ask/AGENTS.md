# Project Documentation Rules (Non-Obvious Only)

- `src/data/sampleData.js` contains the canonical example of expected JSON structure with relevancy scoring
- `src/types.js` defines interfaces using JSDoc syntax in JavaScript files, not TypeScript
- Custom CSS component classes are defined in `src/index.css` @layer components, not in component files
- EventCard and EventFeed have tight coupling - EventCard expects flattened data structure from EventFeed
- Profile image error handling pattern is implemented in EventCard but not documented elsewhere
- Dark mode implementation bypasses Tailwind's built-in system using manual DOM manipulation
- JSON validation logic in JsonInput requires specific `output` array structure - other formats will fail
- No testing framework configured - package.json has no test scripts or dependencies
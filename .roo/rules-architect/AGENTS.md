# Project Architecture Rules (Non-Obvious Only)

- Data flows unidirectionally: App → EventFeed → EventCard with flattening transformation in EventFeed
- EventFeed component performs critical data transformation - flattens nested structure and adds user metadata to each event
- Profile image fallback system requires specific DOM manipulation pattern - cannot use standard React error boundaries
- Custom CSS layer system in `src/index.css` creates component classes that must be used consistently across components
- Dark mode state management bypasses React state for DOM manipulation - theme changes affect `documentElement` directly
- JSON validation is tightly coupled to specific data structure - changing format requires updates in JsonInput component
- No state management library - all state is local component state with prop drilling for data sharing
- Component coupling: EventCard depends on EventFeed's data transformation, cannot be used independently
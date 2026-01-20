## Plan: per-card completion indicator (no tooltip)

1) Use existing `summaryRows` in `app/(app)/sessions/new/page.tsx` and their `required`/`missing` flags to decide per-card completion.
2) Replace the right-side “Edit” label in each summary row with a dark-grey circular indicator, vertically centered: checkmark inside when complete, empty circle when not.
3) Keep the button layout and click-to-open behavior unchanged; no title/tooltip/aria-label additions per request.


---
trigger: always_on
---
5) UI must match the existing design system and portal patterns.
- Before creating UI, inspect existing components in the same portal and reuse them.
- Do not invent new visual patterns when an existing component already solves it.
 
6) Prefer existing modals/dialogs/banners over custom ones.
- Reuse the project’s established modal/dialog approach.
- Only create a new UI primitive if there is no equivalent in the codebase, and ask first.
 
7) Glassmorphic consistency is mandatory for card-like UI.
- Use the established glassmorphic utility classes already used in the app.
- Do not introduce a separate “card” look that clashes with the rest of the portal.
 
8) No “ugly defaults”.
- Avoid raw HTML layouts that look unstyled.
- Any new UI must match spacing, typography, and states (hover/focus/disabled) used elsewhere in the app.

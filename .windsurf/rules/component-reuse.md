---
trigger: always_on
---
1) Component-first UI building (mandatory).
- Before creating any new UI, search and reuse existing components in `components/` (especially portal-specific ones).
- Prefer existing: modals/dialogs/banners/empty-states/skeletons/buttons/forms/navigation primitives.
- If I can’t find a suitable component after searching, I must say what I checked and why it doesn’t fit.
 
2) No custom UI primitives without approval.
- If the task needs a new “primitive” (Dialog, Drawer, Toast, Dropdown, Combobox, Table), I must ask you before inventing one.
- If an existing primitive exists, I must use it even if it’s slightly less convenient.
 
3) Portal consistency rules.
- Customer app UI must mirror customer app patterns; driver app mirrors driver patterns; admin mirrors admin patterns.
- Do not copy a public-site layout into portals (and vice versa) unless there’s already precedent in the codebase.

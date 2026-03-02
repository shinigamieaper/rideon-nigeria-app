---
trigger: manual
---
9) No scattered scroll containers.
- Avoid nested scrollbars and accidental overflow.
- Use the app’s established layout spacing/padding patterns and ensure mobile safe-area is respected.
- If scroll is needed, it should be intentional and consistent (page-level scrolling preferred).
 
10) “UI Polish QA” before marking done.
- Before I say a UI task is done, I must verify:
  - no ugly default controls,
  - no random overflow/scrollbars,
  - typography/spacing matches nearby screens,
  - empty/loading/error states exist and match portal style,
  - no dev strings (e.g. localhost, raw JSON dumps, internal debug labels).

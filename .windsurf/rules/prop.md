---
trigger: always_on
---

All new React components must include prop type definitions using a TypeScript interface. For components that wrap a native HTML element, the props interface must extend the appropriate React.ComponentPropsWithoutRef type to ensure full attribute passthrough.
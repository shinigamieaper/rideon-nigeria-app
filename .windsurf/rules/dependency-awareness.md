---
trigger: always_on
---
4) Use installed dependencies intelligently.
- Before implementing complex UI/behavior, check existing dependencies already in `package.json` and reuse them if you feel a dependency is needed that isnt in package.json you can install it with `npm install <package-name>` after approval .
- Prefer “best available existing lib” over handwritten fragile widgets.
 
5) Adding a new library requires a proposal + your OK.
- If a new library is genuinely the best solution, I must:
  - name the library,
  - explain why current dependencies/components aren’t enough,
  - list the minimal API surface we’ll use,
  - confirm bundle/complexity tradeoff,
  - then wait for your approval before adding it.
 
6) Do not ship “half-integrated” libraries.
- If I add a library, I must complete the integration end-to-end (UI + state + error/loading + cleanup) in the same task.
---
trigger: always_on
---

All Next.js API Route handlers must be wrapped in a try...catch block. On success, return a 200 or 201 status. On error, log the error server-side and return a standardized 500 JSON response: { "error": "A descriptive error message." }.
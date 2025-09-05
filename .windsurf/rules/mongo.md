---
trigger: always_on
---

When writing database queries for MongoDB, always explicitly select only the fields required for the operation using.select() or projection. Never return the entire document unless absolutely necessary.
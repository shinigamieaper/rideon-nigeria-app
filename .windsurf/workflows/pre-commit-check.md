---
description: To define the automated code quality checks for our Git hooks, ensuring no low-quality or broken code is ever committed to the repository.
auto_execution_mode: 1
---

1. Trigger: A developer runs git commit. 
 2. Execution: The Husky pre-commit hook triggers npx lint-staged. 
 3. Tasks: The lint-staged configuration runs the following sequence on all staged .ts and .tsx files: 
     a. prettier --write: Auto-formats code. 
     b. eslint --fix: Fixes linting errors. 
     c. tsc --noEmit: Performs a static type check. 
 4. Outcome: If any task fails (e.g., a critical type error), the commit is aborted, forcing the developer to fix the issue manually.
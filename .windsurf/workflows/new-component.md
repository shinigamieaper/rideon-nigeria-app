---
description: To standardize the creation of reusable, production-grade React components, ensuring consistency with the project's file structure and TypeScript conventions.
auto_execution_mode: 1
---

1. Invoke: User types /new-component <ComponentName>. 
 2. File Creation: Create a new directory at components/ui/<ComponentName> with an index.tsx file inside. 
 3. Boilerplate: Populate index.tsx with a boilerplate React functional component. The component's props must extend React.ComponentPropsWithoutRef<'div'> to ensure reusability. 
 4. Storybook: Create a corresponding Storybook file at components/ui/<ComponentName>/<ComponentName>.stories.tsx. 
 5. Export: Add an export statement for the new component to the main components/index.ts barrel file. 
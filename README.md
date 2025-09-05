<<<<<<< HEAD
# rideon-nigeria-app
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

<<<<<<< HEAD
## Windows Setup Guide (PowerShell)

- __Prereqs__: Node.js 22.x (you have 22.14.0) and Git.
- __Install deps__: `npm install`
- __Run dev__: `npm run dev` then open http://localhost:3000
- __Common gotchas__:
  - create-next-app rejects uppercase folder names. Use lowercase (e.g., `rideon_nigeria_app_2`).
  - If port 3000 is busy: `$env:PORT=3001; npm run dev`

### Optional: pnpm on Windows (skip if using npm)
- Simple install: `npm i -g pnpm`
- Corepack EPERM workaround (avoids Program Files perms):
  ```powershell
  $dir="$env:LOCALAPPDATA\Corepack"
  mkdir $dir -Force | Out-Null
  corepack enable --install-directory "$dir"
  corepack prepare pnpm@9 --activate --install-directory "$dir"
  $env:Path="$env:Path;$dir"
  pnpm -v
  ```
- References: pnpm install docs https://pnpm.io/installation, Corepack issue https://github.com/nodejs/corepack/issues/71

## Environment Keys – How to Obtain

Fill values in `.env.local` (see template above). Keep secrets private.

- __Firebase (client & Admin)__
  - Console: https://console.firebase.google.com/
  - Create project -> Project settings -> Your apps -> Web app -> copy client keys.
  - Admin credentials: Service accounts -> Generate new private key -> JSON fields map to:
    - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
    - Windows tip: keep literal `\n` in `FIREBASE_PRIVATE_KEY` and wrap in quotes.
  - Docs: Admin SDK setup https://firebase.google.com/docs/admin/setup

- __MongoDB Atlas__
  - Atlas: https://www.mongodb.com/cloud/atlas
  - Create free cluster -> Database Access (user) -> Network Access (IP allow) -> Connect -> Drivers -> copy connection string to `MONGODB_URI`.
  - Docs: Connect to Atlas https://www.mongodb.com/docs/atlas/getting-started/

- __Paystack__
  - Dashboard: https://dashboard.paystack.com/
  - Settings -> API Keys & Webhooks -> copy keys to `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
  - Docs: https://paystack.com/docs/

## Git/GitHub Workflow

- __Initial push__: if GitHub created an auto commit, you may need:
  - Merge: `git pull --rebase origin main --allow-unrelated-histories`
  - Or overwrite: `git push -u origin main --force-with-lease`
- __Typical flow__:
  - `git checkout -b feature/short-name`
  - `git commit -m "type: short message"`
  - `git push -u origin feature/short-name`
  - Open PR to `main`

## References
- Next.js Getting Started: https://nextjs.org/docs/app/getting-started/installation
- create-next-app CLI: https://www.npmjs.com/package/create-next-app
- Node on Windows (PowerShell): https://nodejs.org/en/download
- pnpm install: https://pnpm.io/installation
- Firebase Admin setup: https://firebase.google.com/docs/admin/setup
- MongoDB Atlas start: https://www.mongodb.com/docs/atlas/getting-started/
- Paystack docs: https://paystack.com/docs/
>>>>>>> f022ead (Initial commit from Create Next App)
=======
## Environment Variables

Create a `.env.local` for local development (not committed) and a `.env.example` checked into the repo as a reference.

Required variables:

```
# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
# IMPORTANT (Windows/PowerShell): Escape newlines as \n and wrap in quotes
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Database
MONGODB_URI=

# Paystack
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
```

Notes:
- Use `.env.local` for your real secrets. Copy from `.env.example`:
  - PowerShell: `Copy-Item -Path .env.example -Destination .env.local`
- Windows escaping for `FIREBASE_PRIVATE_KEY` is crucial; keep the literal `\n` characters.
- Restart `npm run dev` after adding/updating envs.

## Conventions
- API responses must be JSON only. Success: 200/201. Client errors: 4xx. Server errors: 500. Error shape: `{ "error": "message" }`.
- Auth flow: Client Firebase ID token -> Authorization: Bearer -> Backend verifies with Admin -> create profile & role claim -> authorize protected routes by role.
>>>>>>> 18d9de1 (chore: scaffold Next.js 15 app, add env template and docs)

# Vercel Install Fix

This revision fixes the Vercel dependency installation failure:

`npm error Exit handler never called!`

Changes:

- Replaced private/internal registry URLs in `package-lock.json` with the public npm registry.
- Added a root `.npmrc` that explicitly uses `https://registry.npmjs.org/` and retries transient downloads.
- Pinned Vercel to Node.js 22 through `package.json`.
- Limited Next.js production builds to four workers in `next.config.ts` for stability on high-core CI machines.

Upload the four replacement files in the patch ZIP to the root of the GitHub repository and overwrite the existing files, then redeploy without the previous build cache.

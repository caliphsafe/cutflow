# Vercel dependency installation

CutFlow v2.3 intentionally does not include `package-lock.json`.

The project includes `.npmrc` with the public npm registry, and Vercel installs dependencies directly from `package.json`. This follows the preferred CutFlow deployment workflow and avoids the npm lockfile installation failure encountered in earlier builds.

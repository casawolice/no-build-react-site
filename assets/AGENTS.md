# AGENTS.md

This project ships with **zero build step** — no Vite, no webpack, no
esbuild, no bundler at all. `.tsx`/`.ts` files are fetched by the browser and
transpiled on the fly by `src/runtime/loader.js`. Don't "helpfully" introduce
a bundler; that would undo the whole point of this setup (offline-capable,
no CDN dependency, nothing to build or watch).

## Ground rules

- **Every local relative import needs its file extension written out** —
  `import { Header } from "./components/Header.tsx"`, not `"./Header"`.
  There's no bundler here to probe candidate extensions, so an omitted
  extension is a silent failed fetch, not a build error.
- **`package.json` and `tsconfig.json` are editor-only.** They exist so an
  editor can resolve `import React from "react"` and give real autocomplete.
  The browser never reads either file — don't let their presence imply this
  project has a build step, and don't add `node_modules` as a runtime
  dependency of anything under `src/`.
- **Dependencies live in `vendor/` as local files, not CDN URLs.** To add
  one: `bun run vendor -- "https://esm.sh/PKG@VERSION?external=react,react-dom=name.js"`,
  then add the bare specifier to `index.html`'s `<script type="importmap">`.
  If the package lists React as a peer dependency, always pass
  `?external=react` (and `,react-dom` if needed) — otherwise it bundles its
  own duplicate React, which shows up later as a baffling "Invalid hook
  call" that looks unrelated to the actual cause.
- **Routing has two modes, pick one** — see the commented examples in
  `src/App.tsx`. `BrowserRouter` gives clean URLs (`/about`) but needs the
  host to rewrite unmatched paths to `index.html` (`_redirects` for Netlify,
  `vercel.json` for Vercel are already set up for this). `HashRouter` gives
  `/#/about` URLs but needs zero host configuration — it works unmodified on
  any static host. Don't wire up `BrowserRouter` on a host you haven't
  configured a rewrite rule for; every route but `/` will 404 on reload.

## Failure modes worth knowing about before you hit them

- **Vendored files must end in `.js`/`.mjs`/`.cjs`.** A file saved without
  one gets served with the wrong MIME type by most static file servers, and
  browsers refuse to execute it as an ES module — you'll see `Failed to
  fetch dynamically imported module`, which points nowhere near the actual
  cause. `scripts/vendor-fetch.ts` already forces this; if you ever vendor
  something by hand, do the same.
- **The import map needs the bare `"react-dom"` specifier, not just
  `"react-dom/client"`.** Libraries like react-router-dom import
  `flushSync` from bare `"react-dom"` internally, even though your own code
  might never write that import. Missing it produces `Failed to resolve
  module specifier "react-dom"` from deep inside a vendored file.
- **esm.sh can silently serve the wrong JS target** depending on what HTTP
  client fetched it — always pass `?target=es2022` explicitly on any esm.sh
  URL you construct by hand (`scripts/vendor-fetch.ts` already does this for
  you automatically).

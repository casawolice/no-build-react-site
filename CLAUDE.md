# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This repo *is* a Claude Code skill — not an app. It defines and packages a
reusable pattern ("no-build React site") that gets copied into *other*
projects. There is nothing here to build, lint, or test in the traditional
sense; the deliverable is the skill definition plus a working template under
`assets/`.

Two audiences read this repo:
- **Claude Code**, via `SKILL.md`'s YAML frontmatter (`description:` is what
  triggers the skill — the model reads it verbatim, so edits there must stay
  accurate).
- **Any other coding agent or human**, via `AGENTS.md`, which points at the
  same `SKILL.md` content but ignores the frontmatter.

Keep `SKILL.md` (canonical, English) and `SKILL.zh-CN.md` (Chinese
translation) in sync when editing either — same for the English/Chinese
sections of `README.md`.

## Repo layout

```
SKILL.md              skill definition Claude Code reads (English, canonical)
SKILL.zh-CN.md         Chinese translation for human/中文语境 reference
AGENTS.md              tool-agnostic entry point for non-Claude coding agents
assets/                default (no-build) template, copied verbatim into new projects
  index.html             SPA shell: import map, Tailwind, loader script tags
  runtime/loader.js       in-browser TSX compiler — lives outside src/ on purpose
  src/                   main.tsx, App.tsx, pages/ — shared verbatim with assets-vite/
  scripts/vendor-fetch.ts   recursively vendors an esm.sh package + its imports
  spa-server.ts          Bun+Hono dev server (SPA fallback + port auto-retry)
  package.json, tsconfig.json   editor-only type-checking, never shipped
  _redirects, vercel.json      SPA fallback rules for history-mode routing
  AGENTS.md               ships inside every scaffolded project (ground rules
                          and gotchas for whatever agent works on it later)
assets-vite/           opt-in traditional-build harness, used only when asked for by
                       name — has no src/ of its own, reuses assets/src/ verbatim
  index.html, tailwind.css, vite.config.ts, package.json, tsconfig.json
  _redirects, vercel.json, AGENTS.md
references/            docs loaded as needed by the skill
  gotchas.md              six non-obvious failure modes and their fixes (no-build only)
  vendor-packages.md      required-vs-optional dependency registry with commands
  migrate-to-vite.md      converting an existing no-build project to Vite mode in place
  i18n-pattern.md         optional client-side i18n pattern
evals/evals.json       test prompts used to evaluate this skill
```

## Working on this repo itself

There's no build/lint/test command for the skill repo — changes are almost
always edits to `SKILL.md`/`AGENTS.md`/`references/*.md` (prose) or to the
`assets/` template files. When changing `assets/`, verify the change by
actually scaffolding a throwaway project and running it (see below) — this
skill's own docs stress that everything here was tested end-to-end, not just
written by inspection.

```bash
cp -r assets/. /tmp/scratch-site/
cd /tmp/scratch-site
bun install
bun run vendor -- --preset core --tailwind
bun run test        # starts the dev server on :8000 (auto-retries next port if busy)
```

If the change touched `assets/src/` (shared with `assets-vite/`, see below)
or anything under `assets-vite/`, also verify the Vite path — since
`assets-vite/` has no `src/` of its own, assemble it the same way scaffolding
does:
```bash
mkdir -p /tmp/scratch-vite/src
cp -r assets/src/.    /tmp/scratch-vite/src/
cp -r assets-vite/.   /tmp/scratch-vite/
cd /tmp/scratch-vite
bun install
bun run dev          # or: bun run build && bun run preview
```

`evals/evals.json` holds prompts + expectations used to evaluate whether the
skill produces correct output; update it if the skill's behavior changes in a
way that would change what a passing run looks like.

## Architecture of the scaffolded template (`assets/` + `assets-vite/`)

This is the architecture Claude Code will produce in a *user's* project when
this skill runs — understand it before editing any file under `assets/` or
`assets-vite/`, since a change here changes what every future scaffolded
project looks like.

- **`assets/src/` is the single source of truth for application code.**
  `assets-vite/` has no `src/` of its own; it's assembled from `assets/src/`
  at scaffold time (see the "Working on this repo itself" commands above).
  This only works because `assets/src/` follows two conventions that Vite
  tolerates but doesn't require — see the next two bullets. Never edit
  `assets/src/` in a way that assumes only the no-build loader will run it.
- **Zero build step, on purpose (default mode).** `.tsx`/`.ts` files are
  fetched by the browser as-is and transpiled client-side by
  `runtime/loader.js` (via vendored Sucrase, classic JSX transform) — it
  lives outside `src/` specifically so `src/` is identical in both modes.
  There is no watch process, no bundler, no build artifact directory. Don't
  "fix" this by introducing one; that's what `assets-vite/` is for, and it's
  opt-in only (see `SKILL.md`'s "Two scaffold modes").
- **Local relative imports must include their file extension**
  (`"./components/Header.tsx"`, not `"./Header"`) — the loader resolves
  specifiers with `new URL(spec, absUrl)` and has no bundler-style
  extension-probing step. An omitted extension is a silent failed fetch.
  `assets-vite/tsconfig.json` sets `allowImportingTsExtensions: true`
  specifically so the same convention type-checks under Vite too.
- **Dependencies are vendored, not CDN-loaded.** `scripts/vendor-fetch.ts`
  recursively mirrors an esm.sh module and everything it transitively imports
  into `vendor/`, rewriting every import specifier to a relative local path.
  `--preset core` covers the non-negotiable baseline (react, react-dom,
  react-dom/client, sucrase); everything else is added only if the specific
  project needs it — see `references/vendor-packages.md` for ready commands
  per package and the general rule for anything not listed there. After
  vendoring, the bare specifier must also be added to `index.html`'s
  `<script type="importmap">` or the import won't resolve in the browser.
- **`package.json` / `tsconfig.json` in `assets/` are editor-only.** They give
  VS Code/tsc real type info for `import React from "react"`; the browser
  never reads either file, and `node_modules` must never become a runtime
  dependency of anything under `src/`.
- **Two routing modes, mutually exclusive, pick based on host control:**
  `BrowserRouter` (clean URLs, requires the host to rewrite unmatched paths to
  `index.html` — `_redirects`/`vercel.json` already cover Netlify/Vercel) vs.
  `HashRouter` (`/#/route` URLs, zero host config needed, works unmodified on
  any static host). Wiring up `BrowserRouter` without a matching host rewrite
  rule means every route but `/` 404s on a hard reload.
- **`spa-server.ts` (Bun + Hono)** exists purely for local dev — it mimics the
  production SPA-fallback rewrite so `bun run test` behaves like the real
  host. `/assets/*`, `/src/*`, `/vendor/*` are treated as exact file
  references and 404 if missing (not silently redirected to `index.html`);
  everything else falls back to `index.html` for client-side routing.

## Before debugging anything that "should just work" in a scaffolded project

Read `references/gotchas.md` first. It documents six specific failure modes
discovered in production, each with a fix already baked into `vendor-fetch.ts`
or `spa-server.ts` — e.g. esm.sh silently serving the wrong JS target
depending on the fetching HTTP client, `"react-dom"` needing to be in the
import map even when no app code imports it by that literal name, and a
Hono `serveStatic` `onNotFound` quirk that needs an explicit `c.res =`
assignment to actually stick. All six are specific to the no-build template's
esm.sh-vendoring pipeline — `assets-vite/` uses ordinary `npm`/`vite` tooling
and doesn't hit any of them.

## Converting between the two modes

`references/migrate-to-vite.md` documents converting an *existing* no-build
project to Vite mode in place. Because `src/` already follows the shared
conventions described above, this is just swapping the root-level build
harness (delete `vendor/`/`scripts/`/`runtime/`/`spa-server.ts`, copy in
`assets-vite/`'s files, install real dependencies) — no source rewriting.

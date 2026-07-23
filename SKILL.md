---
name: no-build-react-site
description: Scaffolds a static React website that runs straight in the browser with zero build step — no Vite, no webpack, no esbuild, no bundler at all. Transpiles .tsx/.ts on the fly in-browser and vendors every runtime dependency (React, React DOM, React Router, the in-browser compiler, Tailwind) as local files instead of loading them from a CDN, so the finished site works fully offline and isn't at the mercy of esm.sh/unpkg/jsdelivr uptime or regional blocking. Also sets up a Bun+Hono dev server with SPA history-mode fallback and editor-only TypeScript tooling that never touches the production runtime. Use this skill whenever the user wants to build a static site, landing page, marketing site, or single-page app in React without a bundler; explicitly says "no build step" / "no bundler" / "vendor dependencies locally" / "不要打包工具" / "无构建"; wants to avoid CDN dependencies for offline use, air-gapped environments, or hosting where CDNs are unreliable; or wants React Router history-mode routing on a static host (Netlify/Vercel/GitHub Pages/S3/自建服务器) — even if they don't use the word "skill" or name any of these tools directly. This skill also includes an opt-in traditional-build alternative (Vite + real npm dependencies, output to dist/) for when the user explicitly asks for it — "use Vite" / "传统构建" / "本地构建" / "打包一下" — or has confirmed the zero-build in-browser transpile is too slow for their project; that mode is only ever chosen when the user asks for it by name, never picked automatically. Also handles converting an *existing* no-build project (already scaffolded from this skill) over to the Vite template in place — "convert this to Vite" / "把这个项目转成 Vite" / "迁移到传统构建" — rather than only scaffolding Vite mode fresh.
---

# No-build React site

*A Chinese translation of this document is available at [`SKILL.zh-CN.md`](./SKILL.zh-CN.md)
— this English version is canonical; the frontmatter above (not the translation)
is what the skill system reads for triggering.*

A way to build and ship a real React site — components, hooks, client-side routing,
TypeScript — without a bundler ever entering the picture. The browser fetches
`.tsx` files directly and transpiles them itself. Nothing here is a toy: this
pattern has shipped a production multi-page, 14-language, history-routed site.

## Why this exists (read this before you improvise)

The obvious way to avoid a bundler is "just load React from a CDN with a
`<script type="importmap">`." That gets you 80% of the way and then breaks in
three specific spots — production reliability (CDN goes down or is blocked, your
site goes down with it), correctness (esm.sh silently serves you the wrong build
in some circumstances — see Gotcha 4 below), and editor experience (no CDN means
no `node_modules`, so VS Code can't find types for `import React from "react"`).
Every piece of this skill exists to close one of those gaps. Don't skip the
vendoring step or the tsconfig step because "the CDN version already works" — it
works until it doesn't, silently, in a way that's hard to diagnose later.

## Two scaffold modes — ask if it's not obvious which one

This skill has two independent templates:

- **`assets/`** — the zero-build template this document mostly describes.
  This is the default; use it unless the user says otherwise.
- **`assets-vite/`** — a traditional Vite build (real `npm`/`bun`
  dependencies, `vite build` → `dist/`). Only use this when the user
  explicitly asks for it by name ("use Vite", "传统构建", "本地构建", "I
  don't want the browser doing the transpiling") or has independently told
  you the zero-build in-browser transpile is too slow for their project. Do
  **not** switch to Vite mode on your own judgment (e.g. "this project looks
  big, I'll use Vite instead") — ask the user and let them decide. The
  tradeoff is real in both directions: Vite mode is faster in dev and at
  runtime, but needs Node/Bun and a build step at deploy time, and gives up
  the CDN-independence guarantee the rest of this skill is built around.

**The two templates share one `src/` tree, by design.** `assets-vite/` doesn't
have a `src/` of its own — Vite mode's `src/` is `assets/src/`, copied over
unmodified. That's possible because `assets/src/`'s two conventions (file
extensions on local relative imports, `import React from "react"` in every
file using JSX) aren't strictly required by Vite, but Vite tolerates them
fine, so writing `src/` to satisfy the *stricter* no-build requirements makes
it portable to both modes for free. Never relax either convention just
because a project happens to be in Vite mode right now — doing so silently
breaks portability back to no-build mode (see `assets-vite/AGENTS.md`). This
is also what makes converting an existing project between modes cheap — see
"Migrating an existing no-build project to Vite mode" below.

Everything else — `index.html`, dependency resolution, the build step itself
— is genuinely different per mode and lives in each template's own
root-level files. See "Setting up a new project — Vite mode" below, and
`assets-vite/AGENTS.md` for the Vite-mode-specific ground rules once a
project is scaffolded from it.

## Architecture at a glance

This is the layout for the default (no-build) mode, scaffolded from `assets/`.
Vite mode has its own, simpler layout — see "Setting up a new project — Vite
mode" below.

```
index.html          SPA shell: Tailwind script tag, <script type="importmap">,
                     #root div, loads the runtime loader then main.tsx
src/
  main.tsx           entry point — createRoot(...).render(<App />)
  App.tsx            renders <Home /> directly; add <BrowserRouter> or
                     <HashRouter> here once the site has more than one
                     page (see below)
  pages/*.tsx         one component per page/route
  components/*.tsx    shared UI
  hooks/*.ts
runtime/loader.js   the in-browser TSX compiler (copy verbatim, don't edit;
                     lives outside src/ so src/ is identical in Vite mode)
vendor/              downloaded copies of react, react-dom, sucrase, tailwind
                     (the required baseline) plus whatever optional packages
                     the project needs — see "Vendoring dependencies" below
scripts/
  vendor-fetch.ts     re-run this to add more vendored packages later
spa-server.ts        Bun+Hono dev server (SPA fallback + port auto-retry)
package.json         devDependencies only, for editor type-checking — bun run test
tsconfig.json        editor type-checking only, noEmit: true
_redirects           Netlify-style SPA fallback rule
vercel.json          Vercel-style SPA fallback rule
AGENTS.md            tool-agnostic ground rules for whatever coding agent
                     (Claude Code or otherwise) works on this project later
```

`assets/` in this skill directory is a working copy of all of the above — for a
new project, copy the whole `assets/` tree into the project root and go from
there rather than retyping any of it. These files were tested end-to-end (built,
served, clicked through in a real browser, verified against a from-scratch
reinstall) — they're not sketches.

## Setting up a new project — no-build mode

1. **Copy the template.**
   ```bash
   cp -r <this-skill-dir>/assets/. /path/to/new-project/
   ```
2. **Customize `index.html`** — title, meta description, Tailwind theme colors in
   the inline `tailwind.config`. Leave the `<script type="importmap">` and the two
   loader `<script>` tags at the bottom alone.
3. **Vendor the dependencies** (see below) — this is what makes the site work
   offline, so don't skip it even for a quick prototype:
   ```bash
   cd /path/to/new-project
   bun install                                # editor types only
   bun run vendor -- --preset core --tailwind  # required baseline, downloads vendor/
   ```
   Then look at what the project actually needs (routing? state management?
   forms?) and vendor those too — see "Vendoring dependencies" below, don't
   default to pulling in everything.
4. **Run it:** `bun run test` starts the dev server (default port 8000, auto-
   retries the next port if that one's busy) with the same SPA-fallback behavior
   production needs. Open the printed URL and confirm the starter page renders
   with a working `useState` counter — that proves the whole pipeline (fetch →
   transpile → Blob URL → React render) is actually working, not just serving
   static HTML.
5. **Build out the site:** add files under `src/pages/`. If the project needs
   more than one page, vendor `react-router-dom` (see below) and wire up
   routing in `src/App.tsx` — the commented-out examples already in that file
   show both modes (pick one, see the next step). Every local relative import
   needs its file extension written out — `import { Header } from
   "./components/Header.tsx"`, not `"./components/Header"` — because there's
   no bundler here to go probing for the right extension. This is the one
   habit that takes getting used to; everything else feels like normal React.
   (It's also what keeps `src/` portable to Vite mode unmodified if the
   project ever converts — see "Two scaffold modes" above.)
6. **Pick a routing mode, then deploy accordingly:**
   - **`BrowserRouter` (history mode)** — clean URLs (`/about`), but the host
     must rewrite every unmatched path to `index.html` or a hard reload/direct
     link to `/about` 404s. `_redirects` (Netlify) and `vercel.json` (Vercel)
     are ready to go; for anything else (nginx, S3+CloudFront, a custom
     Node/Bun server) hand them `spa-server.ts` as a reference implementation
     — it's ~40 lines and the fallback logic is the same regardless of what
     serves it. Use this when you control the host's rewrite rules.
   - **`HashRouter` (hash mode)** — URLs look like `/#/about` instead. The
     fragment after `#` never reaches the server, so there's nothing to 404
     and nothing to configure — it works unmodified on any static host, no
     rewrite rule needed at all. Reach for this when the user doesn't control
     the host's config, is deploying to something rewrite-averse (a bare S3
     bucket, GitHub Pages without a 404-redirect trick, an internal file
     share), or just wants one less moving part. The only cost is the `#` in
     the URL — tell the user that trade-off up front so it's their call, not
     a surprise after deploy.

## Vendoring dependencies

`scripts/vendor-fetch.ts` (run via `bun run vendor`) recursively downloads an
esm.sh module *and everything it imports* into `vendor/`, rewriting every import
specifier to a relative local path. This is not a one-line `curl` — esm.sh
serves each package as a thin redirect to a versioned, often deeply-nested real
file, which itself may import more nested files (react-dom imports scheduler,
react-router-dom imports react-router and @remix-run/router, sucrase imports a
handful of sourcemap utilities). The script walks that whole graph.

**Required vs. optional** — `--preset core` fetches the four packages every
project needs (react, react-dom, react-dom/client, sucrase); nothing else is
default. Analyze what the specific project actually needs and vendor only
that: `references/vendor-packages.md` has ready-to-copy commands for the
common cases (routing, state management, forms, icons, data fetching, ...),
each marked with when it's actually worth adding — don't vendor a routing
library for a single-page site, or a state management library before the
project has outgrown React context.

```bash
bun run vendor -- --preset core --tailwind
bun run vendor -- "https://esm.sh/zustand@4.5.5?external=react&target=es2022=zustand.js"  # add one more, if needed
```

For a package not covered in `references/vendor-packages.md`, the same rule
applies to anything on esm.sh: pass `ENTRY_URL=local_filename.js`, and if the
package lists React as a peer dependency, add `?external=react` (and
`,react-dom` if it needs that too) so it doesn't bundle its own duplicate copy
— a duplicate React instance is a classic source of "Invalid hook call"
errors that look unrelated to the actual cause.

After vendoring, add the bare specifier to `index.html`'s import map so `import
X from "your-package"` resolves:
```html
"your-package": "./vendor/your-package.js"
```

Read `references/gotchas.md` before debugging anything that "should just work"
here — six separate, non-obvious failure modes are documented there, each one
discovered by hitting it in production, not anticipated in advance.

## Editor type support (doesn't touch the runtime)

`package.json`'s `devDependencies` and `tsconfig.json` exist purely so VS Code
(or any TS-aware editor) can resolve `import React from "react"` and give you
real autocomplete — the browser never reads either file, and `node_modules`
should stay gitignored. Key settings and why:
- `moduleResolution: "Bundler"` + `allowImportingTsExtensions: true` — matches
  the runtime convention of writing `.tsx` in relative imports; without this TS
  complains about importing files with extensions.
- `jsx: "react"` (the classic transform) — matches `loader.js`'s sucrase config
  (`jsxRuntime: "classic"`), which is why every component file needs `import
  React from "react"` even though it's not referenced by name in the JSX itself.
- `noEmit: true` — this config only ever powers the language server / `tsc
  --noEmit`, it's never used to actually produce JS.

If you add a package that needs its own `@types/*` package, add it to
`devDependencies` and run `bun install` (or `npm install` if the user doesn't
have Bun) — same "types only, never shipped" reasoning as everything else here.

## Setting up a new project — Vite mode

Only follow this path when the user asked for it explicitly (see "Two
scaffold modes" above). It's a real build: `vite build` bundles `src/` into
`dist/`, and `dist/` — not the project root — is what gets deployed.
`assets-vite/` supplies every file *except* `src/`, which comes from
`assets/` — see "Two scaffold modes" above for why that's safe.

```
index.html          Vite's entry HTML: <link rel="stylesheet" href="/tailwind.css">,
                     <script type="module" src="/src/main.tsx">
src/                 identical to the no-build template's src/ — see below
tailwind.css         Tailwind entry (`@import "tailwindcss";`), linked from
                     index.html directly rather than imported from src/, so
                     src/ doesn't need a mode-specific CSS import
vite.config.ts       @vitejs/plugin-react + @tailwindcss/vite
tsconfig.json         real compiler options (jsx: "react-jsx",
                     allowImportingTsExtensions: true so the shared src/'s
                     extension-ful imports still type-check, noEmit: true —
                     tsc still only type-checks, esbuild/swc does the actual
                     transpile via Vite)
package.json         real dependencies — `npm install` produces a working
                     node_modules, unlike the no-build template's editor-only one
_redirects           Netlify-style SPA fallback rule
vercel.json          Vercel-style SPA fallback rule
AGENTS.md            ground rules for this template, including why src/ must
                     keep the no-build conventions even though Vite doesn't
                     require them
```

1. **Copy the template** — `src/` from `assets/`, everything else from
   `assets-vite/`:
   ```bash
   mkdir -p /path/to/new-project/src
   cp -r <this-skill-dir>/assets/src/.    /path/to/new-project/src/
   cp -r <this-skill-dir>/assets-vite/.   /path/to/new-project/
   ```
2. **Customize `index.html`** — title, meta description. Tailwind theme
   customization lives in CSS now (Tailwind v4's CSS-first config via
   `@theme` in `tailwind.css`), not a script-tag config object.
3. **Install dependencies:**
   ```bash
   cd /path/to/new-project
   npm install   # or: bun install — a real install, not editor-only
   ```
4. **Run it:** `npm run dev` starts the Vite dev server with HMR. Open the
   printed URL and confirm the starter page renders with a working `useState`
   counter.
5. **Build out the site:** add files under `src/pages/`. Keep following the
   no-build conventions even though Vite doesn't strictly require them —
   write out file extensions on local relative imports
   (`"./components/Header.tsx"`, not `"./Header"`) and keep `import React
   from "react"` in every file using JSX. This is what keeps `src/` portable
   back to no-build mode; see `assets-vite/AGENTS.md`.
6. **Add packages the normal way:** `npm install <package>` — no vendoring
   step, no import map to maintain.
7. **Pick a routing mode, then deploy accordingly** — same
   `BrowserRouter`/`HashRouter` tradeoff as the no-build template (see step 6
   there for the full explanation); the same `_redirects`/`vercel.json` files
   handle the SPA-fallback side of it here too, independent of which bundler
   produced the site.
8. **Before deploying:** `npm run build` type-checks (`tsc -b`) and produces
   `dist/` — that directory is the deployable artifact, not the project root.
   `npm run preview` serves that build locally so you can sanity-check it
   before shipping.

## Migrating an existing no-build project to Vite mode

For a project that's already scaffolded from `assets/` and now needs to move
to Vite — same opt-in rule applies, only do this when asked. Because `src/`
is already written to the shared conventions (see "Two scaffold modes"
above), this is cheap: swap the root-level build harness, leave `src/`
untouched, no source rewriting involved. `references/migrate-to-vite.md` has
the full step-by-step (remove the no-build-only files, drop in
`assets-vite/`'s files, install real dependencies for whatever the project
had vendored, hand-translate any Tailwind theme customization into CSS).
Verify the result the same way as a fresh scaffold: load it in a browser,
confirm zero console errors, re-run whatever interactive check the project
has, then confirm `npm run build && npm run preview` too.

## Adding client-side i18n (optional)

If the project needs multiple languages, see `references/i18n-pattern.md` for a
React-context-based pattern (JSON dictionaries fetched at runtime, a `useI18n()`
hook, a language switcher) that was built and shipped this way — it slots into
this same no-build architecture without needing anything new vendored, and
works unmodified under Vite mode too since it's just React context and fetch.

## When something breaks

Read `references/gotchas.md` first — it covers the exact failure modes and
fixes for: the import-specifier regex, esm.sh's absolute-path rewriting, the
missing-file-extension MIME type trap, esm.sh silently serving the wrong JS
target, `react-dom` needing to be in the import map even though nothing imports
it by that exact name, and a Hono-specific gotcha in the dev server's 404
handling. These aren't hypothetical edge cases — every one of them broke the
reference implementation at least once before being fixed and documented here.
All six are specific to the no-build template's esm.sh-vendoring pipeline —
Vite mode uses ordinary `npm`/`vite` tooling and doesn't hit any of them.

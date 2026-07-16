# no-build-react-site

A [Claude Code](https://claude.com/claude-code) skill that scaffolds a real, production-shippable React site with **zero build step** — no Vite, no webpack, no esbuild, no bundler at all. `.tsx`/`.ts` files are transpiled on the fly in the browser, and every runtime dependency (React, ReactDOM, React Router, the in-browser compiler, Tailwind) is vendored as a local file instead of loaded from a CDN, so the finished site runs fully offline and isn't at the mercy of esm.sh/unpkg/jsdelivr uptime or regional blocking.

This isn't a toy pattern — it has shipped a production multi-page, 14-language, history-routed site.

## What it sets up

- **Browser-native ES modules + import maps** — `.tsx` files are fetched and transpiled in-browser (via [Sucrase](https://github.com/alangpierce/sucrase)), no build artifacts, no watch process.
- **Local dependency vendoring** — a `vendor-fetch.ts` script recursively mirrors any esm.sh package (and everything it transitively imports) to local files, rewriting every import specifier to a relative path. A required/optional registry (`references/vendor-packages.md`) tells you what every project needs (React core) versus what's situational (routing, state management, forms, icons, ...).
- **Bun + Hono dev server** — SPA history-mode fallback, automatic port retry if the default port is busy.
- **Two React Router modes** — `BrowserRouter` (clean URLs, needs a host rewrite rule — `_redirects`/`vercel.json` included) or `HashRouter` (`/#/route` URLs, zero host configuration needed, works on any static host unmodified).
- **Editor-only TypeScript tooling** — `tsconfig.json` + `package.json` devDependencies so VS Code resolves `import React from "react"` with real autocomplete, without any of it touching the production runtime or requiring `node_modules` at deploy time.

## Why not just use a CDN import map?

That gets you most of the way and then breaks in three specific spots: production reliability (the CDN goes down or is blocked, your site goes down with it), correctness (esm.sh can silently serve the wrong build under certain fetch clients — see `references/gotchas.md`), and editor experience (no CDN means no `node_modules`, so your editor can't resolve types). Vendoring dependencies locally closes all three gaps at once.

## Using this as a Claude Code skill

Drop (or symlink) this repo into a skills directory Claude Code looks at:

```bash
git clone git@github.com:casawolice/no-build-react-site.git ~/.agents/skills/no-build-react-site
ln -s ../../.agents/skills/no-build-react-site ~/.claude/skills/no-build-react-site   # global, all projects
# or, for a single project:
git clone git@github.com:casawolice/no-build-react-site.git /path/to/project/.claude/skills/no-build-react-site
```

Once installed, Claude Code triggers it automatically whenever you ask for a static site / landing page / SPA in React without a bundler, say "no build step" / "不要打包工具" / "无构建", need to avoid CDN dependencies for offline or air-gapped use, or want React Router on a static host. You don't need to name the skill explicitly.

## Repo layout

```
SKILL.md            skill definition Claude Code reads (English, canonical)
SKILL.zh-CN.md       Chinese translation for human/中文语境 reference
assets/              working template copied into new projects as-is
  index.html           SPA shell: import map, Tailwind, loader script tags
  src/                 main.tsx, App.tsx, pages/, runtime/loader.js (the TSX compiler)
  scripts/vendor-fetch.ts   re-run this to vendor more packages later
  spa-server.ts        Bun+Hono dev server (SPA fallback + port auto-retry)
  package.json, tsconfig.json   editor-only type-checking, never shipped
  _redirects, vercel.json      SPA fallback rules for history-mode routing
references/          docs loaded as needed
  gotchas.md            six non-obvious failure modes and their fixes
  vendor-packages.md    required-vs-optional dependency registry with ready commands
  i18n-pattern.md        optional client-side i18n pattern (React context + JSON dicts)
evals/evals.json    test prompts used to evaluate this skill
```

## Documentation

Start with [`SKILL.md`](./SKILL.md) (or [`SKILL.zh-CN.md`](./SKILL.zh-CN.md) for the Chinese translation) — it walks through setting up a new project end to end. `references/` has the deeper material: what to vendor and when, the failure modes worth knowing about before you hit them, and the optional i18n pattern.

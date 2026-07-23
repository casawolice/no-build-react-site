# Migrating an existing no-build project to Vite mode

For a project that was already scaffolded from `assets/` (the zero-build
template) and now needs to move to `assets-vite/`'s traditional build —
typically because the zero-build in-browser transpile has been confirmed too
slow for that project.

This is a cheap conversion, not a rewrite: `assets/src/` and `assets-vite/`'s
`src/` are the *same* source tree by convention (see `assets-vite/AGENTS.md`
— every no-build project's `src/` already follows the two conventions
`assets-vite` relies on: file extensions on local relative imports, and
`import React from "react"` in every file using JSX). So converting is
swapping the root-level build harness around an unchanged `src/`, not editing
application code.

Only do this when the user has explicitly asked for the conversion (same
opt-in rule as choosing Vite mode for a new project — see `SKILL.md`'s "Two
scaffold modes"). Do the conversion in place inside the existing project
directory, and verify the result in a browser before calling it done — the
same "don't just assert it works" standard the rest of this skill holds to.

## 1. Remove the no-build-only files

These have no role once Vite is doing the bundling:
```bash
cd /path/to/project
rm -rf vendor scripts runtime
rm -f  spa-server.ts
```

## 2. Drop in the Vite harness

```bash
cp -r <this-skill-dir>/assets-vite/. /path/to/project/
```
This overwrites `index.html`, `package.json`, `tsconfig.json`, `_redirects`,
`vercel.json`, and `AGENTS.md` with the Vite-mode versions, and adds
`vite.config.ts` and `tailwind.css`. `src/` is untouched — nothing in
`assets-vite/` includes a `src/` of its own, precisely so this step can't
clobber the project's actual content.

Before overwriting `package.json`, check whether the project's existing one
has a customized `name` field worth keeping (`assets-vite/package.json`'s is
just `"my-site"`), and re-apply it.

## 3. Re-vendor nothing, install for real

```bash
npm install   # or: bun install — this installs react, react-dom, and
              # whatever else the project's old import map listed, as real
              # dependencies now instead of vendored files
```
If the project had vendored optional packages beyond the core baseline
(`react-router-dom`, `zustand`, etc. — check the *old* `index.html`'s import
map, now gone, or `git diff` if the project is under version control), add
those too: `npm install react-router-dom` etc. You don't need to match the
exact vendored version — a plain `npm install <package>` pulls current
latest.

## 4. Carry over any Tailwind theme customization

If the old `index.html` had a customized inline `tailwind.config` (colors,
fonts, etc. under `theme.extend`), that's the one piece that doesn't transfer
automatically — Tailwind v4's CSS-first config has no JS object to inherit
from. Hand-translate it into `tailwind.css`'s `@theme` block, e.g.:
```js
// old, in the no-build index.html's <script>:
tailwind.config = { theme: { extend: { colors: { brand: "#1d4ed8" } } } };
```
becomes:
```css
/* new, in tailwind.css, alongside @import "tailwindcss"; */
@theme {
  --color-brand: #1d4ed8;
}
```
Read what the project actually customized and translate it deliberately —
don't skip this and leave the site unstyled.

## 5. Verify

```bash
npm run dev
```
Open the printed URL in a browser and re-run whatever interactive check the
project has (a `useState` counter, a route change, whatever proves it's not
just static HTML) — confirm zero console errors. Then confirm the production
path too:
```bash
npm run build && npm run preview
```
If `npm run build` surfaces type errors that never showed up under the
no-build template's looser tsconfig, fix them now — don't suppress them.
`_redirects` and `vercel.json` need no further changes; the SPA-fallback rule
is identical regardless of which bundler produced the site.

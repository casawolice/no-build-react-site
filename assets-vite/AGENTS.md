# AGENTS.md

This project uses a **traditional Vite build step** — `npm run build` (or
`bun run build`) bundles `src/` into `dist/`, and `dist/` is what actually
gets deployed. This is the opposite deployment tradeoff of this same skill's
other template (the zero-build, browser-transpiled one): faster dev/runtime
performance, at the cost of needing Node/Bun and a build step at deploy time.
Don't "helpfully" strip the build step back out — that's a different scaffold
entirely (the `no-build-react-site` skill's default template), not a
simplification of this one.

## `src/` is shared with the no-build template — keep it that way

This is the important one. `src/` in this project is written to run
*unmodified* under either build mode, so a project can switch between them
(or be evaluated with both) without rewriting application code. That only
works because `src/` follows the no-build template's conventions even though
Vite doesn't require them:

- **Local relative imports keep their file extension** —
  `import { Header } from "./components/Header.tsx"`, not `"./Header"`. Vite
  doesn't need the extension, but it tolerates it fine (this project's
  `tsconfig.json` sets `allowImportingTsExtensions: true` for exactly this
  reason). Don't "clean up" these to the more idiomatic extension-less form —
  doing so silently breaks compatibility with the no-build loader, which
  *does* require the extension (it has no bundler to probe candidates).
- **Every file that uses JSX still writes `import React from "react"`**, even
  though this project's `jsx: "react-jsx"` (automatic runtime) doesn't need
  it — it's an unused import here, not an error. The no-build template's
  classic transform *does* need it. Don't strip these either.

If you're asked to add a package that only makes sense in one mode, or to
write code that can't reasonably follow both conventions, that's a signal to
ask the user whether this project actually still needs to stay portable
between modes — don't silently break the shared-`src/` guarantee.

## Other ground rules

- **Dependencies are real npm packages in `package.json`**, installed via
  `npm install` / `bun install` — there's no `vendor/` directory and no
  vendoring script in this template. Add a package the normal way
  (`npm install some-package`) and import it directly.
- **`npm run dev`** starts the Vite dev server (HMR, fast refresh).
  **`npm run build`** type-checks (`tsc -b`) then produces the deployable
  `dist/`. **`npm run preview`** serves that `dist/` build locally so you can
  sanity-check the production bundle before deploying.
- **Routing has two modes, pick one** — see the commented examples in
  `src/App.tsx`. `BrowserRouter` gives clean URLs (`/about`) but needs the
  host to rewrite unmatched paths to `index.html` (`_redirects` for Netlify,
  `vercel.json` for Vercel are already set up for this — same rule as the
  no-build template, independent of which bundler is in use). `HashRouter`
  gives `/#/about` URLs but needs zero host configuration.
- **Tailwind's entry point is `tailwind.css` at the project root** (`@import
  "tailwindcss";`), linked from `index.html` with a plain `<link
  rel="stylesheet">` rather than imported from `src/main.tsx` — that keeps
  `src/` identical to the no-build template's, which has no CSS import at
  all (it loads Tailwind via a CDN `<script>` tag instead). Tailwind's own
  content-detection still scans the whole project regardless of where the
  CSS entry file sits, so this doesn't cost anything.

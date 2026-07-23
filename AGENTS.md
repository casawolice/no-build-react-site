# AGENTS.md

This repo is a reusable pattern for building a real, production-shippable React
site with **zero build step** — no Vite, no webpack, no esbuild. It's packaged
as a [Claude Code skill](./SKILL.md), but nothing about the pattern itself is
Claude-specific: if you're a different coding agent (or a human) and were
pointed at this repo, you can follow it directly.

Read [`SKILL.md`](./SKILL.md) (or [`SKILL.zh-CN.md`](./SKILL.zh-CN.md) for
Chinese) for the full walkthrough — ignore the YAML frontmatter at the top,
that's only for Claude's own skill-triggering system. Everything below the
frontmatter is a normal step-by-step guide that works regardless of what
agent or editor is reading it.

## The short version

1. Copy `assets/` into the target project directory — it's a complete,
   working starter (SPA shell, TSX loader, dev server, editor tooling).
2. Vendor the required dependencies locally instead of loading them from a
   CDN: `bun install && bun run vendor -- --preset core --tailwind`. Add
   anything else the project actually needs (routing, state management, ...)
   the same way — see `references/vendor-packages.md` for ready commands and
   `assets/scripts/vendor-fetch.ts` for the general rule (works for any
   esm.sh package, not just the ones listed there).
3. Build the site under `assets/src/pages/`. Every local relative import
   needs its file extension written out (`"./Header.tsx"`, not `"./Header"`)
   — there's no bundler here to probe for it.
4. Run it with `bun run test` (Bun + Hono dev server, SPA fallback, auto
   port retry).
5. Before deploying, pick a router mode (see `assets/src/App.tsx`'s comments)
   and set up the matching host config — already included for Netlify/Vercel.

`references/gotchas.md` documents six specific, non-obvious failure modes
worth reading before you debug something that "should just work." A copy of
the load-bearing ones also ships inside `assets/AGENTS.md`, so once a project
is scaffolded from this template, any agent working in *that* project — this
one, or otherwise — has them without needing to come back to this repo.

## Opt-in alternative: traditional Vite build

`assets-vite/` is a second template: a normal Vite + React + TypeScript build
harness (real `npm`/`bun` dependencies, `vite build` → `dist/`). It exists
for cases where the zero-build in-browser transpile turns out to be too slow
for a given project. Only use it when explicitly asked for — never switch to
it on your own judgment, since it gives up the CDN-independence and offline
guarantees the rest of this repo is built around.

`assets-vite/` has no `src/` of its own — it shares `assets/src/` verbatim,
because that `src/` already follows two conventions Vite tolerates but
doesn't require (file extensions on local relative imports, `import React
from "react"` in every JSX file), which is what makes one `src/` work
unmodified under either build mode. This is also why converting an existing
no-build project to Vite mode is cheap: swap the root-level harness files,
leave `src/` untouched — see `references/migrate-to-vite.md`.

See `SKILL.md`'s "Two scaffold modes" and "Setting up a new project — Vite
mode" sections for the full walkthrough, and `assets-vite/AGENTS.md` for that
template's ground rules once scaffolded.

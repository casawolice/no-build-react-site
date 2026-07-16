# Vendoring package registry

A curated list of `bun run vendor -- ...` commands for the packages a no-build
React site most commonly needs, split into **required** (every project needs
these to run at all) and **optional** (add only the ones the actual project
needs — don't vendor things "just in case").

## How to use this when setting up a project

1. Always run the required baseline first.
2. Read the project's actual requirements (does it need routing? state
   management? a form library? icons?) and vendor only the optional packages
   that apply. Don't default to vendoring everything in this file — a landing
   page with no routing doesn't need `react-router-dom`, and most sites don't
   need a state management library at all until they demonstrably do.
3. For each optional package you add, also add its entry to `index.html`'s
   `<script type="importmap">` (shown per-package below) — vendoring the files
   without mapping the bare specifier still leaves `import X from "package"`
   unresolved in the browser.
4. If the project needs a package that isn't in this table, see "Anything not
   listed here" at the bottom — the same rule extends to any esm.sh-hosted
   package.

## Required — every project needs these

The no-build pipeline itself can't run without these four; they're what
`--preset core` fetches.

```bash
bun run vendor -- --preset core
```

| Package | Import map entry |
|---|---|
| react | `"react": "./vendor/react.js"` |
| react-dom | `"react-dom": "./vendor/react-dom.js"` |
| react-dom/client | `"react-dom/client": "./vendor/react-dom-client.js"` |
| sucrase | (not imported by app code — only `src/runtime/loader.js` uses it) |

(`react-dom` itself — not just `/client` — has to be mapped even though your
own code probably never imports it directly; see `references/gotchas.md` #5
for why.)

## Optional — add based on what the project actually needs

### Routing — react-router-dom
Needed the moment a site has more than one page/view and you want URLs to
reflect that (which is most non-trivial sites — evaluate this one first).
```bash
bun run vendor -- "https://esm.sh/react-router-dom@6.26.2?external=react,react-dom&target=es2022=react-router-dom.js"
```
Import map: `"react-router-dom": "./vendor/react-router-dom.js"`. Also wire up
`<BrowserRouter>` in `src/App.tsx` and remember the deployment-side fallback
rule (`_redirects` / `vercel.json`, already in the starter template) — history
mode routing 404s on a hard reload without it.

### Conditional classNames — clsx
Tiny, no peer dependencies, useful the moment you have more than one or two
conditional Tailwind classes on an element.
```bash
bun run vendor -- "https://esm.sh/clsx@2.1.1?target=es2022=clsx.js"
```
Import map: `"clsx": "./vendor/clsx.js"`.

### Lightweight state management — zustand
For state shared across components that doesn't fit cleanly in React context /
prop drilling. Don't reach for this before you actually have that problem.
```bash
bun run vendor -- "https://esm.sh/zustand@4.5.5?external=react&target=es2022=zustand.js"
```
Import map: `"zustand": "./vendor/zustand.js"`.

### Data fetching / caching — @tanstack/react-query
For a site that fetches from a real API and wants caching, retries, and
loading/error state out of the box, instead of hand-rolled `useEffect` fetch
logic.
```bash
bun run vendor -- "https://esm.sh/@tanstack/react-query@5.59.0?external=react,react-dom&target=es2022=tanstack-react-query.js"
```
Import map: `"@tanstack/react-query": "./vendor/tanstack-react-query.js"`.

### Animation — framer-motion
For real enter/exit/gesture animation beyond what CSS transitions handle
comfortably. It's a fairly large package — only add it if the project actually
has animation requirements, not by default for a marketing site.
```bash
bun run vendor -- "https://esm.sh/framer-motion@11.11.7?external=react,react-dom&target=es2022=framer-motion.js"
```
Import map: `"framer-motion": "./vendor/framer-motion.js"`.

### Icons — lucide-react
A large icon set as tree-shakeable named exports. Note: esm.sh will still
recursively vendor icons you don't import if you fetch the whole package
un-scoped — for a small, fixed icon set consider vendoring only the specific
icon submodules the project uses instead of the whole library.
```bash
bun run vendor -- "https://esm.sh/lucide-react@0.454.0?external=react&target=es2022=lucide-react.js"
```
Import map: `"lucide-react": "./vendor/lucide-react.js"`.

### Forms — react-hook-form
For anything beyond a couple of controlled inputs — validation wiring,
performance on large forms, less re-render boilerplate.
```bash
bun run vendor -- "https://esm.sh/react-hook-form@7.53.1?external=react&target=es2022=react-hook-form.js"
```
Import map: `"react-hook-form": "./vendor/react-hook-form.js"`.

### Date utilities — date-fns
No peer dependencies, but it's split into hundreds of small per-function
modules — vendoring the whole package pulls all of them down. If the project
only needs a couple of functions, it's worth fetching just those submodules
(e.g. `https://esm.sh/date-fns@4.1.0/format?target=es2022`) instead of the
whole package.
```bash
bun run vendor -- "https://esm.sh/date-fns@4.1.0?target=es2022=date-fns.js"
```
Import map: `"date-fns": "./vendor/date-fns.js"`.

### Schema validation — zod
No peer dependencies. Common alongside react-hook-form for form validation, or
for validating data from an API.
```bash
bun run vendor -- "https://esm.sh/zod@3.23.8?target=es2022=zod.js"
```
Import map: `"zod": "./vendor/zod.js"`.

### Markdown rendering — react-markdown
For rendering user-authored or CMS-sourced Markdown as React elements safely
(no `dangerouslySetInnerHTML`).
```bash
bun run vendor -- "https://esm.sh/react-markdown@9.0.1?external=react&target=es2022=react-markdown.js"
```
Import map: `"react-markdown": "./vendor/react-markdown.js"`.

## Anything not listed here

Every entry above follows the same three rules — apply them to vendor any
other esm.sh-hosted package the project needs:

1. `bun run vendor -- "https://esm.sh/PACKAGE@VERSION=local-filename.js"` —
   look up the current version on npm first rather than guessing.
2. If the package lists `react` and/or `react-dom` as a `peerDependency` in its
   `package.json` (check `https://esm.sh/PACKAGE@VERSION/package.json` if
   unsure), add `?external=react` or `?external=react,react-dom` — otherwise
   you get a second bundled copy of React and likely an "Invalid hook call"
   error that looks unrelated to the real cause.
3. `vendor-fetch.ts` auto-appends `target=es2022` if you don't specify one, so
   you don't strictly have to add it yourself — but being explicit matches the
   pattern above and makes the intent obvious to the next person reading it.

Then add the matching bare-specifier entry to `index.html`'s import map, same
as every package above.

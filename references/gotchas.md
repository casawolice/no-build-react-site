# Gotchas

Every one of these was discovered by hitting it, not by anticipating it. If
something in a no-build React site is failing silently or in a confusing way,
check here before assuming the whole approach is broken — it's more likely one
of these five specific things.

## 1. Local relative imports must include the file extension

```ts
// Right:
import { Header } from "./components/Header.tsx";
// Wrong — will fail to resolve, since there's no bundler to probe extensions:
import { Header } from "./components/Header";
```

`loader.js` finds import specifiers with a regex and resolves relative ones
(`./`, `../`) against the current file's URL via `new URL(spec, absUrl)`. There's
no bundler-style extension-probing step (`.tsx`, then `.ts`, then `.jsx`...) —
that would mean an extra failed network request per candidate extension, on
every single import, on every load. Requiring the extension up front is a
one-time habit change that keeps the runtime simple and fast.

## 2. esm.sh serves nested absolute paths, not the raw package

Fetching `https://esm.sh/react@18.3.1` doesn't get you React — it gets you a
three-line file that says `export * from "/react@18.3.1/es2022/react.mjs"`. That
path is *absolute* (esm.sh-rooted, not relative to the file it's in), and
deeper packages nest further (react-dom re-exports from a path that itself
imports scheduler from yet another absolute path). `vendor-fetch.ts` handles
this by treating any specifier starting with `/` as "resolve against esm.sh's
domain, fetch it, then rewrite this specifier to a relative path pointing at
wherever I saved it locally." If you're vendoring something by hand instead of
using the script, you have to do this rewriting yourself or the site will try to
fetch `https://yoursite.com/react@18.3.1/es2022/react.mjs` in production and 404.

## 3. Files without an extension get the wrong MIME type and silently fail

Some of esm.sh's intermediate "version redirect" files have URLs like
`/scheduler@^0.23.2` — no extension. If you save that locally as a file named
exactly `scheduler@^0.23.2` (or the caret-sanitized `scheduler@caret0.23.2`) with
no extension, a plain static file server (Python's `http.server`, a naive Bun/
Node server) can't guess its MIME type from the filename and serves it as
`application/octet-stream`. Browsers refuse to execute that as an ES module —
you get `Failed to fetch dynamically imported module`, which points nowhere
near the actual cause. The fix (already in `vendor-fetch.ts`'s `sanitize()`
function) is to force a `.js` extension onto every locally-saved file that
doesn't already have `.js`/`.mjs`/`.cjs`. If you ever vendor something by hand,
do the same.

## 4. esm.sh sniffs your HTTP client and can serve the wrong JS target

`curl` and Python's `urllib` happen to get sniffed by esm.sh as "browser," so
`https://esm.sh/react@18.3.1` resolves to the `es2022/` (browser-safe) build.
Bun's built-in `fetch()` gets sniffed differently and — without an explicit
target — you can silently end up with the `node/` build instead, which may
contain Node-specific interop code that doesn't run in a browser. This is *not*
a loud failure; the download succeeds, the file looks like normal JS, and it
can work in some cases and break in others depending on what the Node build
happens to contain. Don't rely on sniffing at all: always pass `?target=es2022`
(or append it if the URL already has other query params) explicitly.
`vendor-fetch.ts`'s `ensureBrowserTarget()` does this automatically for every
entry — if you're constructing esm.sh URLs by hand anywhere, do the same.

## 5. The import map needs `"react-dom"`, not just `"react-dom/client"`

It's tempting to only map the specifiers you literally write `import from` in
your own code — which for most apps is `"react"`, `"react-dom/client"`, and
`"react-router-dom"`. But react-router-dom's own internals `import ... from
"react-dom"` (the bare specifier, not `/client`) for `flushSync`. If
`"react-dom"` isn't in the import map, you get `Failed to resolve module
specifier "react-dom"` from deep inside a vendored file, which is confusing
because you never wrote that import yourself. Map all four: `react`,
`react-dom`, `react-dom/client`, `react-router-dom` — the starter `index.html`
already does this.

## 6. Hono's `serveStatic` `onNotFound` needs an explicit `c.res =` to stick

If you're using the bundled `spa-server.ts` and want to add another "these
should 404, not fall back to index.html" path prefix (beyond `/assets`, `/src`,
`/vendor`), the callback signature is `(path, context)` — easy to get backwards
and pass just one argument. And setting the response isn't as simple as calling
`c.notFound()` — that just *returns* a Response, it doesn't attach it to the
request. You have to explicitly do:

```ts
const exactFileNotFound = async (_path: string, c: Context) => {
  c.res = await c.notFound();
};
```

Assigning to `c.res` is what marks the context "finalized," which is what stops
the later catch-all `serveStatic({ path: "./index.html" })` route from
overriding your 404 with a fallback 200. Skip the assignment and every 404
silently becomes a 200 serving `index.html`'s HTML — which, if you're debugging
a missing file, looks exactly like the file loaded successfully until you
notice the content is wrong.

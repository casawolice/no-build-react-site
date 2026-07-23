// No-build TSX runtime: fetches .tsx/.ts sources, transpiles them in-browser with
// sucrase, and stitches relative imports together via Blob URLs so the app can run
// straight from static files with no bundler.
//
// Convention: every local relative import must include its file extension
// (e.g. "./components/Header.tsx"), since there is no bundler here to probe for one.
// Bare specifiers (e.g. "react", "react-router-dom") are left untouched and resolved
// by the <script type="importmap"> in index.html — blob: URL modules still honor the
// document's import map for bare specifiers.
import { transform } from "../vendor/sucrase.js";

const blobUrlCache = new Map(); // absolute source URL -> Promise<blob: URL>

const SPEC_RE = /(?:\bfrom\s*["']([^"']+)["'])|(?:\bimport\s*\(\s*["']([^"']+)["']\s*\))|(?:\bimport\s*["']([^"']+)["'])/g;

function findRelativeSpecifiers(src) {
  const specs = new Set();
  let m;
  SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(src))) {
    const spec = m[1] || m[2] || m[3];
    if (spec && (spec.startsWith("./") || spec.startsWith("../"))) specs.add(spec);
  }
  return specs;
}

function replaceSpecifier(src, spec, blobUrl) {
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return src.replace(new RegExp(`(["'])${escaped}\\1`, "g"), `$1${blobUrl}$1`);
}

async function resolveModule(absUrl) {
  if (blobUrlCache.has(absUrl)) return blobUrlCache.get(absUrl);

  const promise = (async () => {
    const res = await fetch(absUrl);
    if (!res.ok) throw new Error(`tsx-loader: failed to fetch ${absUrl} (${res.status})`);
    let src = await res.text();

    for (const spec of findRelativeSpecifiers(src)) {
      const childAbs = new URL(spec, absUrl).href;
      const childBlobUrl = await resolveModule(childAbs);
      src = replaceSpecifier(src, spec, childBlobUrl);
    }

    const { code } = transform(src, {
      transforms: ["jsx", "typescript"],
      jsxRuntime: "classic",
      production: true,
      filePath: absUrl,
    });

    return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  })();

  blobUrlCache.set(absUrl, promise);
  return promise;
}

async function runModuleTsx(scriptEl) {
  const src = scriptEl.getAttribute("src");
  const absUrl = new URL(src, location.href).href;
  const blobUrl = await resolveModule(absUrl);
  await import(blobUrl);
}

document.querySelectorAll('script[type="module-tsx"]').forEach((el) => {
  runModuleTsx(el).catch((err) => {
    console.error("tsx-loader failed:", err);
    document.body.innerHTML = `<pre style="color:#f66;padding:2rem;white-space:pre-wrap;">${String(err.stack || err)}</pre>`;
  });
});

#!/usr/bin/env bun
// Recursively mirror an esm.sh ES module (and everything it transitively imports)
// into a local vendor/ directory, rewriting import specifiers to relative local
// paths so the whole tree works fully offline with no further network access.
//
// Why this exists: esm.sh serves each package as a thin re-export wrapper pointing
// at a versioned, deeply-nested "real" file (sometimes with more nested
// dependencies of its own, e.g. react-dom -> scheduler). A plain fetch/curl only
// gets you the wrapper. This script follows every absolute (esm.sh-rooted) and
// relative import it finds, downloads each file exactly once, and rewrites every
// specifier it touched to a relative local path -- so the resulting tree needs
// zero further rewriting to work as static files served from any plain web server.
//
// Usage (see the "vendor" script in package.json):
//   bun run vendor -- --preset core --tailwind      # required baseline every project needs
//   bun run vendor -- "https://esm.sh/react-router-dom@6.26.2?external=react,react-dom=react-router-dom.js"
// See references/vendor-packages.md for ready-to-copy commands for common
// optional packages (routing, state management, forms, icons, ...) and the
// general rule for anything not listed there.
//
// Two gotchas baked in as fixes here, learned the hard way:
// 1. esm.sh's internal "version redirect" files (e.g. "scheduler@^0.23.2") have no
//    file extension. A plain static file server can't guess their MIME type from
//    that and serves them as application/octet-stream, which browsers refuse to
//    execute as an ES module. Every local file this script writes is guaranteed a
//    .js/.mjs extension.
// 2. import specifiers in minified code are often written `from"react"` with no
//    space -- a naive regex requiring `from\s+"` misses these. The regex here uses
//    `\s*` (zero or more), matching both.
import { mkdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const BASE = "https://esm.sh";

// The absolute minimum every project needs -- without these the loader itself
// can't run, regardless of what the site actually does. Routing, styling
// helpers, state management, etc. are all optional and project-dependent; see
// references/vendor-packages.md for those instead of hardcoding them here.
const CORE_PRESET: Array<[url: string, localName: string]> = [
  ["https://esm.sh/react@18.3.1", "react.js"],
  ["https://esm.sh/react-dom@18.3.1?external=react", "react-dom.js"],
  ["https://esm.sh/react-dom@18.3.1/client?external=react,react-dom", "react-dom-client.js"],
  ["https://esm.sh/sucrase@3.35.0", "sucrase.js"],
];

const SPEC_RE = /(?:\bfrom\s*["']([^"']+)["'])|(?:\bimport\s*\(\s*["']([^"']+)["']\s*\))|(?:\bimport\s*["']([^"']+)["'])/g;

function sanitize(pathNoQuery: string): string {
  let p = pathNoQuery.replace(/^\//, "").replaceAll("^", "caret").replaceAll("~", "tilde");
  if (!/\.(m?js|cjs)$/.test(p)) p += ".js";
  return p;
}

const visited = new Map<string, string>(); // remote path+query -> local relative path

async function fetchModule(vendorRoot: string, remotePathWithQuery: string, localRelOverride?: string): Promise<string> {
  const cached = visited.get(remotePathWithQuery);
  if (cached) return cached;

  const pathOnly = remotePathWithQuery.split("?")[0]!;
  const localRel = localRelOverride ?? sanitize(pathOnly);
  const localAbs = join(vendorRoot, localRel);
  visited.set(remotePathWithQuery, localRel); // reserve before recursing (cycle safety)

  const url = BASE + remotePathWithQuery;
  console.error(`fetching ${url} -> ${localRel}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  let text = await res.text();

  await mkdir(dirname(localAbs), { recursive: true });

  function resolveChild(spec: string): string {
    if (spec.startsWith("/")) return spec; // already an esm.sh absolute path(+query)
    const remoteDir = pathOnly.slice(0, pathOnly.lastIndexOf("/"));
    let child = new URL(spec, BASE + remoteDir + "/").toString();
    if (child.startsWith(BASE)) child = child.slice(BASE.length);
    return child;
  }

  // fetch() is async, so specifiers must be resolved+downloaded before rewriting
  // the text -- can't do this inside a synchronous String.replace callback.
  const specs = new Set<string>();
  for (const m of text.matchAll(SPEC_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (spec && (spec.startsWith("/") || spec.startsWith("./") || spec.startsWith("../"))) {
      specs.add(spec);
    }
  }

  for (const spec of specs) {
    const childRemote = resolveChild(spec);
    const childLocalRel = await fetchModule(vendorRoot, childRemote);
    let rel = relative(dirname(localAbs), join(vendorRoot, childLocalRel));
    if (!rel.startsWith(".")) rel = "./" + rel;
    const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`(["'])${escaped}\\1`, "g"), `$1${rel}$1`);
  }

  await Bun.write(localAbs, text);
  return localRel;
}

async function fetchTailwind(vendorRoot: string): Promise<void> {
  const out = join(vendorRoot, "tailwind.js");
  console.error("fetching https://cdn.tailwindcss.com (following redirect) -> tailwind.js");
  const res = await fetch("https://cdn.tailwindcss.com");
  if (!res.ok) throw new Error(`Failed to fetch tailwind: ${res.status}`);
  await Bun.write(out, await res.arrayBuffer());
}

function parseArgs(argv: string[]) {
  let vendorDir = "./vendor";
  let preset: "core" | undefined;
  let tailwind = false;
  const entries: Array<[string, string]> = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--vendor-dir") {
      vendorDir = argv[++i] ?? vendorDir;
    } else if (arg === "--preset") {
      const value = argv[++i];
      if (value !== "core") throw new Error(`Unknown preset: ${value}`);
      preset = value;
    } else if (arg === "--tailwind") {
      tailwind = true;
    } else if (arg.includes("=")) {
      const idx = arg.lastIndexOf("=");
      entries.push([arg.slice(0, idx), arg.slice(idx + 1)]);
    } else {
      throw new Error(`Unrecognized argument: ${arg}`);
    }
  }
  return { vendorDir, preset, tailwind, entries };
}

// esm.sh auto-detects the target JS syntax level from the requester's User-Agent
// (browser vs Node vs Deno), and Bun's fetch() gets sniffed as Node -- which
// silently serves back a Node.js-targeted build (CommonJS interop, Node built-in
// shims) instead of a browser-safe one. Force the browser-safe target explicitly
// rather than relying on that sniffing.
function ensureBrowserTarget(url: string, target = "es2022"): string {
  if (/[?&]target=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + `target=${target}`;
}

async function main() {
  const { vendorDir, preset, tailwind, entries: extraEntries } = parseArgs(process.argv.slice(2));

  const entries = (preset === "core" ? [...CORE_PRESET] : []).map(
    ([url, name]) => [ensureBrowserTarget(url), name] as [string, string]
  );
  entries.push(...extraEntries.map(([url, name]) => [ensureBrowserTarget(url), name] as [string, string]));

  if (entries.length === 0 && !tailwind) {
    console.error("Nothing to do -- pass --preset core, --tailwind, and/or explicit ENTRY_URL=local_filename.js args.");
    process.exit(1);
  }

  await mkdir(vendorDir, { recursive: true });

  for (const [entryUrl, outName] of entries) {
    if (!entryUrl.startsWith(BASE)) throw new Error(`Only esm.sh URLs are supported, got: ${entryUrl}`);
    await fetchModule(vendorDir, entryUrl.slice(BASE.length), outName);
  }

  if (tailwind) await fetchTailwind(vendorDir);

  console.error(`\nDone -- ${visited.size + (tailwind ? 1 : 0)} files in ${vendorDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

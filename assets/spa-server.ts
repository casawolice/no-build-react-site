// Local dev server that falls back unmatched paths to index.html, mimicking the
// SPA rewrite rule the production host must configure for history-mode routing.
// Run with `bun run test` (see package.json) -- Bun + Hono are dev-only tooling
// here, the production site itself still ships zero runtime dependencies and
// loads everything from vendor/ via the <script type="importmap"> in index.html.
import { Hono, type Context } from "hono";
import { serveStatic } from "hono/bun";

const app = new Hono();

// These paths are always concrete file references (imports, <img> src, i18n
// dictionaries, etc.) -- a missing file here is a bug and should 404, not
// silently fall back to index.html. Add more prefixes here if your project
// serves other top-level static directories.
const exactFileNotFound = async (_path: string, c: Context) => {
  c.res = await c.notFound();
};
for (const prefix of ["/assets/*", "/src/*", "/vendor/*"]) {
  app.use(prefix, serveStatic({ root: "./", onNotFound: exactFileNotFound }));
}

// Everything else: serve the matching static file if one exists (index.html,
// favicon, etc.), otherwise fall back to index.html so React Router's
// history-mode routes (e.g. /about) work on a hard reload.
app.use("*", serveStatic({ root: "./" }));
app.get("*", serveStatic({ path: "./index.html" }));

const START_PORT = 8000;
const MAX_PORT_ATTEMPTS = 20;

function isPortInUseError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === "EADDRINUSE";
}

function startServer(port: number, attemptsLeft: number): void {
  try {
    const server = Bun.serve({ port, fetch: app.fetch });
    console.log(`Serving ${process.cwd()} with SPA fallback on :${server.port}`);
  } catch (err) {
    if (isPortInUseError(err) && attemptsLeft > 0) {
      console.log(`Port ${port} is in use, trying :${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }
    throw err;
  }
}

startServer(START_PORT, MAX_PORT_ATTEMPTS);

import React, { useState } from "react";

// Starter page — replace with real content. Having a working useState here proves
// the transpile + hydrate pipeline is actually running React, not just serving
// static HTML.
export function Home() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
      <h1>It works — no build step</h1>
      <p>This page is plain .tsx, transpiled in the browser and served as static files.</p>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </main>
  );
}

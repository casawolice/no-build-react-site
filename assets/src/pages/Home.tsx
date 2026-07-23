import React, { useState } from "react";

// Starter page — replace with real content. This src/ tree is shared between
// this skill's two build modes (no-build and Vite, see AGENTS.md), so this
// file shouldn't assume which one is serving it. Having a working useState
// here proves React is actually running, not just serving static HTML.
export function Home() {
  const [count, setCount] = useState(0);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
      <h1>It works</h1>
      <p>This is the starter page — replace it with real content.</p>
      <button onClick={() => setCount((c) => c + 1)}>Clicked {count} times</button>
    </main>
  );
}
